/*
      update tx's by address worker

      Start

 */
let TAG = ' | discord-bridge | '
require('dotenv').config()
require('dotenv').config({path:"../../../.env"})
require('dotenv').config({path:"./../../.env"})
require('dotenv').config({path:"../../../../.env"})

let log = require("@pioneer-platform/loggerdog")()
let queue = require("@pioneer-platform/redis-queue")
const {redis,subscriber,publisher, redisQueue} = require("@pioneer-platform/default-redis")
import {v4 as uuidv4} from 'uuid';

//mongo
let connection  = require("@pioneer-platform/default-mongo")
let discordIn = connection.get("discordIn");

const { Client, Intents } = require('discord.js');

interface Data {
    queueId:string
    admin:boolean
    dm:boolean
    user:string
    username:string
    channel:string
    text:string
}

/*
  | 'GUILDS'
  | 'GUILD_MEMBERS'
  | 'GUILD_BANS'
  | 'GUILD_EMOJIS_AND_STICKERS'
  | 'GUILD_INTEGRATIONS'
  | 'GUILD_WEBHOOKS'
  | 'GUILD_INVITES'
  | 'GUILD_VOICE_STATES'
  | 'GUILD_PRESENCES'
  | 'GUILD_MESSAGES'
  | 'GUILD_MESSAGE_REACTIONS'
  | 'GUILD_MESSAGE_TYPING'
  | 'DIRECT_MESSAGES'
  | 'DIRECT_MESSAGE_REACTIONS'
  | 'DIRECT_MESSAGE_TYPING';
 */

const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_INTEGRATIONS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MESSAGE_TYPING
    ] ,
    partials:[
        'CHANNEL'
    ]
});

let discordChannel = process.env['DISCORD_BOT_CHANNEL']
if(!discordChannel) throw Error("DISCORD_BOT_CHANNEL env required! ")

let DISCORD_ADMIN_USERID = process.env['DISCORD_ADMIN_USERID']
if(!DISCORD_ADMIN_USERID) log.error(" no admins configured! ")

let TIMEOUT_BOT_RESPONSE = process.env['TIMEOUT_BOT_RESPONSE'] || 5

let msg:any
if(!process.env['DISCORD_BOT_TOKEN']) throw Error("env DISCORD_BOT_TOKEN required!")
bot.login(process.env['DISCORD_BOT_TOKEN']);

let BOT_USER:any
bot.on('ready', () => {
    console.info(`Logged in as ${bot.user.tag}!`);
    log.info("bot.user: ",bot.user)
    BOT_USER = bot.user.id
});

bot.on('messageCreate', async function (message:any) {
    let tag = " | discord message | "
    try {
        // log.info("message: ",JSON.stringify(message))
        // log.info("user: ",message.author.id)
        // log.info("channel: ",message.channel.name)
        // log.info("content: ",message.content)

        let admin = false
        let dm = false
        //detect admin
        if(message.author.id === DISCORD_ADMIN_USERID){
            log.info(tag,"Detected ADMIN")
            admin = true
        }

        //payload
        let data:Data = {
            queueId:uuidv4(),
            admin,
            dm,
            channel:message.channel.name,
            user:message.author.id,
            username:message.author.username,
            text:message.content
        }

        if(!message.channel.name && message.channel.type === 'DM'){
            log.info("channel: ",message)
            log.info("user: ",message.author.id)
            log.info("channel: ",message.channel.name)
            log.info("content: ",message.content)

            log.info(tag,"Detected DM")
            dm = true

            //if message is NOT ccbot
            if(message.author.id !== BOT_USER){
                log.info(tag," publishing to ccBot")
                //publish
                queue.createWork("bots:ccbot:ingest",data)

                //get response from ccBot
                let response = await redisQueue.blpop(data.queueId, TIMEOUT_BOT_RESPONSE)
                if(!response[1]) throw Error('invalid response from ccbot!')
                response = JSON.parse(response[1])
                log.info(tag," response: ",response)
                log.info(tag," response: ",typeof(response))
                log.info(tag," response: ",response.text.toString())
                log.info(tag," response: ",response.text.toString())

                //if text based


                message.channel.send(response.text.toString());
            }
        }

        //ccBot
        //filter by server

        //filter by channel



        if(message.channel.name === discordChannel){


        }

        return
    } catch (e) {
        console.error('e', e)
        throw e
    }
})

