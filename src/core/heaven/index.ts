/* ### Load Node modules ### */
import http from "http"
import path from "node:path"

import Adlogs from "../adlogs"
import Tools from "../../tools"
import { MongoBase } from "../rock"

import ExpressApp, { Express } from "express"
import ExpressSession from "express-session"
import MongoStore from "connect-mongo"
import Helmet from "helmet"
import { v4 } from "uuid"
import favicon from "serve-favicon";

/** TS > express-session mistake resolved */
declare module 'express-session' {
    interface SessionData { heaven_know_footprint: string, archange_user: { footprint: string, expire: number } }
}

/**
 * # Heaven
 * KEngine Web Server\
 * k-engine
 */
class Heaven {
    private webServer: Express | undefined
    private webLink: http.Server | undefined
    /**
     * @param adlogs Master Event Hub for EDP
     */
    constructor(private adlogs: Adlogs, private engineConfig: EngineConfigType, private mongoBase: MongoBase, private archangeRequestAnalyser: any) { }

    /**
     * ###
     * PRIVATE METHODS
     * ###
     */

    /** Making of express server for http request */
    private makeExpressServer = async () => {
        // -> Express initial configuration
        this.webServer = ExpressApp()
        this.webLink = http.createServer(this.webServer)

        this.webServer.use(ExpressApp.urlencoded({ extended: true }))
        this.webServer.use(ExpressApp.json())
        this.webServer.disable('x-powered-by')
        if (this.engineConfig.http.https_mode) this.webServer.use(Helmet())

        this.webServer.use(favicon(path.join(this.engineConfig.app_root, 'public', 'favicon.ico')))


        // -> Express session configuration
        this.webServer.use(ExpressSession({
            secret: this.engineConfig.http.session.secret,
            resave: true,
            saveUninitialized: true,
            cookie: {
                secure: this.engineConfig.http.https_mode,
                maxAge: this.engineConfig.http.session.cookie_lifetime
            },
            store: MongoStore.create({
                client: this.mongoBase.client,
                dbName: 'k-engine-session'
            })
        }))

        // -> Link archangeRequestAnalyser
        this.webServer.use(this.archangeRequestAnalyser)

        // -> Start dynamic routing
        const routes = Tools.getFolderContentSync(path.join(this.engineConfig.app_root, '/routes'), 0, false)
        if ([...routes.file, ...routes.folder].length) {
            const indexPos = routes.file.findIndex(x => x.name === 'index')

            // -> Route found
            if (indexPos !== -1 && this.webServer) {
                // -> Index route found -> begin routing
                const mainRoute = (await import('../../routes')).default(this.adlogs)
                this.webServer.use('/', mainRoute)

                // -> 404 page catching
                this.webServer.use((req, res) => {
                    // -> 404
                    res.status(404)
                    res.send('This route is not available !')

                    this.adlogs.writeRuntimeEvent({
                        type: "warning",
                        category: "heaven",
                        message: `User want to access unavailable route : ${req.originalUrl}`
                    })
                })

                // -> Heaven ready...
                this.adlogs.writeRuntimeEvent({
                    type: "info",
                    category: "heaven",
                    message: 'Express server configuration complete'
                })
            } else {
                // -> No Index route found
                this.adlogs.writeRuntimeEvent({
                    type: "warning",
                    category: "heaven",
                    message: `Unabled to find main index router file at ${path.join(this.engineConfig.app_root, '/routes')}`
                })
            }
        } else {
            // -> No Route found
            this.adlogs.writeRuntimeEvent({
                type: "warning",
                category: "heaven",
                message: `Unabled to find any router file at ${path.join(this.engineConfig.app_root, '/routes')}`
            })
        }
    }


    /**
     * ###
     * PUBLIC METHODS
     * ###
     */

    /** Making of Haeaven server initialization */
    public makeServer = () => {
        this.makeExpressServer()
    }

    /** Start really Heaven Server */
    public runServer = () => {

        this.webLink?.listen(
            this.engineConfig.http.port,
            this.engineConfig.http.interfaces
                ? this.engineConfig.http.interfaces.address
                : undefined,
            undefined,
            () => {
                this.adlogs.writeRuntimeEvent({
                    type: "info",
                    category: "heaven",
                    message: `Heaven server starting complete at < ${this.engineConfig.http.interfaces ? `${this.engineConfig.http.interfaces.address}:` : ':'}${this.engineConfig.http.port} >`
                })
            }
        )
    }
}

/**
 * # Heaven Route
 */
export class HeavenRouteBase {
    public route = ExpressApp.Router()
    private adlogs: Adlogs
    private filename: string
    constructor(dirname: string, adlogs: Adlogs, filename: string) {
        this.adlogs = adlogs
        this.filename = path.basename(filename, path.extname(filename))

        // -> Children routing start
        const routes = Tools.getFolderContentSync(dirname, 0, false)
        const allRoutes = [...routes.file, ...routes.folder]
        const fileIndex = allRoutes.findIndex(x => x.name === this.filename)
        if (allRoutes[fileIndex].name === 'index' && allRoutes[fileIndex].type === 'file') {
            // -> Routing allowed
            allRoutes.forEach(async route => {
                if (route.name !== this.filename) {
                    const filePath = path.join(dirname, '/', route.name)
                    const router = (await import(filePath)).default

                    if (router instanceof Function) {
                        //console.log(`${route.name} routing ok ✅`);
                        this.route.use(`/${route.name}`, router(adlogs))
                    } else {
                        // -> Bad index file structure !!!
                        this.adlogs.writeRuntimeEvent({
                            type: "warning",
                            category: "heaven",
                            message: `Unabled to find any good index file at ${path.join(dirname, '/', route.name)}`
                        })
                    }
                }
            })
        }
    }

    public makeUUID = () => v4()


}

export default Heaven