/*
    E2E testing
        k8  "job" pattern



 */

require("dotenv").config()
require('dotenv').config({path:"../../.env"});
require("dotenv").config({path:'../../../.env'})
require("dotenv").config({path:'../../../../.env'})

const TAG  = " | e2e-test | "
const log = require("@pioneer-platform/loggerdog")()

let assert = require('assert')
import {v4 as uuidv4} from 'uuid';
let wait = require('wait-promise');

let ccbotApi = require("@pioneer-platform/ccbot-client")

//process.env['URL_CCBOT_SPEC'] = "https://ccbot.pro/spec/swagger.json"
process.env['URL_CCBOT_SPEC'] = "http://127.0.0.1:9001/spec/swagger.json"
let spec = process.env['URL_CCBOT_SPEC']

const test_service = async function () {
    let tag = TAG + " | test_service | "
    try {

        //create username
        let username = "test:username:"+uuidv4()
        let queryKey = "test:queryKey:"+uuidv4()
        log.info(tag,"username: ",username)

        //register username
        let config = {
            queryKey,
            username:'test-user-2',
            spec
        }
        console.log("config: ",config)

        //get config
        let ccbot = new ccbotApi(spec,config)
        ccbot = await ccbot.init()

        let altfolio = ['BTC','DOGE','BCH']

        //mock discord info
        let userId = '121234532'

        let user = {
            user:username,
            userId,
            action:'create',
            altfolio
        }

        //create altfolio

        //verify cant create if already registerd

        //verify cant register new username on same key

        //verify altfolio was saved
        //get altfolio

        //fund altfolio
        //

        //delete altfolio

        //verify deleted


        log.info("****** TEST PASS 2******")
        //process
        process.exit(0)
    } catch (e) {
        log.error(e)
        //process
        process.exit(666)
    }
}
test_service()
