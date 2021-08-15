/*
    CCbot TSOA client

 */
const TAG = " | Pioneer-client-ts | "
const log = require("@pioneer-platform/loggerdog")()

//Pioneer follows OpenAPI spec
const Pioneer = require('openapi-client-axios').default;
let pioneerApi:any

module.exports = class wallet {
    private init: (type: string, config: any) => Promise<any>;
    private spec: string;
    private queryKey: any;
    constructor(spec:string,config:any) {
        this.spec = spec
        this.queryKey = config.queryKey
        this.init = async function () {
            let tag = TAG + " | init_wallet | "
            try{
                if(!this.queryKey) throw Error(" You must create an api key! ")
                pioneerApi = new Pioneer({
                    definition:spec,
                    axiosConfigDefaults: {
                        headers: {
                            'Authorization': this.queryKey,
                        },
                    }
                });
                await pioneerApi.init()
                return pioneerApi
            }catch(e){
                log.error(tag,e)
                throw e
            }
        }
    }
}


