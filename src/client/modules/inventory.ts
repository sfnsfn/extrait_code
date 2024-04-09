import Controls from "../../class/Controls"
import player from "../../class/Player"
import ScreenFX from "../../class/ScreenFX"
import Utils from "../../class/Utils"
import Webview from "../../class/Webview"
import ContextMenu from "../../class/ContextMenu"
import Vehicle, {DoorId} from "../../class/Vehicle"

import ANIMATIONS from "../../animations"
import itemsInteractions from "../../items_interactions"
import {ServerCallback} from "../lib/callback"
import {items} from "../../../../config/items"

import "./inventory.drop"
import {Log} from "../../../shared/class/Log"
import _ from "lodash"

interface RemoteInfos {
	equipment: Equipment
	content?: EquipmentContent
	name?: string
	remoteEquipment?: Equipment
	max_volume?: number
}

const ignoredSlots = ["pocket1", "pocket2", "keyring", "socket1", "socket2", "small1", "small2"]

let searchedPlayer = null
let searchedVehicle = null
let openedContainer = null

const removeItem = (container: {key:number | string}) => {
	for (const [key, value] of Object.entries(container)) {
		if (value && value.USE) {
			if (value.quantity && value.quantity > 1) {
				delete value.USE
				value.quantity--
			} else {
				delete container[key]
			}
			return container
		} else if (value && value.items) {
			container[key].items = removeItem(value.items)
		}
	}
	return container
}

const excludeInteractions = ["PREVIEW_TATTOO", "SOCIETY:WATCH_INVOICE", "OPEN_WEREWOLF_PACK", "PREVIEW_WEREWOLF_CARD", "PREVIEW_INVOICE", "PREVIEW_FINE", "PREVIEW_PRESCRIPTION", "TEAR_DOCUMENT", "OPEN_TERMINAL"]
const onItemInteraction = async ({name, args}) => {
	closeInventory()
	player.isBusy = true
	await itemsInteractions[name](args)
	if(!excludeInteractions.includes(name)) {
		player.isBusy = false
		openInventory()
	}
}

const onItemUse = async ({equipment, item}) => {
	player.isBusy = true
	closeInventory()
	Log.info(`Checking for used items : ${item}`)
	const [succes, changedItemOrError] = await player.useItem(item)

	if (succes) {
		if (items[item.name].consumeOnUse) {
			equipment = removeItem(equipment)
		}
		if (changedItemOrError) {
			equipment["equipped"] = changedItemOrError
		}
		await ServerCallback("CHARACTER:UPDATE_EQUIPMENT", equipment)
	} else {
		ScreenFX.notify(changedItemOrError ? "~r~Action impossible~s~\n" + changedItemOrError : "~r~Une erreur est survenue..~s~")
	}
	player.isBusy = false
}

const equipmentInteraction  = async (which, item: Item) => {
	if (which === "equipped") {
		await player.equipItem(item)
	} else {
		await player.equipClothes(which, item)
	}
}

const closeInventory = () => {
	Webview.go("/")
	onInventoryClosed()
}

const onInventoryChange  = async ({equipment, which, equipmentOrigin}) => {

	const shouldClose = equipmentOrigin && !(ignoredSlots.includes(which) && ignoredSlots.includes(equipmentOrigin))

	if (shouldClose) {
		player.isBusy = true
		closeInventory()
	}

	await ServerCallback("CHARACTER:UPDATE_EQUIPMENT", equipment)

	const [interaction1, interaction2] = equipmentOrigin === "equipped" ? [which, equipmentOrigin] : [equipmentOrigin, which]

	if (interaction1 === "equipped" || interaction2 === "equipped") {
		await equipmentInteraction("equipped", null)
	}

	if (interaction1 && !ignoredSlots.includes(interaction1)) {
		await equipmentInteraction(interaction1, equipment[interaction1])
	}

	if (interaction2 && !ignoredSlots.includes(interaction2)) {
		await equipmentInteraction(interaction2, equipment[interaction2])
	}

	if (shouldClose) {
		player.isBusy = false
	}

}

const onInventoryBind  = async (_slot) => {

	player.isBusy = true
	ServerCallback("INVENTORY:ON_BIND", "pocket"+_slot)
		.then(async ({success, data: item}) => {
			if (!success) {
				ScreenFX.error("L'item est trop volumineux pour aller dans une poche")
			} else {
				await equipmentInteraction("equipped", null)
				if (item)
					await equipmentInteraction("equipped", item)
			}
		})
	player.isBusy = false
}

