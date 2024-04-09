import weapons from "./items.weapons"
import food from "./items.food"
import clothes from "./clothes/items.clothes"
import documents from "./items.documents"
import equipment from "./items.equipment"
import furnitures from "./items.furnitures"
import icebox from "./items.icebox"

export const items = {
	...weapons,
	...food,
	...clothes,
	...documents,
	...equipment,
	...furnitures,
	...icebox,
	goldbar: {
		label: "Lingot d'or",
		volume: 5,
		type: "other"
	},
	house_key: {
		label: "Clé de logement",
		type: "key",
		volume: 0.1,
		isUnique: true,
		description: "Une clé permettant de vérouiller ou dévérouiller un logement (maison/appartement)"
	},
	vehicle_key: {
		label: "Clé de véhicule",
		type: "key",
		volume: 0.1,
		isUnique: true,
		description: "Une clé permettant de vérouiller ou dévérouiller un véhicule"
	},
	plastic_bag: {
		label: "Sac plastique",
		type: "other",
		volume: 3,
		filter: [],
		isUnique: true,
		description: "Un sac jetable presque inutilisable"
	},
	shopping_bag: {
		label: "Sac de shopping",
		type: "other",
		volume: 3,
		filter: [],
		isUnique: true,
		description: "Un sac jetable presque inutilisable"
	},
	acetone: {
		label: "Acétone",
		type: "other",
		volume: 0.5,
		description: "Un sac jetable presque inutilisable"
	},
	absinthe: {
		label: "Absinthe",
		type: "other",
		volume: 0.5,
		description: "Un sac jetable presque inutilisable"
	},
	baggies: {
		label: "Sachet Pax",
		type: "other",
		volume: 0.01,
		description: "Un sac jetable presque inutilisable"
	},
	scissors: {
		label: "Ciseaux",
		type: "tools",
		volume: 0.25,
		isUnique: true,
		description: "Une paire de ciseaux permettant diverses actions"
	},
	razor_blade: {
		label: "Lame de rasoir",
		type: "tools",
		volume: .2,
		isUnique: true,
		description: "Une lame de rasoir assez pratique",
		usableOn: ["cigar"]
	},
	lighter: {
		label: "Briquet",
		type: "tools",
		volume: .2,
		isUnique: true,
		usableOn: ["cigar", "joint", "blunt", "cigarette"]
	},
	shoes_box: {
		label: "Boite à chaussures",
		type: "other",
		volume: 2,
		isUnique: true,
		filter: [],
		description: "Une boîte pour y mettre des chaussures"
	},
	boxing_gloves: {
		label: "Gants de boxe",
		type: "other",
		volume: 1,
		description: "Inflige moins de dégats au joueur."
	},
	jerrycan: {
		label: "Jerricane",
		type: "other",
		volume: 2,
		description: "Bidon contenant de l'essence"
	},
	razor: {
		label: "Lame de rasoir",
		type: "tools",
		volume: 0.1,
		description: "Lame affûtée beaucoup utilisée pour découper notamment du textile."
	},
	hooking_kit: {
		label: "Kit de crochetage",
		type: "tools",
		volume: 0.4,
		isUnique: true,
		description: "Kit d'outils permettant de crocheter une serrure.",
	},
	package01: {
		label: "Packet",
		type: "other",
		volume: 0.4,
		description: "Emballage carton qui permet de transporter des objets.",
	},
	dermographe: {
		label: "Dermographe",
		type: "tools",
		volume: 1.2,
		isUnique: true,
		description: "Machine permettant de tatouer la peau grâce à un système de piqûre et de remplissage."
	},
	carbonesheet: {
		label: "Feuille de Carbone",
		type:  "other",
		volume: 1,
		isUnique: true,
		description: "Feuille de carbone qui permet de décalquer le tatouage.",
		data: {
			tattoo_id: null
		}
	},
	tools_carbody: {
		label: "Boîte à outils pour carrouserie",
		type: "tools",
		volume: 1,
		isUnique: true,
		description: "Une boîte à outils qui permet au mécanicien de réparer la carroserie d'un véhicule."
	},
	engine: {
		label: "Moteur",
		type: "tools",
		volume: 1,
		isUnique: true,
		description: "Moteur thermique pour véhicules."
	},
	sponge: {
		label: "Eponge",
		type: "tools",
		volume: 0.2,
		isUnique: true,
		description: "Une éponge pour laver des surfaces"
	},
	tyre: {
		label: "Pneu",
		type: "tools",
		volume: 1,
		isUnique: true,
		description: "Pneu qui est équipé sur des véhicules motorisés."
	},
	rim: {
		label: "Jante",
		type: "tools",
		volume: 1,
		isUnique: true,
		description: "Jante utilisé sur véhicules pour l'aérodynamisme."
	},
	vehicule_door: {
		label: "Portière",
		type: "tools",
		volume: 1,
		isUnique: true,
		description: "Portière que l'on retrouve sur les véhicules."
	},
	vehicule_hood: {
		label: "Capot",
		type: "tools",
		volume: 1,
		isUnique: true,
		description: "Capot que l'on retrouve sur les véhicules."
	},
	metal_plate: {
		label: "Plaques en métal",
		type: "tools",
		volume: 1,
		isUnique: true,
		description: "Plaques en métal utilisées dans de nombreux domaines."
	},
	wheel: {
		label: "Roue",
		type: "tools",
		volume: 1,
		isUnique: true,
		description: "Roue pour véhicule motorisé."
	},
	plate: {
		label: "Plaque d'immatriculation",
		type: "tools",
		volume: 1,
		isUnique: false,
		description: "Une plaque d'immatriculation pour véhicule."
	},
	invoice: {
		label: "Facture",
		type: "other",
		volume: 0.1,
		isUnique: true,
		description: "Preuve d'une opération commerciale.",
		data: {
			invoice_id: null
		}
	},
	ethylotest: {
		label: "Ethylotest",
		type: "other",
		volume: 0.3,
		isUnique: true,
		description: "Permet de détecter le degré d'alcool d'un individu en soufflant.",
		data: {
			result_alcool: 0
		}
	},
	welding_tool: {
		label: "Fer à souder",
		type: "tools",
		volume: 0.3,
		isUnique: true,
		description: "Permet d'effectuer des soudures.",
	},
	werewolf_pack: {
		label: "Jeu de cartes loup-garou",
		type: "other",
		volume: 0.3,
		isUnique: true,
		description: "Vous pouvez jouer au loup-garou à partir de ce jeu de cartes.",
		data: {
			isEmpty: false,
		}
	},
	werewolf_card: {
		label: "Carte du jeu loup-garou",
		type: "other",
		volume: 0.1,
		isUnique: false,
		description: "",
		data: {
			werewolf_card_name: "witch"
		}
	},
	paint_spray: {
		label: "Spray de peinture",
		type: "tools",
		volume: 0.6,
		isUnique: false,
		description: "Spray qui permet de peindre un véhicule.",
	},
	head_band: {
		label: "Bandeau",
		type: "maskacc",
		volume: 0.1,
		isUnique: false,
		description: "A éviter si vous avez peur du noir."
	},
	healthband: {
		label: "Bandeau de soin",
		type: "other",
		volume: 0.3,
		isUnique: true,
		description: "Une boîte en cartons pour contenir des objets",
	},
	packet: {
		label: "Boite à cartons",
		type: "other",
		volume: 1,
		isUnique: true,
		description: "Une boîte en cartons pour contenir des objets",
		data: {
			size: 10
		}
	},
	shit: {
		label: "Excréments",
		type: "other",
		volume: 0.5,
		isUnique: false,
		description: "Des excréments de chien.",
	},
	uniform_box: {
		label: "Carton à habits",
		type: "other",
		volume: 1,
		isUnique: true,
		description: "Un carton qui contient des habits."
	},
	crowbar: {
		label: "Pied de biche",
		type: "tools",
		volume: 2,
		isUnique: true,
		description: "Utilitaire utilisé dans le cas ..."
	},
	backwood: {
		label: "Backwood",
		type: "other",
		volume: 0.2,
		isUnique: false,
		description: "Joint roulé avec le \"wrap\" de feuille de tabac, généralement à partir d'un cigare bon marché."
	},
	pouch_empty: {
		label: "Pochon vide",
		type: "other",
		volume: 0.1,
		isUnique: false,
		description: "Sac ou sachet vide dans lesquels on peut mettre des objets ou substances."
	},
	scale: {
		label: "Balance",
		type: "tools",
		volume: 2,
		isUnique: true,
		description: "Instrument qui sert à peser."
	},
	condom: {
		label: "Capote",
		type: "other",
		isUnique: false,
		volume: 0.1,
		description: "Utilisé comme mode de contraception et également comme protection contre les infections sexuellement transmissibles."
	},
	gps: {
		label: "GPS",
		type: "tools",
		isUnique: true,
		volume: 1.6,
		description: "Système de localisation."
	},
	hifi_channel: {
		label: "Chaine Hi-Fi",
		type: "tools",
		isUnique: true,
		volume: 1.5,
		description: "Élément indispensable pour tout mélomane, la chaîne hifi transportable trouve toujours sa place dans les rues de New York.."
	},
	hand_cuffs: {
		label: "Menottes",
		type: "tools",
		isUnique: true,
		volume: 0.3,
		description: "Bracelets métalliques réunis par une chaîne qui se fixent aux poignets d'un individu.."
	},
	terminal_card: {
		label: "Terminal de paiement",
		type: "tools",
		isUnique: true,
		consumeOnUse: false,
		volume: 0.3,
		description: "Permet d'effectuer tous vos paiements rapidement !",
		data: {
			code: "0000",
			terminal_transaction: ""
		}
	},
	fine_sheet: {
		label: "Feuille de contravention",
		type: "tools",
		isUnique: true,
		volume: 0.2,
		description: "Une contravention adressée à une personne qui a commis une infraction."
	},
	fine_book: {
		label: "Carnet de contravention",
		type: "tools",
		isUnique: true,
		volume: 0.8,
		description: "Carnet qui permet de rédiger des contraventions"
	},
	laser_tool: {
		label: "Laser",
		type: "tools",
		isUnique: true,
		volume: 0.8,
		description: "Laser qui permet de détatouer."
	},
	protection_glasses: {
		label: "Lunettes de protection",
		type: "maskacc",
		volume: 0.1,
		isUnique: false,
		description: "Permet de vous protéger si vous utilisez des outils dangereux."
	},

}

export const categoryLabels = {
	document: "Document",
	key: "Clés",
	food: "Nourriture",
	drink: "Boisson",
	bag: "Sac",
	chain: "Chaine/cou",
	wallet: "Portefeuille",
	kevlar: "Gilet ballistique",
	keyring: "Porte clés",
	utils: "Utilitaire",
	shoes: "Chaussures",
	other: "Autre",
	top: "Haut",
	legs: "Bas",
	magazine: "Chargeur",
	accessory: "Accessoire d'arme",
	tools: "Outils",
	handgun: "Arme de poing",
	rifle: "Fusil d'assaut",
	shotgun: "Fusil à pompe",
	furnitures: "Mobilier",
	maskacc: "Accessoire masque"
}

export const genderLabels = {
	male: "Homme",
	female: "Femme"
}

export default items