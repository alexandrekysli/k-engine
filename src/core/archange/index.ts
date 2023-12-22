/* ### Load Node modules ### */
import Adlogs from "./../adlogs"
import Tools from "../../tools"
import { MongoBase } from "../rock"
import Modal from "./modal";

import { Db, ObjectId } from "mongodb"
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
    private hellManager: Hell

    constructor(
        private adlogs: Adlogs,
        private engineConfig: EngineConfigType,
        mongoBase: MongoBase
    ) {
        this.modal = new Modal(mongoBase.client)
        this.hellManager = new Hell(adlogs, this.modal)
    }

    /**
     * ###
     * PRIVATE METHODS
     * ###
     */

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

        // -> ### Own Method
        const postAnalyserAction = async (caller: ArchangeCaller, originIndex: number, api: boolean) => {
            //console.log(caller.callerOnHell, caller.getAllOrigins()[originIndex])
            const origin = caller.getAllOrigins()[originIndex]
            let hitBlocked = false
            const blockedData = { to: 0 }
            if (caller.callerOnHell && caller.callerOnHell.mode === 'BLOCKED') {
                // -> Detect if stay end time is reach
                const nowDate = Date.now()
                if (caller.callerOnHell.to >= Date.now()) {
                    // -> Stay end time isn't reach
                    hitBlocked = true
                    blockedData.to = caller.callerOnHell.to
                } else {
                    // -> Stay end time is reach
                    hitBlocked = false
                    await caller.refreshUser(-1)
                }
            } else if (origin.onHell && origin.onHell.mode === 'BLOCKED') {
                // -> Detect if stay end time is reach
                const nowDate = Date.now()
                if (origin.onHell.to >= Date.now()) {
                    // -> Stay end time isn't reach
                    hitBlocked = true
                    blockedData.to = origin.onHell.to
                } else {
                    // -> Stay end time is reach
                    hitBlocked = false
                    await caller.refreshUser(originIndex)
                }
            }

            if (hitBlocked) {
                res.status(403)
                if (api) {
                    res.json({
                        archange: {
                            state: false,
                            hell: {
                                mode: 'BLOCKED',
                                to: blockedData.to
                            }
                        }
                    })
                } else res.send(`You have been banned from this app until ${new Date(blockedData.to).toISOString()}`)
            } else {
                await caller.checkRequest(originIndex)

                // -> Return to next express middleware
                next()
            }
        }


        // -> Detect origin and caller
        const requestOrigin = this.getRequestOrigin(req)
        if (requestOrigin.type === 'ip') req.session.heaven_know_footprint = uuid()

        // -> ACTIVE USER DETECTION
        const activeCaller = this.getActiveCaller(requestOrigin.value)
        if (activeCaller !== false) {
            // -> Active caller detected
            // -> CALLER WITH MULTIPLE ORIGIN DETECTION
            let actualOrigin = 0
            // -> Only with auth & ip caller type
            if (['auth', 'ip'].includes(activeCaller.type)) actualOrigin = await activeCaller.checkAddNewOrigin(requestOrigin, req.headers['user-agent'] || 'no-user-agent')
            await postAnalyserAction(activeCaller, actualOrigin, requestOrigin.api)
        } else {
            // -> New active caller detected
            const newCaller = new ArchangeCaller(
                this.adlogs,
                this.engineConfig,
                this.hellManager,
                requestOrigin,
                req.headers['user-agent'] || 'no-user-agent',
                async () => {
                    if (newCaller.authPass) {
                        this.activeCallerList.push(newCaller)
                    } else {
                        this.adlogs.writeRuntimeEvent({
                            category: "archange",
                            message: `Possibly auth caller ursupation detected with value ${newCaller.value}`,
                            type: "warning"
                        })
                    }
                    await postAnalyserAction(newCaller, 0, requestOrigin.api)
                }
            )
        }
    }
}


/**
 * # Archange Caller Manager
 * k-engine
 */
class ArchangeCaller {
    public value: string
    public type: "ip" | "unknown" | "auth-web" | "auth-api" | "trust-api"
    public authPass = true
    public callerOnHell: HellUser | null = null
    private origins: Origin[] = []

