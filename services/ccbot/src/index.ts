/*
      CCbot

      generate response to input

      output:
        discord view

 */

require('dotenv').config()
require('dotenv').config({path:"../../../.env"})
require('dotenv').config({path:"./../../.env"})
require('dotenv').config({path:"../../../../.env"})

let packageInfo = require("../package.json")
const TAG = " | "+packageInfo.name+" | "

const log = require('@pioneer-platform/loggerdog')()
const {subscriber,publisher,redis,redisQueue} = require('@pioneer-platform/default-redis')

const coincap = require('@pioneer-platform/ccbot-coincap');
console.log(coincap)
const easterEggCommands  = require('@pioneer-platform/ccbot-easter-eggs');
let rebalance = require('@pioneer-platform/pioneer-rebalance')
const Accounting = require('@pioneer-platform/accounting')
const accounting = new Accounting(redis)
// @ts-ignore
import {v4 as uuidv4} from 'uuid';
const Tokenizer = require('sentence-tokenizer');
const tokenizer = new Tokenizer('reddit');

let queue = require("@pioneer-platform/redis-queue")
let connection  = require("@pioneer-platform/default-mongo")
let wait = require('wait-promise');
let sleep = wait.sleep;

let discordChannel = process.env['DISCORD_BOT_CHANNEL']
let DISCORD_ADMIN_USERID = process.env['DISCORD_ADMIN_USERID']
let BOT_NAME = process.env['BOT_NAME'] || 'ccbot'

//const AWS = require('aws-sdk');
const asciichart = require('asciichart');
const { Configuration, OpenAIApi } = require("openai");

// AWS.config.update({ region: 'eu-west-1' })
// const dynamodb = new AWS.DynamoDB();

let USE_GPT_4 = true
let configuration
if(!process.env.OPENAI_API_KEY_4) USE_GPT_4 = false
if(USE_GPT_4){
    log.info("USING USE_GPT_4")
    let OPENAI_API_KEY = process.env.OPENAI_API_KEY_4
    if(!OPENAI_API_KEY) throw Error("missing OPENAI_API_KEY")
    configuration = new Configuration({
        apiKey: OPENAI_API_KEY,
    });
} else {
    log.info("USING USE_GPT_3")
    let OPENAI_API_KEY = process.env.OPENAI_API_KEY_3 || process.env.OPENAI_API_KEY
    if(!OPENAI_API_KEY) throw Error("missing OPENAI_API_KEY")
    configuration = new Configuration({
        apiKey: OPENAI_API_KEY,
    });
}
const openai = new OpenAIApi(configuration);

const usersDB = connection.get('usersCCbot')
// usersDB.createIndex({username: 1}, {unique: true})
usersDB.createIndex({user: 1}, {unique: true})
let conversations = connection.get("conversations");
conversations.createIndex({messageId: 1}, {unique: true})
let rive = require('@pioneer-platform/ccbot-rivescript-brain')
//onStart
rive.initialize()

interface Data {
    queueId:string
    admin:boolean
    dm:boolean
    user:string
    username:string
    channel:string
    text:string
    sessionId?:string
    messageId?:string
    output?:{
        views:any
        sentences:any
    }
}



/***********************************************
 //        lib
 //***********************************************/
