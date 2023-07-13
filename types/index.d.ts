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
                auth: number,
                client: number
            },
            frame_lifetime: 10
        },

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
    value: string, type: string, mode: string, since: number, end: number
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
    onHell: HellUser | null
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