    constructor(private adlogs: Adlogs, private engineConfig: EngineConfigType, private hell: Hell, requestOrigin: RequestOrigin, userAgent: string, callback: () => void) {
        this.value = requestOrigin.value
        this.type = requestOrigin.type as "ip" | "unknown" | "auth-web" | "auth-api" | "trust-api"

        // -> Detect if is auth user and check it
        if (requestOrigin.type === 'auth') {

        } else {
            this.addNewOrigin(requestOrigin, userAgent, true, callback)
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

    private addNewOrigin = async (requestOrigin: RequestOrigin, userAgentHeader: string, first: boolean, callback: (() => void) | null) => {
        if (first) {
            const user = await this.hell.getHellUser(this.value)
            this.callerOnHell = user || null
        }

        const nowDate = Date.now()
        const hash = Tools.makeMD5(`${userAgentHeader}:${this.value}@${requestOrigin.ip}`)
        this.origins.push({
            ip: requestOrigin.ip,
            last_access: nowDate,
            request_count: 1,
            bucket: {
                token: this.engineConfig.archange.bucket.limit[requestOrigin.type as "ip" | "unknown" | "auth-web" | "auth-api" | "trust-api"],
                timestamp: nowDate
            },
            since: nowDate,
            hash: hash,
            ua: requestOrigin.ua,
            onHell: await this.hell.getHellUser(hash),
            time_banned: { remain: this.engineConfig.archange.hell.delayed_mode_before_ban_hour, from: nowDate }
        })

        let message = ''
        if (first) message = `New Caller < ${this.value} > with origin < ${this.origins[this.origins.length - 1].hash} >`
        else message = `New Origin < ${this.origins[this.origins.length - 1].hash} > for Caller < ${this.value} >`

        this.adlogs.writeRuntimeEvent({
            category: "archange",
            message: message,
            type: "info"
        })

        if (callback) callback()
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
    public checkAddNewOrigin = async (requestOrigin: RequestOrigin, userAgentHeader: string) => {
        const newOriginHash = Tools.makeMD5(`${userAgentHeader}${this.value}@${requestOrigin.ip}`)
        const index = this.origins.findIndex(x => x.hash === newOriginHash)
        console.log(index);

        if (index !== -1) return 0
        else {
            await this.addNewOrigin(requestOrigin, userAgentHeader, false, null)
            return this.origins.length - 1
        }

    }

    /** Retrieve all caller origin */
    public getAllOrigins = () => {
        return this.origins
    }

    /** Check Incoming request from specific caller origin */
    public checkRequest = async (originIndex: number) => {
        // -> Hell check
        // -> ### Own Method
        const resetToken = () => {
            this.origins[originIndex].bucket.token = this.engineConfig.archange.bucket.limit[this.type] - 1
            this.origins[originIndex].bucket.timestamp = this.origins[originIndex].last_access
        }
        const resetHourBanned = () => {
            this.origins[originIndex].time_banned.remain = this.engineConfig.archange.hell.delayed_mode_before_ban_hour
            this.origins[originIndex].time_banned.from = Date.now()
        }

        // -> Origin access writing
        this.origins[originIndex].last_access = Date.now()
        this.origins[originIndex].request_count++
        this.origins[originIndex].bucket.token--

        const tokenFrameLife = Tools.timestampDiff(this.origins[originIndex].last_access, this.origins[originIndex].bucket.timestamp, 'second')

        // -> Token bucket check
        const tokenEmpty = this.origins[originIndex].bucket.token < 0

        if (tokenFrameLife <= this.engineConfig.archange.bucket.frame_lifetime) {
            // -> TokenBucket frame life
            if (tokenEmpty) {
                // -> No more TokenBucket
                // -> Push Origin To Hell
                if (this.origins[originIndex].onHell && this.origins[originIndex].onHell?.mode === 'DELAYED') {
                    // -> Origin in Hell [DELAYED] -> Ban 1H 
                    const origin = this.origins[originIndex]
                    if (origin.onHell) {
                        origin.onHell = await this.hell.updateUserOnHell(origin.onHell._id, {
                            mode: "BLOCKED",
                            lifetime: this.engineConfig.archange.hell.blocked_time_1x_dos,
                            value: origin.hash
                        })
                    }
                } else {
                    // -> Not actually in Hell
                    const diff = Tools.timestampDiff(Date.now(), this.origins[originIndex].time_banned.from, 'second')
                    if (diff < 3600) this.origins[originIndex].time_banned.remain--

                    if (this.origins[originIndex].time_banned.remain) {
                        // -> 1xDOS detected -> Delay
                        this.origins[originIndex].onHell = await this.hell.pushUserOnHell({
                            mode: "DELAYED",
                            lifetime: this.engineConfig.archange.hell.delayed_time,
                            value: this.origins[originIndex].hash
                        })
                        if (diff > 3600) resetHourBanned()
                    } else {
                        // -> 5xDOS/H detected -> Ban 24H
                        this.origins[originIndex].onHell = await this.hell.pushUserOnHell({
                            mode: "BLOCKED",
                            lifetime: this.engineConfig.archange.hell.blocked_time_ban_hour,
                            value: this.origins[originIndex].hash
                        })
                        resetHourBanned()
                    }
                }
                resetToken()
                return false
            } else return true
        } else {
            // -> TokenBucket frame dead
            resetToken()
            return true
        }
    }

    public refreshUser = async (originIndex: number) => {
        const origin = this.origins[originIndex]
        if (originIndex !== -1 && origin) origin.onHell = await this.hell.getHellUser(origin.hash)
        else if (originIndex === -1) this.callerOnHell = await this.hell.getHellUser(this.value)
    }

}


/**
 * # Hell Manager
 * For Blacklist user management
 * k-engine 
 */
class Hell {
    constructor(private adlogs: Adlogs, private modal: Modal) {
        // -> Remove old end stay in Hell
        this.dropEndStayOnHell()
    }

    /**
     * ###
     * PRIVATE METHODS
     * ###
     */

    private dropEndStayOnHell = async () => {
        const dropCount = await this.modal.removeHellUserByEndStay(Date.now())
        if (dropCount) {
            this.adlogs.writeRuntimeEvent({
                category: "archange",
                message: `${dropCount} hell's stay have been drop because end time is reach`,
                type: "info"
            })
        }
    }

    /**
     * ###
     * PUBLIC METHODS 
     * ###
     */

    /** Get specified user from Hell */
    public getHellUser = async (userValue: string) => {
        const user = await this.modal.getHellUserByValue(userValue)
        if (!user) {
            return null
        } else {
            if (user.to < Date.now()) {
                // -> User's stay in Hell is finish -> Remove in DB

                if (await this.modal.removeHellUserById(user._id)) {
                    this.adlogs.writeRuntimeEvent({
                        category: "archange",
                        message: `Hell's stay end time is reach for ${userValue}`,
                        type: "info"
                    })
                }
                return null
            } else return user
        }
    }

    public pushUserOnHell = async (data: { value: string, mode: 'DELAYED' | 'BLOCKED', lifetime: number }) => {
        const from = Date.now()
        const to = (data.lifetime === 0 && 0) || from + data.lifetime
        const insertedId = await this.modal.pushUserOnHell({
            value: data.value,
            mode: data.mode,
            from: from,
            to: to
        })

        const user = await this.modal.getUserById(insertedId)

        if (user) {
            this.adlogs.writeRuntimeEvent({
                category: "archange",
                message: `Adding < ${data.value} > in Hell with < ${data.mode} > mode`,
                type: "warning"
            })
        }

        return user
    }

    public updateUserOnHell = async (id: ObjectId, data: { value: string, mode: 'DELAYED' | 'BLOCKED', lifetime: number }) => {
        const from = Date.now()
        const to = (data.lifetime === 0 && 0) || from + data.lifetime

        const user = await this.modal.updateUserOnHell(id, {
            value: data.value,
            mode: 'BLOCKED',
            from: from,
            to: to
        })

        if (user.ok) {
            this.adlogs.writeRuntimeEvent({
                category: "archange",
                message: `Switch Hell mode to < ${data.mode} > for < ${data.value} >`,
                type: "warning"
            })
        }

        return user.value
    }
}


export default Archange