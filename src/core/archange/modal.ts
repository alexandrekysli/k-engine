/* ### Load Node modules ### */
import { MongoClient, Db, Collection, ObjectId } from "mongodb"


// -> Modal Interface
interface Hell {
    value: string,
    mode: string,
    from: number,
    to: number
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
                    required: ["value", "mode", "from", "to"],
                    additionalProperties: false,
                    properties: {
                        _id: {},
                        value: { bsonType: "string" },
                        mode: { bsonType: "string" },
                        from: { bsonType: "number" },
                        to: { bsonType: "number" }
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
        return await this.hellCollection.findOne({ value: _value })
    }

    public getUserByName = async (name: string) => {
        return await this.db.collection('user').findOne()
    }

    public getUserById = async (id: ObjectId) => {
        return await this.hellCollection.findOne({ _id: new ObjectId(id) })
    }

    public pushUserOnHell = async (data: Hell) => {
        return (await this.hellCollection.insertOne({ ...data })).insertedId
    }

    public updateUserOnHell = async (id: ObjectId, data: Hell) => {
        return await this.hellCollection.findOneAndUpdate({ _id: id }, { $set: data }, { upsert: true, returnDocument: "after" })
    }

    public removeHellUserById = async (id: ObjectId) => {
        const status = await this.hellCollection.deleteOne({ _id: new ObjectId(id) })
        return status.deletedCount > 0
    }

    public removeHellUserByEndStay = async (to: number) => {
        const status = await this.hellCollection.deleteMany({ to: { $lt: to } })
        return status.deletedCount
    }
}

export default Modal