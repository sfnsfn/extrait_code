
/* Usage

    ServerCallback(name, arg || [*args], function(data) {
        -- Do thing with data
    })

*/

import {Log} from "../shared/class/Log";
import {QueryResult} from "../server/typings";

const callbacks = {}
let requestId = 0
const timeLimit = 10000

let hasInit = false

function init() {
	if (!hasInit) {
		onNet("serverCallback", function (id:number, result: any) {
			if (callbacks[id]) {
				callbacks[id](result)
				delete callbacks[id]
			} else {
				Log.warning(`Callbacks with ID ${id} not found in callbacks.`, false);
			}
		})
		hasInit = true
	}
}

export async function ServerCallback (name: string, ...args: any[]): Promise<QueryResult<any>> {

	init()
	requestId = requestId < 65535 ? requestId + 1 : 0

	return new Promise<any>(resolve => {
		emitNet("triggerServerCallback", name, requestId, ...args)

		const to = setTimeout(_ => {
			Log.warning(`Promise "${name}" timed out after ${timeLimit} ms`, false);
			resolve(null)
		}, timeLimit)

		callbacks[requestId] = (result: any) => {
			clearTimeout(to)
			resolve(result)
		}
	})
}

export async function ServerCallback2 (name: string, ...args: any[]) {

	return new Promise<any>(resolve => {
		emitNet(name,...args)
		onNet(name, (...args2: any[]) => resolve(args2))
	})
}
