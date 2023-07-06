/* ### Load Node modules ### */
import Adlogs from "../../core/adlogs"
import { HeavenRouteBase } from "../../core/heaven"

/**
 * # /api route
 * Heaven express route wrapper\
 * k-engine
 */


export default (adlogs: Adlogs) => {
    const heavenRoute = new HeavenRouteBase(__dirname, adlogs, __filename)
    return heavenRoute.route
}