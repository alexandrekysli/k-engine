/* ### Load Node modules ### */
import fs, { Dirent } from 'fs'
import Crypto from "node:crypto"


/**
 * # Tools
 * Many usual tool set\
 * k-engine
 */

export default class {
    /**
     * Make random number from interval
     * @param min Minimal value
     * @param max Maximum value
     * @returns Random number
     */
    static getRandomNumber = (min: number, max: number) => {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    /** Generated random string equal to defined length */
    static genString = (length: number, full: boolean, number: boolean) => {
        let allCar = ''
        let randomString = ''

        if (!full) allCar = !number ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" : "123456789"
        else allCar = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$@_-'

        for (let i = 0; i < length; i++) {
            randomString = randomString + allCar[this.getRandomNumber(0, allCar.length - 1)]
        }
        return randomString;
    }

    /**
     * Get the name of file into specific folder
     * @param {string} `folder` - The folder who operation been run
     * @param {number} `contentType` - Type of content `0` All - `1` File - `2` Folder
     * @param {boolean} `showFileExtension` - Showing extension ?
    */
    static getFolderContentSync = (
        folder: string,
        contentType: number,
        showFileExtension: boolean,
    ) => {
        try {
            const folderContent = fs.readdirSync(folder, { withFileTypes: true })
            let passedContent: Dirent[]
            if (contentType === 1) passedContent = folderContent.filter(x => !x.isDirectory())
            else if (contentType === 2) passedContent = folderContent.filter(x => x.isDirectory())
            else if (contentType === 0) passedContent = folderContent
            else passedContent = []

            const typedContent: FolderContent = { folder: [], file: [] }
            passedContent.forEach(x => {
                const rep = x.isDirectory() ? 'folder' : 'file'
                if (showFileExtension) typedContent[rep].push({ name: x.name, type: rep })
                else {
                    x.isDirectory()
                        ? typedContent[rep].push({ name: x.name, type: rep })
                        : typedContent[rep].push({ name: x.name.slice(0, x.name.lastIndexOf('.')), type: rep })
                }
            })
            return typedContent
        } catch (err) {
            return { folder: [], file: [] }
        }
    }

    static asyncBlock = async (time: number) => {
        return new Promise(resolve => {
            setTimeout(resolve, time)
        })
    }

    static timestampDiff = (newTimestamp: number, oldTimestamp: number, diffMode: 'second' | 'minute' | 'hour' | 'day') => {
        const _timestamp = new Date(newTimestamp - oldTimestamp)
        const timestamp = _timestamp.getTime() / 1000

        switch (diffMode) {
            case 'second':
                return timestamp
            case 'minute':
                return Math.trunc(timestamp / 60)
            case 'hour':
                return Math.trunc(timestamp / 3600)
            case 'day':
                return Math.trunc(timestamp / 86400)
            default:
                return timestamp
        }
    }

    /**
     * Return a unique hash from a array
     * @param activeArray Actual used hastring hash
     * @param length length of returned string hash
     * @returns unique hash of current given activeArray
     */
    static makeUniqueHash = (activeArray: Array<string>, length: number) => {
        let _hash: string
        do {
            _hash = this.genString(length, true, false)
        } while (activeArray.includes(_hash))

        return _hash
    }

    /**
     * Return a MD5 hash from specified value
     * @param value text value to hash
     */
    static makeMD5 = (value: string) => {
        return Crypto.createHash('md5').update(value).digest("hex")
    }
}