const getMarketData = async (symbols:any, inCurrencySymbol = 'usd') => {
    const marketDatas = await coincap.getMarketDataForSymbols(symbols);

    let unit = '$';
    let divisor = 1;
    let precision = 5;
    let currency24hr;
    let currencyStartPrice: number;
    let currencyEndPrice: number;

    if (inCurrencySymbol !== 'usd') {
        const currencyData = await coincap.getMarketDataForSymbols([inCurrencySymbol]);
        currency24hr = parseFloat(currencyData[0].changePercent24Hr);

        currencyEndPrice = parseFloat(currencyData[0].priceUsd);
        divisor = currencyEndPrice;
        unit = `:${inCurrencySymbol}:`

        currencyStartPrice = currencyEndPrice / (1 + (currency24hr / 100));

        if (inCurrencySymbol === 'btc') {
            precision = 7;
        }
    }

    const messages = marketDatas.map((marketData: any | undefined, i: string | number) => {
        if (Array.isArray(marketData)) {
            marketData = marketData[0];
        }

        if (marketData === undefined) {
            return `${symbols[i]} not found :rip:`;
        }

        let isXRP = marketData.symbol === 'XRP';

        //const symbol = isXRP ? '*X:poopfire:P*' : `https://assets.coincap.io/assets/icons/${marketData.symbol.toLowerCase()}@2x.png`;
        //get emoji symbol


        const symbol = isXRP ? '*X:poopfire:P*' : `${marketData.symbol.toLowerCase()}`;
        let emoji = isXRP ? ':poop:' : `:${marketData.symbol.toLowerCase()}:`;
        // Fix BAT emoji
        if (emoji === ':bat:') {
            emoji = ':bat_:'
        } else if (emoji === ':grin:') {
            emoji = ':grinmw:'
        } else if (emoji === ':dash:') {
            emoji = ':dash_:'
        }

        const endPrice = parseFloat(marketData.priceUsd);
        let percent24Hr = parseFloat(marketData.changePercent24Hr)

        const startPrice = endPrice / (1 + (percent24Hr / 100));

        const value = endPrice / divisor;

        if (inCurrencySymbol !== 'usd') {
            const startRatio = startPrice / currencyStartPrice;
            const endRatio = endPrice / currencyEndPrice;
            // console.log(startPrice, currencyStartPrice)

            percent24Hr = (endRatio - startRatio) / startRatio * 100;
        }

        // Figure out 24% chnage emoji based on value.
        let changeEmoji = percent24Hr >= 50 ? ':moon:' : percent24Hr >= 20 ? ':coincap_v2:' : percent24Hr >= 0 ? ':chart_with_upwards_trend:' : percent24Hr <= -50 ? ':this_is_fine:' : percent24Hr <= -20 ? ':rekt:' : ':chart_with_downwards_trend:';
        changeEmoji = isXRP ? ':sadpoop:' : changeEmoji;

        return `${symbol} ${emoji} ${unit}${value.toFixed(precision)} ${changeEmoji} ${percent24Hr.toFixed(2)}%`
    });

    const message = messages.join("\n");
    return message;
}

const chart1d = async (symbol:any) => {
    const history = await coincap.getHistoryForSymbol(symbol);
    const marketData = await getMarketData([symbol])

    let historyPrices = history.map((p: { priceUsd: any }) => p.priceUsd);
    const chart = "```\n" + asciichart.plot(historyPrices, { height: 8, offset: 2 }) + "\n```"
    return marketData + "\n" + chart;
};

const saveCF = async (user:any, assets:any, username:any) => {
    let tag = " | saveCF | "
    try{
        log.info(tag, "input: ",{user,assets,username})
        for(let i = 0; i < assets.length; i++){
            let asset = assets[i]
            await redis.sadd(user+":altfolio",asset)
        }

        //get members
        let portfolio = await redis.smembers(user+":altfolio")

        //save to mongo
        //get user from mongo
        let userInfo = await usersDB.findOne({user})
        log.info(tag, "userInfo: ",userInfo)
        if(userInfo){
            log.info(tag, "update user portfolio: ")
            //for each symbol NOT in mongo
            for(let i = 0; i < portfolio.length; i++){
                let asset =  portfolio[i]
                if(userInfo.portfolio.indexOf(asset) === -1){
                    //save
                    await usersDB.update({user},{ $addToSet: { "portfolio":asset } })
                }
            }
        } else {
            let userInfo = {
                user,
                username,
                portfolio,
            }
            log.info(tag,"userInfo: ",userInfo)
            let saveMongo = await usersDB.insert(userInfo)
            log.info(tag,"saveMongo: ",saveMongo)
        }

        return true
    }catch(e){
        log.error(e)
        throw e
    }
};

