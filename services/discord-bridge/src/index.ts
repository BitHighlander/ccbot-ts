/*
    Discord bridge

    This bridge contains all the discord logic

    No bot logic

    Multi-plex for multiple bots and channels

 */
let TAG = ' | discord-bridge | '
require('dotenv').config()
require('dotenv').config({path:"./.env"})
require('dotenv').config({path:"./../.env"})
require('dotenv').config({path:"./../../.env"})
require('dotenv').config({path:"./../../.env"})
require('dotenv').config({path:"../../../.env"})
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

const { Client, Intents, EmbedBuilder, GatewayIntentBits } = require('discord.js');
if(!EmbedBuilder) throw Error("Discord.js API changed!")
if(!Client) throw Error("Discord.js API changed!")

let CC_NERF:any = process.env['CC_NERF']
CC_NERF = true
if(CC_NERF)log.info(" CC_NERFed!")

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
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions
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
                const exampleEmbedPercent = new EmbedBuilder()
                    .setColor("#0099ff")
                    // .setAuthor(
                    //     'Your Target portfolio percentages'
                    // )
                    .setAuthor({ name: 'Your Target portfolio percentages', iconURL: "", url: "" })
                    .addFields(
                        allFieldsPercentages
                    )
                    .setTimestamp()
                    .setFooter({ text: "CoinCap", iconURL: "https://iconape.com/wp-content/png_logo_vector/coincap.png" });

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
                const exampleEmbed = new EmbedBuilder()
                    .setColor("#0099ff")
                    // .setAuthor(
                    //     'Your Account Balances'
                    // )
                    .setAuthor({ name: 'Your Account Balances', iconURL: "", url: "" })
                    .addFields(
                        allFields
                    )
                    .setTimestamp()
                    .setFooter({ text: "CoinCap", iconURL: "https://iconape.com/wp-content/png_logo_vector/coincap.png" })

                output.embeds.push(exampleEmbed)
                break;
            case 'cf':
                // code block
                let allFields2:any = []
                log.info(tag,"view.data: ",view.data)
                let split = view.data.split('\n')
                log.info(tag,"split: ",split)

                const exampleEmbedHeader = new EmbedBuilder()
                    .setColor("#0099ff")
                    .setAuthor({ name: data.username+" Altfolio", iconURL: 'https://www.iconpacks.net/icons/1/free-pie-chart-icon-683-thumb.png', url: 'https://coincap.io' })
                    // .setAuthor(
                    //     data.username+" Altfolio"
                    // )
                    .setTimestamp()
                    // .setFooter("CoinCap", "https://iconape.com/wp-content/png_logo_vector/coincap.png");
                    .setFooter({ text: "CoinCap", iconURL: "https://iconape.com/wp-content/png_logo_vector/coincap.png" });
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

                    const exampleEmbed = new EmbedBuilder()
                        .setColor("#0099ff")
                        .setAuthor({ name: ""+coin.toUpperCase()+"", iconURL: "https://assets.coincap.io/assets/icons/"+coin+"@2x.png", url: "https://coincap.io/assets/"+coin+"" })
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


// bot.on('messageCreate', async function (message:any) {
//     let tag = " | discord message | "
//     try {
//         log.info(tag,"message: ",JSON.stringify(message))
//         log.info(tag,"message: ",message.toString())
//         log.info(tag,"message: ",message)
//         log.info(tag,"message: ",Object.keys(message))
//         log.info(tag,"user: ",message.author.id)
//         log.info(tag,"channel: ",message.channel.name)
//         log.info(tag,"content: ",message.content)
//         log.info(tag,"attachments: ",message.attachments)
//         log.info(tag,"reactions: ",message.reactions)
//
//         return
//     } catch (e) {
//         console.error('e', e)
//         throw e
//     }
// })

bot.on('messageCreate', async function (message:any) {
    let tag = " | discord message | "
    try {
        log.info(tag,"message: ",JSON.stringify(message))
        log.info(tag,"message: ",message.toString())
        log.info(tag,"user: ",message.author.id)
        log.info(tag,"channel: ",message.channel.name)
        log.info(tag,"content: ",message.content)

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
            channel:message.channelId,
            user:message.author.id,
            username:message.author.username,
            text:message.cleanContent
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
                if(response && response[0] && !response[1]) throw Error('invalid response from ccbot!')
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
            log.info(tag,"user: ",message.author.id)
            log.info(tag,"channel: ",message.channel.name)
            log.info(tag,"content: ",message.content)
            log.info(tag,"cleanContent: ",message.cleanContent)

            //if valid
            if(message.cleanContent && message.author.id){

                //publish
                queue.createWork("bots:ccbot:ingest",data)

                //get response from ccBot
                let response = await redisQueue.blpop(data.queueId, TIMEOUT_BOT_RESPONSE)
                log.info(tag," response: ",response)
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
                        log.info("message: ",embeds)
                        let output = await create_view(view,message,data)
                        for(let j = 0; j < output.embeds.length; j++){
                            let embed = output.embeds[j]
                            embeds.push(embed)
                        }

                    }

                    //if sentences
                    log.info("message: ",embeds)
                    if(embeds.length > 0){
                        log.info("sending message: ",embeds)
                        if(!CC_NERF) message.channel.send({ embeds });
                    }
                    if(responses.sentences.length > 0){
                        log.info("sending message: ",embeds)
                        if(!CC_NERF) message.channel.send(responses.sentences.join("\n"));
                    }
                }
            } else {
                log.error(tag,"invalid message! ",message)
                log.error(tag,"cleanContent: ",message.cleanContent)
            }
        }

        return
    } catch (e) {
        console.error('e', e)
        throw e
    }
})