export const openInventory = async (remoteType=null, remoteInfos?:RemoteInfos) => {
	player.isBusy = true
	if (remoteType) {
		if (remoteType === "player") {
			Webview.go("inventory", {
				remoteType: "player",
				equipment: remoteInfos.equipment,
				remoteEquipment: remoteInfos.remoteEquipment,
				ped_model: player.ped.model
			})
			ScreenFX.drawFrontendPed(GetPlayerPed(searchedPlayer), "right", "center")
		} else if(remoteType === "icebox" || remoteType === "shopprovision") {
			Webview.go("inventory", {
				remoteType: remoteType,
				equipment: remoteInfos.equipment,
				name: remoteInfos.name,
				content: remoteInfos.content,
				max_volume: remoteInfos.max_volume,
				ped_model: player.ped.model
			})
			ScreenFX.drawFrontendPed(GetPlayerPed(searchedPlayer), "right", "center")

		} else {
			Webview.go("inventory", {
				remoteType: "remote",
				equipment: remoteInfos.equipment,
				name: remoteInfos.name,
				content: remoteInfos.content,
				max_volume: remoteInfos.max_volume,
				ped_model: player.ped.model
			})
		}
	} else {
		const {success, data} = await ServerCallback("CHARACTER:GET_EQUIPMENT")
		if(!success) {
			player.notify("error", "Une erreur est survenue lors de l'ouverture de l'inventaire.", 2000)
			Webview.unfocus()
			return
		}
		Webview.go("inventory", {equipment: data, ped_model: player.ped.model})
		ScreenFX.drawFrontendPed(player.ped.entity, "left", "center")
	}
	Webview.focus(true)
	ScreenFX.blurIn(200)
}

export const onInventoryClosed = () => {
	ScreenFX.clearFrontendPed()
	Webview.unfocus()
	ScreenFX.blurOut(200)
	if (searchedPlayer != null) {
		emitNet("INVENTORY:REMOVE_SEARCHED_PLAYER", GetPlayerServerId(searchedPlayer))
		searchedPlayer = null
		player.ped.clearTasks()
	}
	if (openedContainer) {
		player.ped.clearTasks()
		if (searchedVehicle) {
			searchedVehicle.closeDoor("trunk")
			searchedVehicle = null
		}
		emitNet("INVENTORY:REMOTE_CONTAINER_CLOSED", openedContainer)
		openedContainer = null
	}

	player.isBusy = false
}

onNet("INVENTORY:STOLEN", ({slot}) => {
	if (slot === "equipped") {
		player.equipItem()
	} else if (!["keyring", "small1", "small2", "pocket1", "pocket2", "socket1", "socket2"].includes(slot)) {
		player.equipClothes(slot, null)
	}
})

Webview.on("INVENTORY:STEAL_ITEM", async ({original, changed, item, inBag, slot}) => {

	const {success, message} = await ServerCallback("INVENTORY:STEAL_ITEM", GetPlayerServerId(searchedPlayer), {original, changed, item, inBag, slot})

	if (success) {
		player.ped.clearTasks()
		player.isBusy = true
		closeInventory()
		player.isBusy = false
		if (!inBag) {
			player.equipItem(item)
		}
		return true
	} else {
		player.notify("error", message as string ?? "Une erreur est survenue.", 2000)
	}
	player.ped.clearTasks()
})

const onTakeItemFromRemote = async ({slot, item, inBag}) => {
	const errorMessage = await ServerCallback("INVENTORY:TAKE_ITEM_FROM_REMOTE", {
		slot,
		item,
		origin: searchedPlayer ? GetPlayerServerId(searchedPlayer) : openedContainer,
		inBag
	})
	if (!errorMessage) {
		player.ped.clearTasks()
		await player.ped.playAnimation(ANIMATIONS.STEAL_PLAYER) // play taking item animation instead
		player.equipItem(item)
	} else {
		ScreenFX.notify("~r~Erreur~s~\n" + errorMessage)
	}
	player.isBusy = false
	player.ped.clearTasks()
	searchedPlayer = null
}



ContextMenu.addEntry("player", "SEARCH_PLAYER", "Fouiller le joueur",
	() => {
		return !player.isBusy
	},
	async ({entity}) => {
		searchedPlayer = Utils.getPlayerFromPed(entity)
		const {data} = await ServerCallback("CHARACTER:GET_EQUIPMENT", GetPlayerServerId(searchedPlayer))
		const {data: data2} = await ServerCallback("CHARACTER:GET_EQUIPMENT")
		if (data) {
			player.ped.playAnimation(ANIMATIONS.SEARCH_PLAYER)
			openInventory("player", {remoteEquipment: data, equipment: data2})
		} else {
			ScreenFX.notify("~r~Erreur~s~\nLe joueur est déja entrain d'être fouillé ou n'est plus connecté")
		}
	}
)

