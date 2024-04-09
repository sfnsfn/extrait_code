import { model, Schema, Types} from "mongoose"
import {Position} from "../typings";

interface Skin {
	model: string

	// freemode related
	eye_color?: number
	pilosity?: object
	heritage?: object
	face?: object
	tattoo?: object
	overlays?: object
}

interface Stats {
	health: number
	hunger: number
	thirst: number
	addiction?: number
	addiction_coeff?: number
}

interface Infos {
	gender: "male" | "female"
	fullname: string
	birthdate: Date
	birth_city: string
	birth_country: string

	description: string
}

interface CharacterModel {
	owner: Types.ObjectId
	gametime: number
	last_played: Date
	banned_until: Date
	created_at: Date
	position: Position
	instance: string
	stats: Stats
	infos: Infos
	skin: Skin
	equipment: Equipment
	job: string
	animations_favorites: string[]
	animations_binds: object
	shoe_size: number
	furnitures: number[]
}

const CharacterSchema = new Schema<CharacterModel>({
	owner: {type: Schema.Types.ObjectId, ref:"Player"},
	gametime: Number,
	created_at: {
		type: Date,
		default: new Date()
	},
	last_played:  {
		type: Date,
		default: new Date()
	},
	banned_until: Date,
	skin: {
		model: String,
		eye_color: Number,
		pilosity: Object,
		heritage: Object,
		face: Object,
		tattoo: Object,
		overlays: Object,
		drawables: Object
	},
	position: {
		x: Number,
		y: Number,
		z: Number
	},
	instance: {
		type: String,
		default: "DEFAULT"
	},
	stats: {
		health: Number,
		hunger: Number,
		thirst: Number,
		addiction: Number,
		addiction_coeff: Number
	},
	infos: {
		gender: String,
		fullname: String,
		birthdate: Date,
		birth_city: String,
		birth_country: String,
		description: String
	},
	equipment: Object,
	job: {
		type: String,
		default: "citizen"
	},
	animations_favorites: {
		type: [String],
		default: []
	},
	animations_binds: {
		type: Object,
		default: {}
	},
	shoe_size: Number
})

const CharacterModel = model<CharacterModel>("Character", CharacterSchema)

export default CharacterModel