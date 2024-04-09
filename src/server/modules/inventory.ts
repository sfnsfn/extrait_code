import { RegisterServerCallback } from "../callback"
import Players from "../class/Players"
import Container from "../class/Container"
import lodash from "lodash"
import { items as item_infos } from "../../../config/items"
import Utils from "../class/Utils"
import {MiddlewareFactory} from "../middlewares/middlewareFactory"
import TempContainer from "../models/TempContainer"
import {createDropValidator, inventoryUpdateValidator, updateEquipmentValidator} from "../validation/inventory"
import {counterValidator, idValidator, nameValidator} from "../validation/common"
import {Item, Vector3} from "../typings"
import {Log} from "../../shared/class/Log"
import { Mutex } from "../../shared/class/Mutex"


interface changesInfosI {
	originalContent: Item[],
	newContent: Item[]
}

const DroppedItemsMutex = new Mutex()
const SearchedPlayersMutex = new Mutex()

const droppedItems = []
let dropCount = 0
let searchedPlayers = []

onNet("INVENTORY:REMOVE_SEARCHED_PLAYER", (playerId) => {
	SearchedPlayersMutex.lock(async() => {
		console.log("removing player from searched players:", playerId)
		searchedPlayers = searchedPlayers.filter(player => player !== playerId)
	})

})

RegisterServerCallback("INVENTORY:UPDATE_CONTAINER", async (source: string|number, id: string, changeInfos: changesInfosI) => {

	Log.info(`Updating container ${id}`)

	const { originalContent, newContent } = changeInfos

	const container = Container.findById(id)
	if (!container) {
		return {
			success: false
		}
	}

	// Check if the container has not been updated during the transaction
	if (lodash.isEqual(originalContent, container.content) || container.model == TempContainer) {
		container.content = newContent
		await container.update()
		return {
			success: true
		}
	} else {
		Log.error("Containers not equal")
	}
}, [MiddlewareFactory.IsPlayerValid, MiddlewareFactory.areParametersValid(inventoryUpdateValidator)])

RegisterServerCallback("INVENTORY:STEAL_ITEM", async (source, player_id, {original, changed, item, inBag, slot}) => {
	const player = Players.getBySource(source)
	const playerEquipment = await player.currentCharacter.getEquipment()
	const {equipped, bag} = playerEquipment

	if (!item) {
		return {
			success: false,
			message: "Vous devez fournir un item."
		}
	}

	let bag_index:number
	if (inBag) {
		if (!bag) {
			return {
				success: false,
				message: "Vous n'avez pas de sac pour prendre l'objet."
			}
		}
		bag_index = bag.items.findIndex(i => !i)
		if (bag_index === -1) {
			return {
				success: false,
				message: "Aucun emplacement de libre dans votre sac."
			}
		}
		const bag_volume = item_infos[bag.name].volume
		const item_volume = item_infos[item.name].volume * (item.quantity || 1)
		const current_volume = bag.items.reduce(
			(prev, curr) => prev + (curr ? item_infos[curr.name].volume * (curr.quantity || 1) : 0),
			0
		)
		if (current_volume + item_volume > bag_volume) {
			return {
				success: false,
				message: "Vous n'avez pas assez de place dans votre sac."
			}
		}
		bag.items[bag_index] = item
	} else if (equipped) {
		return {
			success: false,
			message: "Vous avez déjà un objet dans les mains."
		}
	}

	const target_player = Players.getBySource(player_id)
	if (!target_player) {
		return {
			success: false,
			message: "Le joueur n'existe pas."
		}
	}

	const target = target_player.currentCharacter
	if (!target) {
		return {
			success: false,
			message: "Le joueur n'est pas en jeu."
		}
	}

	const targetEquipment = await target.getEquipment()

	if (!lodash.isEqual(original, targetEquipment)) {
		return {
			success: false,
			message: "L'objet n'est plus présent dans l'inventaire du joueur."
		}
	}

	target_player.emit("INVENTORY:STOLEN", {slot})
	await target.setEquipment(changed)

	// SITUATIONS DE DEV
	if (source != player_id) {
		await player.currentCharacter.setEquipment({
			...playerEquipment,
			[inBag ? "bag" : "equipped"]: inBag ? bag : item
		})
	} else {
		await player.currentCharacter.setEquipment({
			...changed,
			[inBag ? "bag" : "equipped"]: inBag ? bag : item
		})
	}

	return {
		success: true
	}

}, [MiddlewareFactory.IsPlayerValid])

