import Controls from "./Controls"
import Utils from "./Utils"
import player from "./Player"
import { Log } from "../../shared/class/Log";

interface ThreeDText {
  content: string;
  colors?: {
    r?: number;
    g?: number;
    b?: number;
    a?: number;
  };
  font?: number;
  position?: Vector3;
  entity?: number;
  z?: number;
  scale?: number;
  drawDistance?: number;
  outline?: boolean;
  shouldDraw?: boolean;
  distance?: number;
  time?: number;
}

const DEFAULT_3DTEXT = {
	font: 0,
	scale: 1.0,
	drawDistance: 15,
	outline: false,
	colors: {r:255, g:255, b: 255, a:255},
}

class ScreenFX {
	static missionText:string
	static missionTextTimeout: NodeJS.Timeout

	static scaleforms = []

	static HUD_COMPONENTS = {
		1: "WANTED_STARS",
		2: "WEAPON_ICON",
		3: "CASH",
		4: "MP_CASH",
		5: "MP_MESSAGE",
		6: "VEHICLE_NAME",
		7: "AREA_NAME",
		8: "VEHICLE_CLASS",
		9: "STREET_NAME",
		10: "HELP_TEXT",
		11: "FLOATING_HELP_TEXT_1",
		12: "FLOATING_HELP_TEXT_2",
		13: "CASH_CHANGE",
		14: "RETICLE",
		15: "SUBTITLE_TEXT",
		16: "RADIO_STATIONS",
		17: "SAVING_GAME",
		18: "GAME_STREAM",
		19: "WEAPON_WHEEL",
		20: "WEAPON_WHEEL_STATS",
		21: "HUD_COMPONENTS",
		22: "HUD_WEAPONS"
	}
	static hiddenHudComponents = [14]
	static hideHud = false

	static cinematicBars = false

	static blackScreen = false

	static frontendPed : number
	static moveFrontendPed  = false
	static defaultHudColor = GetHudColour(117)

	static hudComponentsIDs = Object.keys(ScreenFX.HUD_COMPONENTS)

	static screenTick = setTick(() => {
		if (ScreenFX.scaleforms.length > 0) {
			ScreenFX.scaleforms.forEach(scaleform => {
				// @ts-ignore
				DrawScaleformMovieFullscreen(scaleform.id)
			})
		} // , red, green, blue, alpha, unk)

		if (ScreenFX.missionText) { ScreenFX.drawMissionText(ScreenFX.missionText, 1) }

		if (ScreenFX.cinematicBars) {
			ScreenFX.drawRect({
				x: 0.5,
				y: 0.075,
				width: 1.0,
				height: 0.15
			})
			ScreenFX.drawRect({
				x: 0.5,
				y: 0.925,
				width: 1.0,
				height: 0.15
			})
		}

		if(ScreenFX.blackScreen) {
			ScreenFX.drawBlackScreen()
		}

		if (!ScreenFX.hideHud) {
			for (let i=0; i< ScreenFX.hiddenHudComponents.length; i++) {
				HideHudComponentThisFrame(+ScreenFX.hiddenHudComponents[i])
			}
		} else {
			for (let i=0; i< ScreenFX.hudComponentsIDs.length; i++) {
				HideHudComponentThisFrame(+ScreenFX.hudComponentsIDs[i])
			}
		}

		if (ScreenFX.moveFrontendPed) {
			const [x,y,z] = GetEntityCoords(PlayerPedId(), true)
			SetEntityCoords(ScreenFX.frontendPed, x,y,z-20, true, true, false, false)
		}
	})

	static _3DTexts : ThreeDText[] = []

	static checkTick = setTick(async() => {
		if (player.isPlaying && player.ped) {
			const check_pos = Utils.toVector(GetGameplayCamCoord()) // player.ped.pos
			for (let i=0; i<ScreenFX._3DTexts.length; i++) {
				const text = ScreenFX._3DTexts[i]
				if (text.entity && !HasEntityClearLosToEntity(player.ped.entity, text.entity, 17)) {
					text.shouldDraw = false
				} else {
					const pos = text.position ? text.position : Utils.toVector(GetEntityCoords(text.entity, false))
					text.distance = Utils.distVector(check_pos, pos)
					if (text.shouldDraw) {
						if (text.distance > text.drawDistance) {
							text.shouldDraw = false
							Log.info(`Removing from drawing: ${text.content}`)
						}
					} else {
						if (text.distance < text.drawDistance) {
							text.shouldDraw = true
							Log.info(`Removing from drawing: ${text.content}`)
						}
					}
				}
			}
		}
		await Utils.Delay(50)
	})