ContextMenu.addEntry("vehicle", "OPEN_VEHICLE_TRUNK", "Ouvrir le coffre",
	async ({entity}) => {
		const vehicle = new Vehicle(entity)
		return !player.isBusy && !vehicle.isLocked && player.ped.hasEntityInSight(vehicle) && player.ped.getDistanceFromEntity(vehicle) < 3.0
	},
	async ({entity}) => {

		const vehicle = new Vehicle(entity)
		const isRegistered = await vehicle.isRegistered()

		if (isRegistered) {
			const remoteInfos = await ServerCallback("INVENTORY:GET_TRUNK_CONTENT", {plate: vehicle.plate})

			if (remoteInfos) {
				if(remoteInfos.success) {
					player.ped.playAnimation(ANIMATIONS.SEARCH_PLAYER)
					openedContainer = remoteInfos.data.id
					openInventory("remote", remoteInfos.data)
					searchedVehicle = vehicle
					vehicle.openDoor("trunk")
				} else {
					player.notify("error", remoteInfos.message as string, 2000)
				}

			} else {
				ScreenFX.notify("~r~Erreur~s~\nCe véhicule ne possède pas de coffre")
			}
		} else {
			ScreenFX.notify("~r~Action impossible~s~\nLe coffre de ce véhicule est inutilisable")
		}
	}
)

on("INVENTORY:OPEN_REMOTE", remoteInfos => {
	openedContainer = remoteInfos.id
	openInventory("remote", remoteInfos)
})

Webview.on("INVENTORY:TAKE_ITEM_FROM_REMOTE", onTakeItemFromRemote)

Webview.on("INVENTORY:GET_EQUIPMENT", async () => {
	const {data} = await ServerCallback("CHARACTER:GET_EQUIPMENT")
	return data
})

Webview.on("INVENTORY:UPDATE_CONTAINER", async (changeInfos) => {
	const {success} = await ServerCallback("INVENTORY:UPDATE_CONTAINER", openedContainer, changeInfos)
	return {success}
})

onNet("INVENTORY:UPDATE_CONTAINER", ({content}) => {
	Webview.send({
		action: "INVENTORY:UPDATE_CONTAINER",
		content
	})
})

onNet("INVENTORY:EQUIP_ITEM", (item) => {
	player.equipItem(item)
})

Webview.on("INVENTORY:CHANGED", onInventoryChange)
Webview.on("INVENTORY:USE_ITEM", onItemUse)
Webview.on("INVENTORY:ITEM_INTERACTION", onItemInteraction)

Webview.on("INVENTORY:CLOSED", onInventoryClosed)
on("INVENTORY:CLOSE", closeInventory)

Controls.addDisabled("TAB")

setTick(async () => {
	if (!player.isPlaying || player.isBusy || player.isHandCuffed || ScreenFX.inInput) {
		await Utils.Delay(50)
	} else {
		if (Controls.justPressed("TAB")) {
			await openInventory()
			await Utils.Delay(200)
		} else if (Controls.justPressed("1")) {
			onInventoryBind("1")
			await Utils.Delay(200)
		} else if (Controls.justPressed("2")) {
			onInventoryBind("2")
			await Utils.Delay(200)
		}
	}
})

let incoming_trade: Trade = {
	user_id: -1,
	item: {
		name: ""
	}
}
let outcoming_trade: Trade = {
	user_id: -1,
	item: {
		name: ""
	}
}
let request_notif: number

// GIVE D'ITEM
ContextMenu.addEntry("player", "INVENTORY:GIVE_ITEM", "Donner l'objet en main",
	({distance}) => {
		return distance < 3 && !player.isBusy && player.equippedItem
	},
	async ({playerID}) => {
		if(outcoming_trade.user_id !== -1 || incoming_trade.user_id !== -1) {
			ScreenFX.error("Vous avez déjà un échange en attente")
			return
		}
		const itemToTrade = player.equippedItem
		const playerServerId = GetPlayerServerId(playerID)
		const response = await ServerCallback("INVENTORY:GIVE_ITEM", itemToTrade, playerServerId)
		if (response.success) {
			RemoveNotification(request_notif)
			request_notif = ScreenFX.notify(`En attente d'une réponse.. \n~r~RETOUR~s~ pour annuler`, false, 10000)
			outcoming_trade.user_id = playerServerId
			outcoming_trade.item = itemToTrade
		} else {
			if (response.message === "HANDS_NOT_EMPTY") {
				ScreenFX.error("La personne ciblée n'a pas les mains vides")
			} else {
				ScreenFX.error("Vous ne pouvez pas lancer un échange actuellement")
			}
		}
	})

