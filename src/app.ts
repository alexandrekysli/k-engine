/**
 * K-ENGINE
 * Custom NodeJS Server Engine
 * Alpha Build
 * Write by Alexandre kYsLi
 * © 2023 BeTech CI
 */

/* ### Load Core Modules ### */
import Config from "./settings"
import Adlogs from "./core/adlogs"
import Archange from "./core/archange"
import Heaven from "./core/heaven"



/* ### -> App Run ### */
const engineConfig = Config()
const adlogs = new Adlogs()
const archange = new Archange(adlogs, engineConfig)
const heaven = new Heaven(adlogs, engineConfig)

// -> To know when Heaven is ready
adlogs.listenRuntimeEventMessage('Express server configuration complete', (data) => {
    heaven.runServer()
}, true)

// -> Check if error on engineConfig
if (engineConfig.error) {
    adlogs.writeRuntimeEvent({
        type: "stop",
        category: "dotenv",
        date: new Date().getTime(),
        message: engineConfig.error
    })
} else {
    // -> Configuration Good -> Next step ...
    heaven.makeServer()
}