	static textTick = setTick(() => {
		for (let i=0; i<ScreenFX._3DTexts.length; i++) {
			const text = ScreenFX._3DTexts[i]
			if (text.shouldDraw) {
				ScreenFX.draw3DText(text)
			}
		}
	})

	static add3DText(_options: ThreeDText) {
		const options = Object.assign({}, DEFAULT_3DTEXT, _options)
		if (_options.entity) {
			options.z = _options.z || 1
		}
		ScreenFX._3DTexts.push(options)
		if (options.time) {
			setTimeout(() => {
				ScreenFX._3DTexts = ScreenFX._3DTexts.filter(t => t != options)
			}, options.time)
		}
		return () => {
			ScreenFX._3DTexts = ScreenFX._3DTexts.filter(t => t != options)
		}
	}

	static draw3DText (text: ThreeDText) {

		const scale = (1 / text.distance) * 1.5
  
		SetTextColour(text.colors.r, text.colors.g, text.colors.b, text.colors.a)
		SetTextScale(0.0, scale * text.scale)
		SetTextFont(text.font)
		SetTextDropshadow(0, 0, 0, 0, 255)
		if (text.outline) { SetTextOutline() }
		SetTextCentre(true)
  
		BeginTextCommandDisplayText("STRING")
		AddTextComponentSubstringPlayerName(text.content)
		const pos = text.position ? text.position : Utils.toVector(GetEntityCoords(text.entity, false))
		SetDrawOrigin(pos.x, pos.y, text.entity ? pos.z+text.z : pos.z, 0)
		EndTextCommandDisplayText(0.0, 0.0)
		ClearDrawOrigin()
	}

	// HUD

	static hideRadar (hide: boolean) {
		DisplayRadar(!hide)
	}

	static hideHudComponent (id: string | number, hide: boolean) {
		if (typeof (id) === "string") { id = ScreenFX.hudComponentsIDs.find(el => ScreenFX.HUD_COMPONENTS[el] === id) } // A test..

		id = +id

		if (hide) {
			if (!this.hiddenHudComponents.includes(id)) {
				this.hiddenHudComponents.push(id)
			} else {
				Log.info(`Tried to hide already hidden hud component: ${id}`);
			}
		} else {
			if (!this.hiddenHudComponents.includes(id)) {
				this.hiddenHudComponents.splice(this.hiddenHudComponents.indexOf(id), 1)
			} else {
				Log.info(`Tried to show an already showned hud component: ${id}`)
			}
		}
	}

	// texts
	static drawMissionText (text: string, showtime: number) {
		ClearPrints()
		SetTextEntry_2("STRING") // AddTextComponentSubstringPlayerName
		AddTextComponentString(text) // AddTextComponentSubstringPlayerName
		EndTextCommandPrint(showtime, true) // DrawSubtitleTimed
	}

	static getMissionText () { return ScreenFX.missionText }

	static drawBlackScreen() {
		ScreenFX.drawRect({
			x: 0.5,
			y: 0.5,
			width: 1.0,
			height: 1.0
		})
	}
	static setMissionText (text: string, time?:number) {
		if (!text) { return }

		ScreenFX.missionText = text

		if (ScreenFX.missionTextTimeout) {
			clearTimeout(ScreenFX.missionTextTimeout)
			ScreenFX.missionTextTimeout = time ? setTimeout(() => { ScreenFX.missionText = null }, time) : null
		}
	}

	static clearMissionText () {
		ScreenFX.missionText = null
		if (ScreenFX.missionTextTimeout) {
			clearTimeout(ScreenFX.missionTextTimeout)
			ScreenFX.missionTextTimeout = null
		}
	}

	static inInput = false
  
	static async getInput (title = "", size = 10, placeholder = "") {
		ScreenFX.inInput = true
		return new Promise<null | string>(async resolve => {
			AddTextEntry("FMMC_KEY_TIP8", title)
			DisplayOnscreenKeyboard(1, "FMMC_KEY_TIP8", "", placeholder, "", "", "", size)
			Controls.disableAll(true)
			let status = UpdateOnscreenKeyboard()
			while (status === 0) {
				await Utils.Delay(0)
				status = UpdateOnscreenKeyboard()
			}
			ScreenFX.inInput = false
			Controls.disableAll(false)
			if (status === 2) {
				resolve(null)
			} else {
				resolve (GetOnscreenKeyboardResult())
			}
		})
	}

	// fade
	static get fadedIn () { return IsScreenFadedIn() }
	static get fadedOut () { return IsScreenFadedOut() }