on("playerDropped", async () => {
	const s = source
	console.log("playerDropped: removing player from searched player ", s)
	await SearchedPlayersMutex.lock(async() => {
		searchedPlayers = searchedPlayers.filter(player => player !== s)
	})
	const player = Players.getBySource(s)
	Container.removePlayer(player)
})

onNet("INVENTORY:REMOTE_CONTAINER_CLOSED", (id) => {
	const s = source
	const player = Players.getBySource(s)
	Container.removePlayer(player)
})

RegisterServerCallback("CHARACTER:GET_EQUIPMENT", async (source, target) => {

	// empeche de fouiller deux fois
	return await SearchedPlayersMutex.lock(async() => {
		if (target && searchedPlayers.includes(target)) {
			return {
				success: false
			}
		}

		const player = Players.getBySource(target ? target : source)
		const equipment = await player.currentCharacter.getEquipment()
		if (target) {
			searchedPlayers.push(target)
		}
		return JSON.parse(JSON.stringify({
			success: true,
			data: equipment
		}))

	})

}, [MiddlewareFactory.IsPlayerValid])

RegisterServerCallback("CHARACTER:UPDATE_EQUIPMENT", async (source, equipment) => {
	const player = Players.getBySource(source)
	await player.currentCharacter.setEquipment(equipment)
}, [MiddlewareFactory.IsPlayerValid, MiddlewareFactory.areParametersValid(updateEquipmentValidator)])

RegisterServerCallback("CHARACTER:DELETE_EQUIPPED", async(source) => {
	const issuer = Players.getBySource(source)
	const equipment = await issuer.currentCharacter.getEquipment()
	if(equipment) {
		delete equipment["equipped"]

		await issuer.currentCharacter.setEquipment(equipment)
	}

	return
}, [MiddlewareFactory.IsPlayerValid])

RegisterServerCallback("CHARACTER:UPDATE_AMMOS", async (source, ammos) => {
	const player = Players.getBySource(source)
	const equipment = await player.currentCharacter.getEquipment()
	equipment["equipped"].data.ammos = ammos
	await player.currentCharacter.setEquipment(equipment)
}, [MiddlewareFactory.IsPlayerValid, MiddlewareFactory.areParametersValid(counterValidator)])

RegisterServerCallback("INVENTORY:GET_DROPPED_ITEMS", () => {
	return JSON.parse(JSON.stringify({
		success: true,
		data: droppedItems
	}))
}, [MiddlewareFactory.IsPlayerValid])

const empty_items = ["plastic_bag", "shopping_bag"]
const shouldCreateDrop = (item) => {
	return (!empty_items.includes(item.name) || (item.items && item.items.find(i => !!i)))
}

RegisterServerCallback("INVENTORY:CREATE_DROP", async (source, equipment, item, pos: Vector3) => {
	const player = Players.getBySource(source)
	await player.currentCharacter.setEquipment(equipment)
	if (shouldCreateDrop(item)) {
		item.drop_id = dropCount++
		item.pos = pos
		await DroppedItemsMutex.lock(async() => {
			droppedItems.push(item)
		})
		emitNet("INVENTORY:ADD_DROP", -1, item)
	}
	return {
		success: true
	}
}, [MiddlewareFactory.IsPlayerValid, MiddlewareFactory.areParametersValid(createDropValidator)])

RegisterServerCallback("INVENTORY:PICK_UP_ITEM", async (source, drop_id) => {
	return await DroppedItemsMutex.lock(async() => {
		const itemIndex = droppedItems.findIndex(i => i.drop_id === drop_id)
		if (itemIndex < 0) {
			return {
				success: false,
				message: "L'item n'existe plus\\nCet incident sera report au staff."
			}
		} else {
			let item = droppedItems[itemIndex]
			const player = Players.getBySource(source)
			const equipment = await player.currentCharacter.getEquipment()
			const equipped = equipment.equipped
			if (!equipped || equipped.name === item.name) {
				if (droppedItems[itemIndex] != item) {
					return {
						success: false,
						message: "L'item n'existe plus\nCet incident sera report au staff."
					}
				}
				droppedItems.splice(itemIndex, 1)
				emitNet("INVENTORY:REMOVE_DROP", -1, drop_id)
				delete item.id
				delete item.drop_id
				delete item.pos
				item = equipped ? {...equipped, quantity: equipped.quantity + item.quantity} : item
				equipment["equipped"] = item
				await player.currentCharacter.setEquipment(equipment)
				return {
					success: true,
					data: item
				}
			} else {
				return {
					success: false,
					message: "Vous avez déja un objet en main."
				}
			}
		}
	})
}, [MiddlewareFactory.IsPlayerValid, MiddlewareFactory.areParametersValid(idValidator)])

