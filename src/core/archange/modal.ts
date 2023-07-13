/* ### Load Node modules ### */
import Adlogs from "./../adlogs"
import Tools from "../../tools"
import { MongoBase } from "../rock"

import { MongoClient, Db, Collection, ObjectId } from "mongodb"


// -> Modal Interface
interface Hell {
    value: string,
    type: string,
    mode: string,
    since: number,
    end: number
}

/**
 * # Archange Modal
 * Rock Modal for Archange\
 * k-engine
 */


class Modal {
    private db: Db
    private hellCollection: Collection<Hell>
    constructor(client: MongoClient) {
        // -> Load Collection
        this.db = client.db('archange')
        this.hellCollection = this.db.collection<Hell>('hell')
        this.init()
    }

    /**
     * ###
     * PRIVATE METHODS
     * ###
     */

    /** Modal initialization */
    private init = async () => {
        await this.db.command({
            "collMod": "hell",
            "validator": {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["value", "type", "mode", "since", "end"],
                    additionalProperties: false,
                    properties: {
                        _id: {},
                        value: { bsonType: "string" },
                        type: { bsonType: "string" },
                        mode: { bsonType: "string" },
                        since: { bsonType: "number" },
                        end: { bsonType: "number" }
                    }
                }
            }
        })
    }

    /**
     * ###
     * PUBLIC METHODS
     * ###
     */

    public getAllHellUser = async () => {
        return await this.db.collection<Hell>('hell').find().toArray()
    }

    public getHellUserByValue = async (_value: string) => {
        const result = await this.hellCollection.findOne({ value: _value })
        if (result && result.end < Date.now()) {
            const deleteCount = await this.hellCollection.deleteOne({ _id: new ObjectId(result._id) })
            return null
        } else {

        }
        return result
    }

    public getUserByName = async (name: string) => {
        return await this.db.collection('user').findOne()
    }
}

export default Modal