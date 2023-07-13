/* ### Load Node modules ### */
import Adlogs from "../core/adlogs"
import { HeavenRouteBase } from "../core/heaven"

/**
 * # Index route (/)
 * Heaven express route wrapper\
 * k-engine
 */


export default (adlogs: Adlogs) => {
    const heavenRoute = new HeavenRouteBase(__dirname, adlogs, __filename)

    /** ### Router dispatching ### */
    heavenRoute.route.get('/', async (req, res) => {
        res.send('Welcome ' + req.socket.remoteAddress)
    })

    return heavenRoute.route
}