import Utils from "./Utils"

class Webview {

	static registeredCallbacks: string[] = []

	static go(path: string, state={}, focus=false, useMouse=true) {
		SendNuiMessage(JSON.stringify({
			action: "ROUTER_GO",
			path,
			state
		}))
		if (focus) { Webview.focus(useMouse) }
	}

	static send(data:object|string, data2?:object) {
		if (typeof data === "string" && data2) {
			SendNuiMessage(JSON.stringify({action: data, ...data2}))
		} else {
			SendNuiMessage(JSON.stringify(data))
		}
	}

	static focus(useMouse=true) {
		SetNuiFocus(true, useMouse)
	}

	static unfocus() {
		SetNuiFocus(false, false)
	}

	static on(eventName: string, callback: (data:unknown) => void) {
		if (!Webview.registeredCallbacks.includes(eventName)) {
			RegisterNuiCallbackType(eventName)
			Webview.registeredCallbacks.push(eventName)
		}
		on(`__cfx_nui:${eventName}`, async (data: Object, cb: Function) => {
			const result = await callback(data)
			cb(result)
		})
	}

	static setProgressBar(options) {
		Webview.send({
			action: "PROGRESS_BAR:ADD",
			options
		})
	}

	static progressBarUpdate(progress) {
		Webview.send({
			action: "PROGRESS_BAR:UPDATE",
			progress
		})
	}

	static removeProgressBar() {
		Webview.send("PROGRESS_BAR:REMOVE")
	}

	static async focusKeepInput(keepInput) {
		SetNuiFocusKeepInput(keepInput)
		
		while (IsNuiFocused()) {
			await Utils.Delay(0)

			const controlsDisable = [
				1, 
				2, 
				3, 
				4, 
				5, 
				6, 
				18, 
				24, 
				25, 
				37, 
				68, 
				69, 
				70, 
				91, 
				92, 
				142, 
				182, 
				199, 
				200, 
				245, 
				257, 
				36
			]

			for (var control of controlsDisable) {
				DisableControlAction(0, control, true)
			}
		}
	}

}

export default Webview
