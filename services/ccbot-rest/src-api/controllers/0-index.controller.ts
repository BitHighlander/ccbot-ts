/*

    Pioneer REST endpoints



 */
let TAG = ' | API | '

const pjson = require('../../package.json');
const log = require('@pioneer-platform/loggerdog')()
const {subscriber, publisher, redis} = require('@pioneer-platform/default-redis')
const connection  = require("@pioneer-platform/default-mongo")
const usersDB = connection.get('users')
usersDB.createIndex({id: 1}, {unique: true})
usersDB.createIndex({username: 1}, {unique: true})
const axios = require('axios')
const short = require('short-uuid');
const { queryString } = require("object-query-string");
const os = require("os")

//globals

//modules

//rest-ts
import { Body, Controller, Get, Post, Route, Tags, SuccessResponse, Query, Request, Response, Header } from 'tsoa';
import * as express from 'express';

//import { User, UserCreateRequest, UserUpdateRequest } from '../models/user';

//types
import {
    Health,
    ApiError,
    Error
} from "@pioneer-platform/pioneer-types";

//route
@Tags('Status Endpoints')
@Route('')
export class IndexController extends Controller {

    //remove api key


    /*
        Health endpoint
    */

    @Get('/health')
    public async health() {
        let tag = TAG + " | health | "
        try{

            let queueStatus:any = await redis.hgetall("info:pioneer")

            let output:Health = {
                online:true,
                hostname:os.hostname(),
                uptime:os.uptime(),
                loadavg:os.loadavg(),
                name:pjson.name,
                version:pjson.version,
                system:queueStatus
            }

            return(output)
        }catch(e){
            let errorResp:Error = {
                success:false,
                tag,
                e
            }
            log.error(tag,"e: ",{errorResp})
            throw new ApiError("error",503,"error: "+e.toString());
        }
    }

    /*
        Get leaderboard
    */

    @Get('/leaderboard')
    public async leaderboard() {
        let tag = TAG + " | health | "
        try{

            let queueStatus:any = await redis.hgetall("info:pools")

            //mock
            let pool:any = {
                agent:"lp-1",
                pubkey:"Fakepubkey",
                rfqSpec:"",
                price:""
            }

            let output:any = {
                online:true,
                pools:[
                    pool
                ]
            }

            return(output)
        }catch(e){
            let errorResp:Error = {
                success:false,
                tag,
                e
            }
            log.error(tag,"e: ",{errorResp})
            throw new ApiError("error",503,"error: "+e.toString());
        }
    }

    /*
        Get altfolios
    */

    @Get('/altfolios/{username}')
    public async altfolios(username:string) {
        let tag = TAG + " | altfolios | "
        try{

            //
            log.info(tag,"username: ",username)

            return(true)
        }catch(e){
            let errorResp:Error = {
                success:false,
                tag,
                e
            }
            log.error(tag,"e: ",{errorResp})
            throw new ApiError("error",503,"error: "+e.toString());
        }
    }

    /*
        Auth
            create pro user
    */
    @Post('/signup')
    public async signup(@Header('Authorization') authorization: string, @Body() body: any): Promise<any> {
        let tag = TAG + " | invocation | "
        try{
            //TODO
            //verify admin hash
            //verify username available
            //create user mongo
            //create key
            //save apiKey info

            return true
        }catch(e){
            let errorResp:any = {
                success:false,
                tag,
                e
            }
            log.error(tag,"e: ",{errorResp})
            throw new ApiError("error",503,"error: "+e.toString());
        }
    }

    /*
        Create altfolio
     */
    @Post('/create')
    public async invoke(@Header('Authorization') authorization: string, @Body() body: any): Promise<any> {
        let tag = TAG + " | invocation | "
        try{
            let output:any = {
                success:false
            }

            //TODO
            //get user info
            // let accountInfo = await redis.hgetall(authorization)
            // if(!accountInfo) throw Error("103: unknown user! api is for pro users only!")
            // if(!accountInfo.username) throw Error("104: unknown username! invalid cache info")
            //
            // //username
            // let username = accountInfo.username
            //
            // //get altfolios per user
            // let userInfoMongo = await usersDB.findOne({username})
            // let portfolios = []
            // if(userInfoMongo) {
            //     portfolios = userInfoMongo.portfolios
            // }
            //
            // //if pro || 0 portfolios
            //     //create

            //slack userId
            //slack username
            //portfolio name


            return output
        }catch(e){
            let errorResp:any = {
                success:false,
                tag,
                e
            }
            log.error(tag,"e: ",{errorResp})
            throw new ApiError("error",503,"error: "+e.toString());
        }
    }

    /*
        update altfolio
     */

    /*
        delete altfolio
     */

}
