/* ### Load Node modules ### */
import Adlogs from "./../adlogs"
import Tools from "../../tools"
import { MongoBase } from "../rock"
import Modal from "./modal";

import { Db } from "mongodb"
import { NextFunction, Request, Response } from "express"
import { v4 as uuid } from "uuid"
import uap from "ua-parser-js";

/**
 * # Archange
 * KEngine Security Manager\
 * k-engine
 */

class Archange {
    private modal: Modal
    private activeCallerList: ArchangeCaller[] = []
    private hellUserList: HellUser[] = []

    constructor(private adlogs: Adlogs, private engineConfig: EngineConfigType, mongoBase: MongoBase) {
        this.modal = new Modal(mongoBase.client)

        // -> Init Data from DB
        this.init()

    }

    /**
     * ###
     * PRIVATE METHODS
     * ###
     */

    /** Finalise Archange load by retrieve old data from database */
    private init = async () => {
        const dbHellUser = await this.modal.getAllHellUser()
        dbHellUser.forEach(user => {
            this.hellUserList.push(user)
        })
    }

    /**
     * Retrieve specific data from resquest
     * @param req HTTP request
     * @returns Request Origin Data
     */
    private getRequestOrigin = (req: Request): RequestOrigin => {
        // -> Detect path type
        let pathType = ''
        if (req.path.length > 3 && req.path.slice(1, 4) === 'api') pathType = 'api'
        else pathType = 'web'

        const ip = (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'][0] || req.socket.remoteAddress || 'socket-lost')
        const heavenApiKey = req.headers['x-heaven-apikey'] as string
        const heavenKnowFootprint = req.session.heaven_know_footprint
        const archangeUserFootprint = req.session.archange_user?.footprint

        const ua = uap(req.headers['user-agent'])

        return {
            type: (heavenApiKey && 'auth') || (heavenKnowFootprint && 'unknown') || (archangeUserFootprint && 'auth') || 'ip',
            value: heavenApiKey || heavenKnowFootprint || archangeUserFootprint || ip,
            api: (heavenApiKey && pathType === 'api') || pathType === 'api',
            ip: ip,
            ua: {
                browser: { name: ua.browser.name || 'empty', version: ua.browser.version || 'empty' },
                os: { name: ua.os.name || 'empty', version: ua.os.version || 'empty' }
            }
        }
    }

    /**
     * Get a active caller with specified value
     * @param value Active caller value to search
     */
    private getActiveCaller = (value: string) => {
        const pos = this.activeCallerList.findIndex(x => x.value === value)
        if (pos !== -1) {
            return this.activeCallerList[pos]
        } else return false
    }

    /**
     * Get a hell user with specified value
     * @param value Hell user value to search
     */
    private getHellUser = (value: string) => {
        const pos = this.hellUserList.findIndex(x => x.value === value)
        if (pos !== -1) {
            return {
                index: pos,
                data: this.hellUserList[pos]
            }
        } else return false
    }


    /**
     * ###
     * PUBLIC METHODS
     * ###
     */

    /**
     * Express Middleware for Achange Request Analysis
     * @param req HTTP request
     * @param res HTTP response
     * @param next Express next middleware
     */
    public expressRequestAnalyser = async (req: Request, res: Response, next: NextFunction) => {
        // -> Detect origin and caller
        const requestOrigin = this.getRequestOrigin(req)
        if (requestOrigin.type === 'ip') req.session.heaven_know_footprint = uuid()

        // -> HELL USER DETECTION
        const hellUser = this.getHellUser(requestOrigin.value)
        if (hellUser) {
            // -> User is in Hell
            console.log('🔥 User in Hell');
        } else {
            // -> User is not in hell
            console.log('🤖 User in Heaven');

        }

        // -> ACTIVE USER DETECTION
        const activeCaller = this.getActiveCaller(requestOrigin.value)
        if (activeCaller !== false) {
            // -> Active caller detected
            console.log('🤖 Old active caller');

            // -> CALLER WITH MULTIPLE ORIGIN DETECTION
            let actualOrigin = 0
            // -> Only with auth & ip caller type
            if (['auth', 'ip'].includes(activeCaller.type))
                actualOrigin = activeCaller.checkAddNewOrigin(requestOrigin, req.headers['user-agent'] || 'no-user-agent')

            console.log('Actual origin', activeCaller.getAllOrigins()[actualOrigin]);
            activeCaller.checkRequest(actualOrigin)


            // -> Check Token Bucket Limitation
            //console.log('Frame live end ', (activeCaller.getAllOrigins()[actualOrigin].bucket.timestamp + this.engineConfig.archange.bucket.frame_live > Date.now()));

        } else {
            // -> New active caller detected
            console.log('🤖 New active caller');
            const newCaller = new ArchangeCaller(
                this.adlogs,
                this.engineConfig,
                this.hellUserList,
                this.modal,
                requestOrigin,
                req.headers['user-agent'] || 'no-user-agent'
            )
            if (newCaller.authPass) this.activeCallerList.push(newCaller)
            else {
                this.adlogs.writeRuntimeEvent({
                    category: "archange",
                    message: `Possibly Caller auth ursupation detected with value ${newCaller.value}`,
                    type: "warning"
                })
            }
        }

        // -> Return to next express middleware
        next()
    }
}



/**
 * # Archange Caller Manager
 * k-engine
 */
class ArchangeCaller {
    public value: string
    public type: 'ip' | 'unknown' | 'auth'
    private origins: Origin[] = []
    public authPass = true
    private callerOnHell: HellUser | boolean = false