RegisterServerCallback("INVENTORY:PICK_UP_FURNITURE", async (source, drop_id) => {
	return await DroppedItemsMutex.lock(async() => {
		const itemIndex = droppedItems.findIndex(i => i.drop_id === drop_id)
		if (itemIndex < 0) {
			return  {
				success: false,
				message: "L'item n'existe plus\nCet incident sera report au staff."
			}
		} else {
			const item = droppedItems[itemIndex]
			droppedItems.splice(itemIndex, 1)
			emitNet("INVENTORY:REMOVE_DROP", -1, drop_id)
			delete item.id
			delete item.drop_id
			delete item.pos
			return {
				success: true,
				data: item
			}
		}
	})

}, [MiddlewareFactory.IsPlayerValid, MiddlewareFactory.areParametersValid(idValidator)])

RegisterServerCallback("INVENTORY:REMOVE_ACCESSORY", async (source, accessory) => {
	const player = Players.getBySource(source)
	const equipment = await player.currentCharacter.getEquipment()
	if (equipment.pocket1 && equipment.pocket2) {
		return {
			success: false,
			message: "NO_SLOTS_AVAILABLE"
		}
	}
	if (equipment?.equipped?.data && equipment.equipped.data[accessory]) {
		delete equipment.equipped.data[accessory]
		const slot = equipment.pocket1 ? "pocket2" : "pocket1"
		equipment[slot] = {name: accessory}
		await player.currentCharacter.setEquipment(equipment)
		return {
			success: true,
			data: equipment.equipped
		}
	} else {
		return {
			success: false,
			message: "UNKNOWN"
		}
	}
}, [MiddlewareFactory.IsPlayerValid, MiddlewareFactory.areParametersValid(nameValidator)])

RegisterServerCallback("INVENTORY:GIVE_ITEM", async (source, item, target) => {
	const target_player_equipped = (await Players.getBySource(target).currentCharacter.getEquipment())["equipped"]
	if (target_player_equipped !== null) {
		return {
			success: false,
			message: "HANDS_NOT_EMPTY"
		}
	}

	emitNet("INVENTORY:ITEM_PROPOSAL", target, source, {quantity:item.quantity, name:item.name})
	return {
		success: true,
	}
})

onNet("INVENTORY:ACCEPT_ITEM", async (target_id, item) => {
	const s = source
	const origin = Players.getBySource(source)
	const target = Players.getBySource(target_id)
	if (origin && target) {
		const origin_equipment = await origin.currentCharacter.getEquipment()
		const equipped = origin_equipment["equipped"]
		if (item.quantity === null) {
			equipped.quantity = null
		}
		if (equipped && lodash.isEqual(equipped, item)) {
			origin.emit("INVENTORY:ITEM_ACCEPTED")
			const target_equipment = await target.currentCharacter.getEquipment()
			delete origin_equipment["equipped"]
			origin.currentCharacter.setEquipment({
				...origin_equipment,
			})
			setTimeout(() => {
				target.emit("INVENTORY:RECEIVE_ITEM", item)
				target.currentCharacter.setEquipment({
					...target_equipment,
					equipped: item
				})
			}, 2000)
		}
	}
})

onNet("INVENTORY:REFUSE_ITEM", id => {
	emitNet("INVENTORY:TRADE_DENIED", id)
})

onNet("INVENTORY:CANCEL_ITEM", id => {
	emitNet("INVENTORY:TRADE_CANCELED", id)
})

RegisterServerCallback("INVENTORY:ITEM_USED", async (s) => {
	const player = Players.getBySource(s)
	const equipment = await player.currentCharacter.getEquipment()
	let remove = false
	if (!equipment.equipped.quantity || equipment.equipped.quantity === 1 ) {
		remove = true
		delete equipment.equipped
	} else {
		equipment.equipped.quantity --
	}
	player.currentCharacter.setEquipment(equipment)
	return {
		success: remove
	}
}, [MiddlewareFactory.IsPlayerValid])

RegisterServerCallback("INVENTORY:ON_BIND", async (s, slot) => {
	const player = Players.getBySource(s)
	const equipment = await player.currentCharacter.getEquipment()
	const [equipped, current] = [equipment.equipped, equipment[slot]]
	if (equipped && Utils.getItemVolume(equipped) > 2) {
		return {
			success: false,
			message: "L'item est trop gros pour aller dans une poche"
		}
	} else {
		equipment[slot] = equipped
		equipment.equipped = current
		await player.currentCharacter.setEquipment(equipment)
		return {
			success: true,
			data: equipment.equipped
		}
	}
}, [MiddlewareFactory.IsPlayerValid, MiddlewareFactory.areParametersValid(nameValidator)])