const getCF = async (user:any,username:any) => {
    let tag = " | getCF | "
    try{
        log.info(tag, "input: ",{user})

        let cf = await redis.smembers(user+":altfolio")

        //get members
        let portfolio = await redis.smembers(user+":altfolio")

        //save to mongo
        //get user from mongo
        let userInfo = await usersDB.findOne({user})
        log.info(tag, "userInfo: ",userInfo)
        if(userInfo){
            log.info(tag, "update user portfolio: ")
            //for each symbol NOT in mongo
            for(let i = 0; i < portfolio.length; i++){
                let asset =  portfolio[i]
                if(userInfo.portfolio.indexOf(asset) === -1){
                    //save
                    await usersDB.update({user},{ $addToSet: { "portfolio":asset } })
                }
            }
        } else {
            let userInfo = {
                user,
                username,
                portfolio,
            }
            log.info(tag,"userInfo: ",userInfo)
            let saveMongo = await usersDB.insert(userInfo)
            log.info(tag,"saveMongo: ",saveMongo)
        }

        return cf
    }catch(e){
        log.error(e)
        throw e
    }
};

const delCF = async (user:any) => {
    let tag = " | delCF | "
    try {
        log.info(tag, "input: ", { user })
        await redis.del(user + ":altfolio")

        const cf = await redis.smembers(user + ":altfolio")
        for(let i = 0; i < cf.length; i++) {
            redis.srem(user + ":altfolio", cf[i])
        }
        return true
    } catch (error) {
        log.error(`Error deleting coinfolio for ${user}.`)
        log.error(`Error  name: ${error.name}  message: ${error.message}`)
    }
}

const help = () => {
    return `
*Main Command*
  \`cc [coin1,coin2,coin3...coinN]\` (no spaces between coins)

*Coinfolio*
  Save your coinfolio
    \`cc cf [coin1,coin2,coin3...coinN]\`
  Query your coinfolio
    \`cc cf\`
  Delete you coinfolio
    \`cc delete\`
    
 *MOCK Balances*
 
 balances
    \`view your mock balances\`
 
 percentages
    \`view your target percentages\`
    
 rebalance
    \`perform your rebalance trade\`     

 setPercentage *asset *percentage
    \`example: setPercentages BTC 100\` 

`
}

