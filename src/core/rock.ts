/**
 * # Rock
 * Versatile Manager for Database and System file \
 * k-engine
 */

/* ### Load Node modules ### */
import Adlogs from "./adlogs"
import { MongoClient } from "mongodb"


/**
 * Rock MongoDB wrapper
 */
export class MongoBase {
    private adlogs: Adlogs
    private engineConfig: EngineConfigType
    public client: MongoClient

    constructor(adlogs: Adlogs, engineConfig: EngineConfigType) {
        this.adlogs = adlogs
        this.engineConfig = engineConfig

        // -> Make MongoDB connexion 
        this.client = new MongoClient(
            'mongodb://'
            + engineConfig.database.mongo.user
            + ':'
            + engineConfig.database.mongo.password
            + '@'
            + engineConfig.database.mongo.host
            + '/?authSource=admin'
        )

        this.makeConnection()
    }

    private makeConnection = async () => {
        try {
            await this.client.connect()
            await this.client.db('admin').command({ ping: 1 })
            this.adlogs.writeRuntimeEvent({
                type: 'info',
                category: 'rock',
                message: 'MongoDB server has correctly start'
            })
        } catch (err) {
            this.client.close()
            this.adlogs.writeRuntimeEvent({
                type: 'stop',
                category: 'rock',
                message: `MongoDB server starting error : ${err}`
            })
        }
    }
}