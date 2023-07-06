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
    }
}

/** Tools */
type FolderElement = { name: string, type: 'folder' | 'file' | undefined }
type FolderContent = { folder: Array<FolderElement>, file: Array<FolderElement> }

/** EventHub */
type RuntimeEvent = {
    type: 'stop' | 'warning' | 'info',
    date: number,
    category: 'dotenv' | 'db' | 'file' | 'heaven',
    message: string
}

type EventMessageListenner = {
    message: string,
    callback: (data: RuntimeEvent) => void | undefined,
    oneCall: boolean
}