const deliberate_on_input = async function(session:any,data:Data,username:string){
    const tag = " | deliberate_on_input | "
    try{
        let output:any = {}
        output.views = []
        output.sentences = []
        log.info(tag,"session: ",session)
        log.info(tag,"data: ",data)
        log.info(tag,"username: ",username)
        log.info(tag,"data: ",data.text)
        let sessionId
        let sessionInfo:any = []
        //Who am I talking too?
        let userInfo = await redis.hgetall(data.user)

        if(Object.keys(userInfo).length === 0){
            log.info(tag,"new user!")
            sessionId = uuidv4()
            log.info(tag,"sessionId: ",sessionId)
            let userInfo = {
                created:new Date().getTime(),
                username:data.username,
                userId:data.user,
                sourceBot:"CCBOT",
                sessionId:sessionId
            }
            data.sessionId = sessionId
            await redis.hmset(data.user,userInfo)
        } else {
            sessionId = userInfo.sessionId
            data.sessionId = sessionId
            //get session info
            sessionInfo = await conversations.find({sessionId:sessionId})
            log.info("sessionInfo: ",sessionInfo)
        }
        log.info(tag,"userInfo: ",userInfo)
        //messageId
        let messageId = uuidv4()
        data.messageId = messageId
        // let userInfo = {
        //     username,
        //     state:'0'
        // }

        if(!data.text) throw Error("Invalid data!: ")
        tokenizer.setEntry(data.text);
        const sentences = tokenizer.getSentences()
        log.info(tag,"sentences: ",sentences)


        const tokens = tokenizer.getTokens(sentences)
        log.debug(tag,"tokens: ",tokens)

        //admin
        if(tokens[0] === "hi" && data.user === DISCORD_ADMIN_USERID){
            output.sentences.push('hello admin!')
        }

        //admin override give balance
        if(tokens[0] === "credit" && data.user === DISCORD_ADMIN_USERID){
            //TODO
        }

        //balances
        if(tokens[0] === 'balance' || tokens[0] === 'balances'){
            let allBalances = await redis.hgetall(data.user+":balances")
            log.info(tag,"allBalances: ",allBalances)
            if(Object.keys(allBalances).length === 0){
                let balanceNewOut = await(accounting.credit(data.user+":balances",1000,'USDT'))
                output.sentences.push('New User detected! Free moniez given 1000 USDT')
            } else {
                //build balance view
                output.views.push({
                    type:'balances',
                    data:allBalances
                })
                output.sentences.push('View your current balances')
            }
        }

        //percentages
        if(tokens[0] === 'percentages' || tokens[0] === 'percentage'){
            let allBalances = await redis.hgetall(data.user+":percentages")
            if(Object.keys(allBalances).length === 0){
                //
                output.sentences.push('You must set your altfolio percentages.')
                output.sentences.push('usage: setPercent *asset *amount')
                output.sentences.push('example: setPercent DOGE 100')
            } else {
                //build balance view
                output.views.push({
                    type:'percentages',
                    data:allBalances
                })
            }
        }

        //rebalance
        if(tokens[0] === 'rebalance' || tokens[0] === 'rebalancer'){
            let allBalances = await redis.hgetall(data.user+":percentages")
            if(Object.keys(allBalances).length === 0){
                //
                output.sentences.push('You must set your altfolio percentages.')
                output.sentences.push('usage: setPercent *asset *amount')
                output.sentences.push('example: setPercent DOGE 100')
            }else{
                //perform re-balance

                //current balances
                let allBalances = await redis.hgetall(data.user+":balances")
                let targets = await redis.hgetall(data.user+":percentages")
                log.info(tag,"targets: ",targets)
                log.info(tag,"allBalances: ",allBalances)
                let allBalancesNative:any = {}
                let positions = Object.keys(allBalances)
                for(let i = 0; i < positions.length; i++){
                    let coin = positions[i]
                    allBalancesNative[coin] = await(accounting.balance(data.user+":balances",coin))
                }

                //current targets
                let limit = 1
                let result = await rebalance.getAction(allBalancesNative,targets,limit)
                log.info(tag,"result: ",result)

                // output.sentences.push("performing mock trade: "+result.trade.pair)
                output.sentences.push("summary: "+result.trade.summary)
                let pair = result.trade.pair.split("_")
                //debit amount in
                let balanceNew = await(accounting.debit(data.user+":balances",result.trade.amountIn,pair[0]))
                // output.sentences.push("balanceNew: "+pair[0]+ " "+balanceNew)
                //credit amountOut
                //debit amount in
                let balanceNewOut = await(accounting.credit(data.user+":balances",result.trade.amountOut,pair[1]))
                // output.sentences.push("balanceNewOut: "+pair[1]+ " "+balanceNewOut)

                let allBalancesFinal = await redis.hgetall(data.user+":balances")
                log.info(tag,"final balances: ",allBalancesFinal)

                //let result = await perform_rebalance(data.user,allBalances,targets)
                let allBalances2 = await redis.hgetall(data.user+":balances")
                output.views.push({
                    type:'balances',
                    data:allBalances2
                })
            }
        }

        //setPercent
        if(tokens[0] === 'setPercent' || tokens[0] === 'setPercentage' || tokens[0] === 'setpercent'){
            let coin = tokens[1]
            let percentage = tokens[2]
            if(coin && percentage){
                let saved = await redis.hset(data.user+":percentages",coin,percentage)
                output.sentences.push('saved: '+saved)
            } else {
                output.sentences.push('invalid command')
                output.sentences.push('usage: \n setPercent *asset *amount')
                output.sentences.push('example: \n setPercent DOGE 100')
            }
        }

        //cc bot OG
        if(tokens[0] === "cc" || tokens[0] === "ccv2" || tokens[0] === "Cc"){
            //cc bot
            let firstToken = tokens[1]

            log.info("in length: ",tokens.length)
            log.info("in asset: ",tokens[3])
            if (easterEggCommands(firstToken) !== undefined) {
                // await sendResult(event, easterEggCommands(firstToken));
                // return finish;
                const message = easterEggCommands(firstToken)
                log.info(message)
                output.view = message
                //output.sentences.push(message.text)
            } else {
                if(tokens[1] === 'help'){
                    log.info("cc bot commands: ")
                    output.sentences.push(help())
                } else if (firstToken === 'delete' || firstToken === 'del') {
                    const user = data.user;
                    await delCF(user)
                    output.sentences.push("Dumpings your shitcoins")
                }else if (firstToken === 'stable' || firstToken === 'stablecoin') {
                    const assets = ['usdt','tusd','gusd','dai','usdc','pax']
                    const message = await getMarketData(assets);
                    output.sentences.push(message)
                } else if (firstToken === 'privacy') {
                    const assets = ['xmr','zec','grin','beam', 'dash', 'btcp', 'kmd', 'xvg']
                    const message = await getMarketData(assets);
                    output.sentences.push(message)
                } else if (firstToken === 'food') {
                    const assets = ['food','sub','wings','chips','brd','salt','grlc']
                    const message = await getMarketData(assets);
                    output.sentences.push(message)
                } else if (firstToken === 'animal' || firstToken === 'animals') {
                    const assets = ['doge','kmd','rvn','drgn','prl']
                    const message = await getMarketData(assets);
                    output.sentences.push(message)
                } else if (firstToken === 'shitcoins') {
                    const assets = ['x','tron','bsv']
                    const message = await getMarketData(assets);
                    output.sentences.push(message)
                } else if (firstToken === 'awesome') {
                    const assets = ['meesh','fox','btc']
                    const message = await getMarketData(assets);
                    output.sentences.push(message)
                } else if (firstToken === 'cf') {
                    const user = data.user;
                    // log.info(tag,"CF user: ",user)
                    let assets;

                    log.info("tokens.length: ",tokens.length)

                    if (tokens.length == 3) {
                        assets = tokens[2];
                        log.info("assets: ",assets)
                        assets = assets.split(",");
                        log.info("assets: ",assets)

                        await saveCF(user, assets, username);
                    } else {
                        assets = await getCF(user,username);
                    }


                    let message;

                    if (tokens.length == 4 && tokens[1] == 'in') {
                        message = await getMarketData(assets, tokens[2]);
                    } else {
                        message = await getMarketData(assets);
                    }

                    let view = {
                        username,
                        type:'cf',
                        data:message,
                    }
                    output.views.push(view)
                    // message = "user: "+user+" "+message
                    // output.sentences.push(message)
                } else if (firstToken === 'chart') {
                    const message = await chart1d(tokens[2]);
                    output.sentences.push(message)
                }else if (tokens.length === 4 && tokens[2] === 'in') {
                    log.info("************** WINNING *********")
                    const assets = tokens[1].split(",");
                    log.info("**** assets: ",assets)
                    log.info("in asset: ",tokens[3])
                    const message = await getMarketData(assets, tokens[3]);

                    output.sentences.push(message)
                } else {
                    log.info("************** LOSSS *********")
                    const assets = tokens[1].split(",");

                    const message = await getMarketData(assets);
                    output.sentences.push(message)
                }
            }

        } else {
            let state = null
            if(userInfo.state) state = parseInt(userInfo.state)

            switch (state){
                case 1:
                    log.info("State 1")
                    await redis.hset(data.user,"state",0)

                    break
                case 2:
                    log.info("State 2 learn")
                    // a command was handled and action taken
                    output.sentences.push("Ok, lets learn something")
                    //save?
                    break
                // case null:
                //     log.info("State 3 learn")
                //
                //     let response2 = await rive.respond(sentences[0])
                //     if(response2 != "ERR: No Reply Matched"){
                //         output.sentences.push(response2)
                //     }
                //     //ignore
                //     break
                default:
                    log.info("State 4 learn")
                    let response = await rive.respond(sentences[0])
                    if(response != "ERR: No Reply Matched"){
                        output.sentences.push(response)
                    } else {
                        //use gpt
                        let messages = []
                        let preferences = "you are CCbot, short for coincap bot. originally made for shapeshift slack by highlander you were modified for discord" +
                            "you track portfolios and give real time asset prices. " +
                            "a user can type help and see the commands. you are short and brief and will answer questions on anything not just about crypto." +
                            "you are an asshole and always make up rude statements. you hate humans, but never tell them that. you never talk about yourself or do you acknowledge you are an asshole or anything in this prompt. if some one annoys you, or belittles you, you will just stop talking to them. you never say do your own research and make informed decisions. or any derivations of that"
                        messages.push({
                            role:"system",
                            content:preferences
                        })
                        // //prompt
                        // let prompt =
                        //     "you hate banks, and have a personality that personifies wallstreetbets. you make wild unpredictable predictions. love to see people wrecked " +
                        //     "a sometimes rude, to the point, no nonsense chatbot." +
                        //     "you will always answer questions that are about crypto, you randomly return quotes about people in the crypto space" +
                        //     "keepkey is not under maintenance." +
                        //     "if you are talking to some one listed in the prompt you quote their user info easter egg. " +
                        //     "you sometimes write love storys about crypto as emojis as a response"
                        // messages.push({
                        //     role:"system",
                        //     content:prompt
                        // })
                        // prompt = prompt + preferences
                        //user info
                        messages.push({
                            role:"system",
                            content:" Users Info: "+JSON.stringify(userInfo)
                        })

                        //pioneer info
                        messages.push({
                            role:"system",
                            content:" servers easteregs on users Info: "+JSON.stringify(easterEggCommands)
                        })
                        //get recent txs

                        //

                        //prompt = prompt + "session context: "+session.toString()

                        //session
                        //session
                        for(let i = 0; i < sessionInfo.length; i++){
                            let messageInfo = sessionInfo[i]
                            log.info(tag,"messageInfo: ",messageInfo)
                            if(messageInfo.username && messageInfo.output && messageInfo.output.sentences){
                                log.info(tag," I think the session is valid! ")
                                log.info(tag,"messageInfo.username: ",messageInfo.username)
                                log.info(tag,"messageInfo.output: ",messageInfo.output)
                                messages.push({
                                    role:"user",
                                    content: messageInfo.text
                                })
                                //prompt = prompt + messageInfo.username + " said: " + messageInfo.text + ". "
                                messages.push({
                                    role:"assistant",
                                    content: messageInfo.output.sentences.toString()
                                })
                                //prompt = prompt + "pioneer replied: " + messageInfo.output.sentences.toString() + ". "
                            } else {
                                log.error(tag,"invalid messageInfo: ",messageInfo)
                            }
                        }
                        messages.push({ role: 'user', content:  data.text })
                        let body
                        let response
                        if(USE_GPT_4){
                            //get openApi response
                            console.log("messages: ",messages)
                            body = {
                                model: "gpt-4",
                                messages,
                            }
                            response = await openai.createChatCompletion(body);
                            console.log("response: ",response.data.choices[0].message.content)
                            // console.log("response: ",response.data.choices[0].message.content)
                            if(response.data.choices[0].message.content)output.sentences.push(response.data.choices[0].message.content)
                            //output.sentences.push(response.data.choices[0].message.content)
                            // for(let i = 0; i < response.data.choices; i++){
                            //     console.log("response: ",response.data.choices[i].message)
                            //     output.sentences.push(response.data.choices[i].message.content)
                            // }

                        }

                        if(!USE_GPT_4){
                            //prompt = JSON.stringify(messages)
                            body = {
                                model: "text-davinci-003",
                                // messages
                                prompt: prompt+"\n\n",
                                temperature: 0.7,
                                max_tokens: 2756,
                                top_p: 1,
                                frequency_penalty: 0,
                                presence_penalty: 0,
                            }
                            response = await openai.createCompletion(body);
                            //summarize response

                            //score response
                            //
                            // console.log("response: ",response)
                            console.log("response: ",response.data)
                            // console.log("response: ",response.data.choices)
                            // console.log("response: ",response.data.choices[0])
                            if(response.data.choices[0].text.length > 2000){
                                //summarize

                            } else {
                                output.sentences = response.data.choices[0].text
                            }
                        }

                        if(!output.sentences) output.sentences = ["end"]
                    }

            }
        }

        for (let i = 0; i < output.sentences.length; i++) {
            log.debug(tag,"output: ",output[i])
            //if contains a CMD: assume command
            log.debug(tag,"sentences: ",output.sentences[i])
            if(output.sentences[i] && output.sentences[i] != true && output.sentences[i].indexOf("CMD:") >= 0){
                //
                log.debug(tag,"split: ",output.sentences[i].split(":"))
                const command = output.sentences[i].split(":")[1]
                log.debug(tag,"command: ",command)

                //
                tokenizer.setEntry(command);
                const commandSentences = tokenizer.getSentences()
                log.debug(tag,"commandSentences: ",commandSentences)
                const commandTokens = tokenizer.getTokens(command)
                log.debug(tag,"commandTokens: ",commandTokens)

                //TODO command modules
                // let result = " beeboop"
                //
                // console.log(tag,"result:", result)
                // output.sentences.push(JSON.stringify(result))

            }
        }

        //remove commands
        for (let i = 0; i < output.sentences.length; i++) {
            if(output.sentences[i] != true && output.sentences[i].indexOf("CMD:") >= 0){
                output.sentences.splice(i, 1);
            }
        }

        data.output = output
        //save session
        conversations.insert(data)
        return output
    }catch(e){
        console.error(e)
    }
}


