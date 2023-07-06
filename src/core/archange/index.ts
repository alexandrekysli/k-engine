/* ### Load Node modules ### */
import Adlogs from "./../adlogs"
import Tools from "../../tools"


/**
 * # Archange
 * KEngine Security Manager\
 * k-engine
 */

class Archange {
    private adlogs: Adlogs
    private engineConfig: EngineConfigType

    constructor(adlogs: Adlogs, engineConfig: EngineConfigType) {
        this.adlogs = adlogs
        this.engineConfig = engineConfig

        console.log('Hello from 🛡️');

    }
}

export default Archange