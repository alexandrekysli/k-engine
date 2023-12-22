/** Settings */
type NetworkInterfaces = { name: string, mac: string, address: string, mask: string }
type EngineConfigType = {
    error: errorMessage,
    app_root: string,
    http: {
        interfaces: NetworkInterfaces | false
        https_mode: boolean,
        port: number,
        session: {
            secret: string,
            cookie_lifetime: number
        }
    },
    archange: {
        bucket: {
            limit: {
                ip: number,
                unknown: number,
                'auth-web': number,
                'auth-api': number,
                'trust-api': number
            },
            frame_lifetime: number
        },
        hell: {
            delayed_time: number,
            delayed_mode_before_ban_hour: number,
            blocked_time_ban_hour: number,
            blocked_time_1x_dos: number
        }

    },
    database: {
        mongo: {
            user: string,
            password: string,
            host: string,
        }
    }
}

/** Tools */
type FolderElement = { name: string, type: 'folder' | 'file' | undefined }
type FolderContent = { folder: Array<FolderElement>, file: Array<FolderElement> }

/** EventHub */
type RuntimeEvent = {
    type: 'stop' | 'warning' | 'info',
    date?: number,
    category: 'dotenv' | 'rock' | 'file' | 'heaven' | 'archange',
    message: string
}

type EventMessageListenner = {
    message: string,
    callback: (data: RuntimeEvent) => void | undefined,
    oneCall: boolean
}

/** Archange */
type HellUser = {
    _id: import("mongodb").ObjectId,
    mode: string, to: number, from: number
}

type Origin = {
    ip: string,
    hash: string,
    since: number,
    last_access: number,
    request_count: number,
    bucket: {
        token: number,
        timestamp: number
    },
    ua: {
        browser: { name: string, version: string },
        os: { name: string, version: string }
    },
    onHell: HellUser | null,
    time_banned: { remain: number, from: number }
}

type ActiveCaller = {
    type: string,
    value: string,
    origins: Origin[]
}

type RequestOrigin = {
    type: string,
    value: string,
    ip: string,
    api: boolean,
    ua: {
        browser: {
            name: string,
            version: string,
        },
        os: {
            name: string,
            version: string
        }
    }
}