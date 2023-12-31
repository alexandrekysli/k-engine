/* ### Load Node modules ### */
import path from "node:path"
import { networkInterfaces } from "node:os";
import 'dotenv/config'


// -> Check dotenv file
const requireData = [
    'SERVER_INTERFACE',
    'HTTPS_MODE',
    'HTTP_PORT',
    'HTTP_SESSION_SECRET',
    'HTTP_SESSION_DAY_LIFE',
    'DATABASE_MONGO_USER',
    'DATABASE_MONGO_PASS',
    'DATABASE_MONGO_HOST'
]

let errorMessage: string | null

for (let i = 0; i < requireData.length; i++) {
    const property = requireData[i]
    const value = process.env[property]
    if (property !== 'HTTPS_MODE' && value === undefined) {
        errorMessage = `< ${property} > not correctly defined in .env file`
        break
    } else {
        if (
            property === 'HTTP_SESSION_DAY_LIFE' &&
            typeof process.env['HTTP_SESSION_DAY_LIFE'] === 'string' &&
            isNaN(parseInt((process.env['HTTP_SESSION_DAY_LIFE']), 10))
        ) {
            errorMessage = `< ${property} > not correctly defined in .env file`
            break
        }
    }
}

const allInterface = networkInterfaces()
const externalNetworkInterface: NetworkInterfaces[] = []
for (const item of Object.keys(allInterface)) {
    const x = allInterface[item]
    if (x) {
        for (const net of x) {
            if (net.family === "IPv4" && !net.internal) {
                externalNetworkInterface.push({
                    name: item,
                    mac: net.mac,
                    address: net.address,
                    mask: net.netmask
                })
            }
        }
    }
}

// -> Get limited access host
const interfaceIndex = externalNetworkInterface.findIndex(x => x.name === process.env.SERVER_INTERFACE)

let interfaceToListen: NetworkInterfaces | false = false
if (interfaceIndex !== -1) {
    interfaceToListen = externalNetworkInterface[interfaceIndex]
} else if (process.env.SERVER_INTERFACE !== '' && interfaceIndex === -1) {
    errorMessage = `${process.env.SERVER_INTERFACE} defined at < SERVER_INTERFACE > in .env file not found`
}


/**
 * # Configuration File
 * k-engine 
 */
const engineConfig = () => {
    return ({
        error: errorMessage,
        app_root: path.join(__dirname, '..'),
        http: {
            interfaces: interfaceToListen,
            https_mode: process.env.HTTPS_MODE !== undefined,
            port: parseInt((process.env.HTTP_PORT || '9999'), 10),
            session: {
                secret: process.env.HTTP_SESSION_SECRET,
                cookie_lifetime: parseInt((process.env.HTTP_SESSION_DAY_LIFE || '0'), 10) * 86400000
            }
        },
        archange: {
            bucket: {
                limit: {
                    ip: 10,
                    unknown: 20,
                    "auth-web": 30,
                    "auth-api": 30,
                    "trust-api": 0
                },
                frame_lifetime: 10
            },
            hell: {
                delayed_time: 5 * 60 * 1000,
                delayed_mode_before_ban_hour: 5,
                blocked_time_ban_hour: (24 * 60 * 60 * 1000),
                blocked_time_1x_dos: (1 * 60 * 60 * 1000)
            }
        },
        database: {
            mongo: {
                host: process.env.DATABASE_MONGO_HOST,
                user: process.env.DATABASE_MONGO_USER,
                password: encodeURIComponent(process.env.DATABASE_MONGO_PASS || '')
            }
        }
    } as EngineConfigType)
}

export default engineConfig