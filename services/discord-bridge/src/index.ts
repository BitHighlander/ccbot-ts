/*
      update tx's by address worker

      Start

 */
require('dotenv').config()
require('dotenv').config({path:"../../../.env"})
require('dotenv').config({path:"./../../.env"})
require('dotenv').config({path:"../../../../.env"})

let log = require("@pioneer-platform/loggerdog")()
const {redis,subscriber,publisher} = require("@pioneer-platform/default-redis")

//mongo
let connection  = require("@pioneer-platform/default-mongo")
let discordIn = connection.get("discordIn");

const { Client, Intents } = require('discord.js');
const bot = new Client({ intents: [Intents.FLAGS.GUILDS] });

let discordChannel = process.env['DISCORD_BOT_CHANNEL']
if(!discordChannel) throw Error("DISCORD_BOT_CHANNEL env required! ")

let DISCORD_ADMIN_USERID = process.env['DISCORD_ADMIN_USERID']
if(!DISCORD_ADMIN_USERID) log.error(" no admins configured! ")

let msg:any
if(!process.env['DISCORD_BOT_TOKEN']) throw Error("env DISCORD_BOT_TOKEN required!")
bot.login(process.env['DISCORD_BOT_TOKEN']);

bot.on('ready', () => {
    console.info(`Logged in as ${bot.user.tag}!`);
});

bot.on('message', async function (message:any) {
    let tag = " | discord message | "
    try {
        log.info("message: ",message)
        // log.info("user: ",message.author.id)
        // log.info("channel: ",message.channel.name)
        // log.info("content: ",message.content)

        return
    } catch (e) {
        console.error('e', e)
        throw e
    }
})
