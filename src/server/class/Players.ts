import PlayerModel from "../models/Player"
import config from "../../../config/global"
import {Types} from "mongoose"
import Character from "./Character"
import CharacterModel from "../models/Character"
import BankAccount from "../models/BankAccounts"
import SocietyMemberModel from "../models/SocietyMember"

export enum PermissionLevel {
	PLAYER,
	ANIMATOR,
	SUPPORT,
	STAFF,
	ADMIN
}

class Players {

	static all: Players[] = []
	static quitCallbacks = []

	id: Types.ObjectId
	netID : string
	sessionStart : number
	identifier: string
	identifiers: Object = {}
	currentCharacter : Character
	group:string
	premium: number

	constructor (source: string | number, modelId: Types.ObjectId, group: string, premium: number) {
		console.log("Creating new player with source: ", source)

		this.netID = source.toString()
		this.id = modelId
		this.group = group
		this.sessionStart = Date.now()
		this.premium = premium
		const identifiers = getPlayerIdentifiers(source)
		for (const element of identifiers) {
			const index = element.indexOf(":")
			const prefix = element.slice(0, index)
			this.identifiers[prefix] = element.slice(index+1)
			if (prefix === config.IDENTIFIER) {
				this.identifier = this.identifiers[prefix]
			}
		}

		Players.all.push(this)
	}

	static getBySource (source: string | number) : Players {
		const player = Players.all.find(player => player.netID === source.toString())
		if (!player) {
			throw new Error(`Impossible de trouver le joueur avec la source: ${source}`)
		} else {
			return player
		}
	}

	static emit (event: any, ...args: any[]) { emitNet(event, -1, ...args) }

	async canSelectPed() {
		const model = await PlayerModel.findById(this.id)
		return model.can_select_ped
	}

	async dropped () {

		const session_time = Date.now() - this.sessionStart
		const model = await PlayerModel.findById(this.id)
		console.log({session_time, current: model.gametime})
		model.gametime += session_time
		await model.save()

		for (let i=0; i<Players.quitCallbacks.length;i++) {
			Players.quitCallbacks[i](this)
		}

		Players.all.splice(Players.all.indexOf(this), 1)
		if (this.currentCharacter) {
			Character.all.splice(Character.all.indexOf(this.currentCharacter), 1)
		}
	}

	getPed() {
		return GetPlayerPed(this.netID)
	}

	emit (event: any, ...args: any[]) { emitNet(event, this.netID, ...args) }

	kick (reason  = "No reason") {
		DropPlayer(this.netID, reason)
	}

	ban (reason  = "No reason", time = 7 * 24 * 3600 * 1000, by = "Server") {
		DropPlayer(this.netID, reason)
	}

	async getCharacterInfos () {

		const model = await PlayerModel.findById(this.id)

		const characters : any[] = await CharacterModel.find({owner: model.id}).select("infos last_played").lean()

		for (let i=0; i<characters.length; i++) {
			const bank = await BankAccount.findOne({character: characters[i]._id}).select("amount")
			characters[i].bank = bank.amount
			characters[i].fullname = characters[i].infos.fullname
			characters[i].birthdate = characters[i].infos.birthdate
			delete characters[i].infos
		}

		return {
			max_slots: model.character_slots,
			can_selected_ped: model.can_select_ped,
			characters: JSON.parse(JSON.stringify(characters)),
			premium: model.premium
		}
	}

	async getSocietiesEnrolled() {
		return SocietyMemberModel.find({member: this.currentCharacter.id}).populate(
			{
				path: "society",
				populate: {
					path: "owner",
					select: "infos"
				}
			})
	}

	getPermissions() {
		return ["player", "animator", "support", "staff", "admin"].indexOf(this.group)
	}


	getPosition() {
		return GetEntityCoords(this.getPed())
	}

	static onQuit(callback) {
		this.quitCallbacks.push(callback)
	}

}

export default Players