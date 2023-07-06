/* ### Load Node modules ### */
import { EventEmitter } from "node:events"

/**
 * # Adlogs
 * Advanced Logging System\
 * k-engine
 */

export default class {
    private hub = new EventEmitter()
    private runtimeEventMessageListennerList: Array<EventMessageListenner> = []

    constructor() {
        // -> Set listener
        this.hub.on('app-runtime', (data: RuntimeEvent) => {
            console.log('ℹ️', data.message)

            if (data.type === "stop") {
                console.log('❌ Exit App')
                process.exit(1)
            }

            // -> Search on listennerList
            this.runtimeEventMessageListennerList.forEach((listenner, i) => {
                if (listenner.message === data.message) {
                    listenner.callback(data)
                    if (listenner.oneCall) this.runtimeEventMessageListennerList.splice(i, 1)
                }
            })
        })
    }

    /** ### Public methods ### */

    public writeRuntimeEvent = (data: RuntimeEvent) => {
        this.hub.emit('app-runtime', data)
    }

    public listenRuntimeEventMessage = (
        message: string,
        callback: (data: RuntimeEvent) => void,
        oneCall: boolean
    ) => {
        this.runtimeEventMessageListennerList.push({
            callback: callback,
            oneCall: oneCall,
            message: message
        })
    }
}