// DEV-ONLY
ContextMenu.addEntry("self", "INVENTORY:GIVE_ITEM", "Donner l'objet en main",
({distance}) => {
	return distance < 3 && !player.isBusy && player.equippedItem
},
async ({playerID}) => {
	if(outcoming_trade.user_id !== -1 || incoming_trade.user_id !== -1) {
		ScreenFX.error("Vous avez déjà un échange en attente")
		return
	}
	const itemToTrade = player.equippedItem
	const playerServerId = GetPlayerServerId(playerID)
	const response = await ServerCallback("INVENTORY:GIVE_ITEM", itemToTrade, playerServerId)
	if (response.success) {
		RemoveNotification(request_notif)
		request_notif = ScreenFX.notify(`En attente d'une réponse.. \n~r~RETOUR~s~ pour annuler`, false, 10000)
		outcoming_trade.user_id = playerServerId
		outcoming_trade.item = itemToTrade
	} else {
		if (response.message === "HANDS_NOT_EMPTY") {
			ScreenFX.error("La personne ciblée n'a pas les mains vides")
		} else {
			ScreenFX.error("Vous ne pouvez pas lancer un échange actuellement")
		}
	}
})

onNet("INVENTORY:ITEM_ACCEPTED", async () => {
	outcoming_trade.user_id = -1;
	RemoveNotification(request_notif)
	request_notif = ScreenFX.notify("~g~Proposition acceptée~s~")
	await player.equipItem(null, true)
	await player.ped.playAnimation(ANIMATIONS.GIVE_RECEIVE_ITEM)
})

onNet("INVENTORY:RECEIVE_ITEM", async (item) => {
	player.isBusy = true
	await player.ped.playAnimation(ANIMATIONS.GIVE_RECEIVE_ITEM)
	player.equipItem(item)
	player.isBusy = false
})

let trade_notif: number

onNet("INVENTORY:ITEM_PROPOSAL", async (id:number, item:{quantity?: number, name:string}) => {
	if (incoming_trade.user_id !== -1) {
		emit("INVENTORY:CANCEL_ITEM", id)
		return
	}
	trade_notif = ScreenFX.notify(`On vous donne:\n~b~${item.quantity || 1} ${items[item.name].label}~s~\n~g~ENTRER~s~ pour accepter\n~r~RETOUR~s~ pour refuser`, false, 10000)
	incoming_trade.user_id = id
	incoming_trade.item = item
	setTimeout(() => {
		incoming_trade.user_id = -1
	}, 10000)
})

onNet("INVENTORY:TRADE_CANCELED", () => {
	incoming_trade.user_id = -1
	RemoveNotification(trade_notif)
	trade_notif = ScreenFX.notify("Proposition annulée")
})

onNet("INVENTORY:TRADE_DENIED", () => {
	outcoming_trade.user_id = -1
	RemoveNotification(request_notif)
	request_notif = ScreenFX.notify("~r~Proposition refusée~s~")
})

Controls.onPressed("ENTER", () => {
	if (incoming_trade.user_id !== -1) {
		if (player.isBusy) { ScreenFX.error("Vous êtes occupé") }
		else {
			emitNet("INVENTORY:ACCEPT_ITEM", incoming_trade.user_id, incoming_trade.item)
			incoming_trade.user_id = -1
			RemoveNotification(trade_notif)
		}
	}
})

Controls.onPressed("BACKSPACE", () => {
	if (incoming_trade.user_id !== -1) {
		emitNet("INVENTORY:REFUSE_ITEM", incoming_trade.user_id)
		incoming_trade.user_id = -1
		RemoveNotification(trade_notif)
	} else if (outcoming_trade.user_id !== -1) {
		emitNet("INVENTORY:CANCEL_ITEM", outcoming_trade.user_id)
		RemoveNotification(request_notif)
		request_notif = ScreenFX.notify(`Vous avez annulé l'échange`)
		outcoming_trade.user_id = -1
	}
})


Webview.on("CONVENIENCE:ADD_NEW_ITEM", async ({shop_name, tray_name}) => {
	const remoteInfos = await ServerCallback("INVENTORY:GET_CONVENIENCE_ITEM_PROVISION", shop_name, tray_name)

	if (remoteInfos) {
		if(remoteInfos.success) {
			openedContainer = remoteInfos.data.id
			openInventory("shopprovision", remoteInfos.data)
		} else {
			player.notify("error", remoteInfos.message as string, 2000)
		}

	} else {
		player.notify("error", "Une erreur est survenue.", 2000)
	}
})


Webview.on("ICEBOX:OPEN_TRADING_WINDOW", async () => {
	const remoteInfos = await ServerCallback("INVENTORY:GET_ICEBOX_RESELL_CONTAINER")

	if (remoteInfos) {
		if(remoteInfos.success) {
			openedContainer = remoteInfos.data.id
			openInventory("icebox", remoteInfos.data)
		} else {
			player.notify("error", remoteInfos.message as string, 2000)
		}

	} else {
		player.notify("error", "Une erreur est survenue.", 2000)
	}
})