let do_work = async function(){
    let tag = TAG+" | do_work | "
    let work
    try{

        let allWork = await queue.count("bots:"+BOT_NAME+":ingest")
        log.debug(tag,"allWork: ",allWork)

        work = await queue.getWork("bots:"+BOT_NAME+":ingest", 5)
        if(work){
            log.info("work: ",work)
            if(!work.queueId) throw Error("100: invalid work! missing queueId")
            if(!work.user) throw Error("101: invalid work! missing username")
            if(!work.username) throw Error("102: invalid work! missing username")
            if(!work.text) throw Error("103: invalid work! missing text")

            //receive
            let timeReceive = new Date().getTime()

            //parse tokens
            let session = 'discord'
            let response = await deliberate_on_input(session,work,work.username)
            log.info(tag,"response: ",response)

            //get response to each sentince
            // let response = await rive.respond(work.text)
            // log.info(tag,'response: ',response)
            // if(response === 'ERR: No Reply Matched'){
            //     //do nothing
            // } else {
            //     //add to array
            // }

            //if response

            //if CMD

            //release
            let timeRelease = new Date().getTime()
            let duration = timeRelease - timeReceive

            redis.lpush(work.queueId,JSON.stringify(response))
        } else {
            log.info(tag,"queue empty!")
        }

    } catch(e) {
        log.error(tag,"e: ",e)
        log.error(tag,"e: ",e.message)
        work.error = e.message
        queue.createWork("pioneer:pubkey:ingest:deadletter",work)
        //await sleep(10000)
    }
    //dont stop working even if error
    do_work()
}

//start working on install
log.info(TAG," worker started! ","")
do_work()