    constructor(private adlogs: Adlogs, private engineConfig: EngineConfigType, private HellUserList: HellUser[], private modal: Modal, requestOrigin: RequestOrigin, userAgent: string) {
        this.value = requestOrigin.value
        this.type = requestOrigin.type as 'ip' | 'unknown' | 'auth'

        // -> Detect if is auth user and check it
        if (requestOrigin.type === 'auth') {

        } else {
            this.addNewOrigin(requestOrigin, userAgent, true)
        }
    }

    /**
     * ###
     * PRIVATE METHODS
     * ###
     */

    /**
     * Create new Origin data
     * @param requestOrigin Data from request
     * @param hash MD5 User Agent hash
     */

    private addNewOrigin = async (requestOrigin: RequestOrigin, userAgentHeader: string, first: boolean) => {
        const nowDate = Date.now()
        this.origins.push({
            ip: requestOrigin.ip,
            last_access: nowDate,
            request_count: 1,
            bucket: {
                token: this.engineConfig.archange.bucket.limit[requestOrigin.type as 'ip' | 'unknown' | 'auth' | 'client'] - 1,
                timestamp: nowDate
            },
            since: nowDate,
            hash: Tools.makeMD5(userAgentHeader),
            ua: requestOrigin.ua,
            onHell: await this.modal.getHellUserByValue(requestOrigin.value)
        })

        let message = ''
        if (first) message = `New Caller < ${this.value} > with origin < ${this.origins[this.origins.length - 1].hash} >`
        else message = `New Origin < ${this.origins[this.origins.length - 1].hash} > for Caller < ${this.value} >`

        this.adlogs.writeRuntimeEvent({
            category: "archange",
            message: message,
            type: "info"
        })

        console.log(this.origins[this.origins.length - 1].onHell);

    }

    /**
     * ###
     * PUBLIC METHODS
     * ###
     */

    /**
     * Check and Add new Origin data if not exists
     * @param requestOrigin Data from request
     * @param hash MD5 User Agent hash
     */
    public checkAddNewOrigin = (requestOrigin: RequestOrigin, userAgentHeader: string) => {
        const newOriginHash = Tools.makeMD5(userAgentHeader)
        const index = this.origins.findIndex(x => x.hash === newOriginHash)

        if (index !== -1) return 0
        else {
            this.addNewOrigin(requestOrigin, userAgentHeader, false)
            return this.origins.length - 1
        }

    }

    /** Retrieve all caller origin */
    public getAllOrigins = () => {
        return this.origins
    }

    /** Check Incoming request from specific caller origin */
    public checkRequest = (originIndex: number) => {
        const resetToken = () => {
            this.origins[originIndex].bucket.token = this.engineConfig.archange.bucket.limit[this.type] - 1
            this.origins[originIndex].bucket.timestamp = this.origins[originIndex].last_access
            console.log(`🤖 Origin ${this.origins[originIndex].hash} token frame reset`)
        }

        // -> Origin access writing
        this.origins[originIndex].last_access = Date.now()
        this.origins[originIndex].request_count++
        this.origins[originIndex].bucket.token--

        const tokenFrameLive = Tools.timestampDiff(this.origins[originIndex].last_access, this.origins[originIndex].bucket.timestamp, 'second')

        // -> Token bucket check
        const tokenEmpty = this.origins[originIndex].bucket.token < 0

        if (tokenFrameLive <= this.engineConfig.archange.bucket.frame_lifetime) {
            // -> TokenBucket frame life
            if (tokenEmpty) {
                // -> No more TokenBucket
                console.log(`❌ Origin ${this.origins[originIndex].hash} have no more token for this lifetime !`)
                resetToken()
                return false
            } else return true
        } else {
            // -> TokenBucket frame dead
            resetToken()
            return true
        }
    }

}

export default Archange