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

const Accounting = require('@pioneer-platform/accounting')
const accounting = new Accounting(redis)

//mongo
let connection  = require("@pioneer-platform/default-mongo")
let discordIn = connection.get("discordIn");

const Tokenizer = require('sentence-tokenizer');
const tokenizer = new Tokenizer('reddit');

const { Client, Intents, MessageEmbed, BaseGuildEmojiManager } = require('discord.js');

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
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
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

const create_view = async function(view:any,message:any,data:any){
    let tag = TAG + " | create_view | "
    try{
        let output:any = {
            embeds:[]
        }
        switch(view.type) {
            case 'percentages':
                // code block
                let allFieldsPercentages:any = []
                let targets = Object.keys(view.data)
                for(let i = 0; i < targets.length; i++){
                    let coin = targets[i]
                    let entry = {
                        name:coin,
                        value:view.data[coin],
                        inline: true,
                        setColor: '#ff002b'
                    }
                    allFieldsPercentages.push(entry)
                }

                //view to discord
                const exampleEmbedPercent = new MessageEmbed()
                    .setColor("#0099ff")
                    .setAuthor(
                        'Your Target portfolio percentages'
                    )
                    .addFields(
                        allFieldsPercentages
                    )
                    .setTimestamp()
                    .setFooter("CoinCap", "https://iconape.com/wp-content/png_logo_vector/coincap.png");


                output.embeds.push(exampleEmbedPercent)
                break;
            case 'balances':
                // code block
                let allFields:any = []
                let coins = Object.keys(view.data)
                for(let i = 0; i < coins.length; i++){
                    let coin = coins[i]
                    //allFields[coin] = view.data[coin]
                    let entry = {
                        name:coin,
                        value:await accounting.balance(data.user+":balances",coin),
                        inline: true,
                        setColor: '#ff002b'
                    }
                    allFields.push(entry)
                }

                //view to discord
                const exampleEmbed = new MessageEmbed()
                    .setColor("#0099ff")
                    .setAuthor(
                        'Your Account Balances'
                    )
                    .addFields(
                        allFields
                    )
                    .setTimestamp()
                    .setFooter("CoinCap", "https://iconape.com/wp-content/png_logo_vector/coincap.png");


                output.embeds.push(exampleEmbed)
                break;
            case 'cf':
                // code block
                let allFields2:any = []
                log.info(tag,"view.data: ",view.data)
                let split = view.data.split('\n')
                log.info(tag,"split: ",split)

                const exampleEmbedHeader = new MessageEmbed()
                    .setColor("#0099ff")
                    .setAuthor(
                        data.username+" Altfolio"
                    )
                    .setTimestamp()
                    .setFooter("CoinCap", "https://iconape.com/wp-content/png_logo_vector/coincap.png");
                output.embeds.push(exampleEmbedHeader)

                let addData = []
                for(let i = 0; i < split.length; i++){
                    let coinData = split[i]
                    log.info(tag,"coinData: ",coinData)
                    let coin = coinData.split(' ')[0]

                    tokenizer.setEntry(coinData);
                    const sentences = tokenizer.getSentences()
                    log.info(tag,"sentences: ",sentences)
                    const tokens = tokenizer.getTokens(sentences)
                    log.info(tag,"tokens: ",tokens)

                    //lookup magic id
                    let emojiId = await message.guild.emojis.cache.find((emoji: { name: string; }) => emoji.name === coin);
                    log.info(tag,"emojiId: ",emojiId)

                    //
                    let emojiDiscord
                    if(emojiId){
                        emojiDiscord = "<:"+coin+":"+emojiId+">"
                    }
                    coinData = coinData.replace(coin,'')
                    let entry = {
                        name:emojiDiscord || coin,
                        value:coinData,
                        setColor: '#ff002b'
                    }
                    addData.push(entry)

                    const exampleEmbed = new MessageEmbed()
                        .setColor("#0099ff")
                        .setAuthor(
                            ""+coin.toUpperCase()+"",
                            "https://assets.coincap.io/assets/icons/"+coin+"@2x.png",
                            "https://coincap.io/assets/"+coin+""
                        )
                        .addFields(
                            { name: "Price", value: tokens[2], inline: true },
                            { name: "Change", value: tokens[3]+" "+tokens[4], inline: true, setColor: '#0099ff' },
                        )
                    output.embeds.push(exampleEmbed)
                }
                break;
            default:
            // code block
        }

        return output
    }catch(e){
        log.error(e)
    }
}

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
                let responses = JSON.parse(response[1])
                log.info(tag," responses: ",responses)
                log.info(tag," responses: ",typeof(responses))

                //if text based

            }
        }

        //ccBot
        //filter by server

        //filter by channel



        if(message.channel.name === discordChannel){

            log.info(tag," correct channel: ",discordChannel)
            // log.info("message: ",JSON.stringify(message))
            log.info("user: ",message.author.id)
            log.info("channel: ",message.channel.name)
            log.info("content: ",message.content)

            //if valid
            if(message.content && message.author.id){

                //publish
                queue.createWork("bots:ccbot:ingest",data)

                //get response from ccBot
                let response = await redisQueue.blpop(data.queueId, TIMEOUT_BOT_RESPONSE)
                if(!response[1]) throw Error('invalid response from ccbot!')
                let responses = JSON.parse(response[1])
                if(responses){
                    log.info(tag," responses: ",responses)
                    log.info(tag," responses: ",typeof(responses))

                    //if views
                    let embeds = []
                    for(let i = 0; i < responses.views.length; i++){
                        let view = responses.views[i]

                        //create embed
                        let output = await create_view(view,message,data)
                        for(let j = 0; j < output.embeds.length; j++){
                            let embed = output.embeds[j]
                            embeds.push(embed)
                        }

                    }

                    //if sentences

                    if(embeds.length > 0){
                        message.channel.send({ embeds });
                    }

                }
            }
        }

        return
    } catch (e) {
        console.error('e', e)
        throw e
    }
})

