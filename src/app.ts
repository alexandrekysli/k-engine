/**
 * K-ENGINE
 * Custom NodeJS Server Engine
 * Alpha Build
 * Write with ❤️ by Alexandre kYsLi
 * © 2023 BeTech CI
 */

/* ### Load Core Modules ### */
import Config from "./settings"
import { MongoBase } from "./core/rock"
import Adlogs from "./core/adlogs"
import Archange from "./core/archange"
import Heaven from "./core/heaven"



/* ### -> App Run ### */
const engineConfig = Config()
const adlogs = new Adlogs()
const mongoBase = new MongoBase(adlogs, engineConfig)

// -> Check if error on engineConfig
if (engineConfig.error) {
    adlogs.writeRuntimeEvent({
        type: "stop",
        category: "dotenv",
        message: engineConfig.error
    })
} else {
    // -> Configuration Good -> Next step ...

    // -> To know when MongoBase is ready
    adlogs.listenRuntimeEventMessage('MongoDB server has correctly start', () => {
        // -> Making Heaven Server
        const archange = new Archange(adlogs, engineConfig, mongoBase)
        const heaven = new Heaven(adlogs, engineConfig, mongoBase, archange.expressRequestAnalyser)
        heaven.makeServer()

        // -> To know when Heaven is ready
        adlogs.listenRuntimeEventMessage('Express server configuration complete', () => {
            heaven.runServer()
        }, true)
    }, true)


}