	static fadeIn (time = 0) {
		DoScreenFadeIn(time)
	}

	static fadeOut (time = 0) {
		DoScreenFadeOut(time)
	}

	// drawing forms
	static drawRect (options: RectOptions = {}) {
		DrawRect(options.x, options.y, options.width, options.height, options.r = 0, options.g = 0, options.b = 0, options.alpha = 255)
	}

	static setCinematicBars (state = false) {
		ScreenFX.cinematicBars = state
	}

	static setBlackScreen (state = false) {
		ScreenFX.blackScreen = state
	}

	// fx

	static blurIn (time = 0) {
		TriggerScreenblurFadeIn(time)
	}
  
	static blurOut (time = 0) {
		TriggerScreenblurFadeOut(time)
	}

	static isEffectRunning (effectName: string) {
		return AnimpostfxIsRunning(effectName)
	}

	static playEffect (effectName: string, duration = 0, looped = true) {
		AnimpostfxPlay(effectName, duration, looped)
	}

	static stopEffect (effectName: string) {
		if (ScreenFX.isEffectRunning(effectName)) {
			AnimpostfxStop(effectName)
		} else {
			console.error("Trying to stop not running effect: " + effectName)
		}
	}

	static stopEffects () {
		AnimpostfxStopAll()
	}

	// Scaleforms

	static renderScaleform (scaleform, render) {
		if (render) {
			if (ScreenFX.scaleforms.includes(scaleform)) {
				Log.info("Scaleform already rendering");
			} else {
				ScreenFX.scaleforms.push(scaleform)
			}
		} else {
			if (!ScreenFX.scaleforms.includes(scaleform)) {
				Log.info("Scaleform not rendering")
			} else {
				ScreenFX.scaleforms.splice(ScreenFX.scaleforms.indexOf(scaleform), 1)
			}
		}
	}

	static clearHelpMessage() { ClearAllHelpMessages() }

	static showHelpMessage(message:string, loop=false, beep=true, duration=-1) {
		if (!player.isPlaying) { return }
		ScreenFX.clearHelpMessage()
		AddTextEntry("HelpMsg", message)
		BeginTextCommandDisplayHelp("HelpMsg")
		EndTextCommandDisplayHelp(0, loop, beep, duration)
	}

	static notify(message:string, flash=false, time=5000) {
		BeginTextCommandThefeedPost("STRING")
		AddTextComponentSubstringPlayerName(message)
		const notifID = EndTextCommandThefeedPostTicker(flash, true)
		if (time) {
			setTimeout(_ => {
				RemoveNotification(notifID)
			}, time)
		}
		return notifID
	}

	static error(message:string, time=5000) {
		return ScreenFX.notify("~r~Action impossible~s~\n"+message, true, time)
	}

	static removeNotification(notifID:number) {
		RemoveNotification(notifID)
	}

	static async drawFrontendPed (pedEntity: number = PlayerPedId(), horizontal="center", vertical="center") {

		ReplaceHudColourWithRgba(117, 0, 0, 0, 0)
    
		SetFrontendActive(true)
		ActivateFrontendMenu(GetHashKey("FE_MENU_VERSION_EMPTY"), false, -1)
    
		Utils.Delay(150).then(() => SetMouseCursorVisibleInMenus(false))

		ScreenFX.frontendPed = ClonePed(pedEntity, false, false, false)
    
		SetEntityVisible(ScreenFX.frontendPed, false, false)
		FreezeEntityPosition(ScreenFX.frontendPed, true)
		SetEntityInvincible(ScreenFX.frontendPed, true)

    
		await Utils.Delay(100)
    
		ScreenFX.moveFrontendPed = true // workaround sinon "ClonePed" fait spawn un ped sur place -> détruit les véhicules proches

		const positions = ["left", "center", "right"]
		GivePedToPauseMenu(ScreenFX.frontendPed, positions.indexOf(horizontal)) // 0 - left, 1 - center, 2 - right
		SetPauseMenuPedLighting(true)
		SetPauseMenuPedSleepState(true)

	}

	static clearFrontendPed () {
		ScreenFX.moveFrontendPed = false
		SetHudColour(117, 0,0,0,150)
		SetFrontendActive(false)
		SetPedAsNoLongerNeeded(ScreenFX.frontendPed)
		DeleteEntity(ScreenFX.frontendPed)
		ScreenFX.frontendPed = null
	}

	static playSound(audioName: string, audioRef: string) {
		PlaySoundFrontend(-1, audioName, audioRef, true)
	}
}

export default ScreenFX