/* ### Load Node modules ### */
import Adlogs from "../../core/adlogs"
import { HeavenRouteBase } from "../../core/heaven"

/**
 * # Heaven route
 * k-engine
 */


export default (adlogs: Adlogs) => {
    const heavenRoute = new HeavenRouteBase(__dirname, adlogs, __filename)

    /** ### Router dispatching ### */
    heavenRoute.route.get('/', async (req, res) => {

        res.json({
            name: 'kysli',
            sid: req.sessionID
        })
    })

    return heavenRoute.route
}