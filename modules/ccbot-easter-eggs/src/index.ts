const staticCommands = {
    sean: {
        attachments: [
            {
                fallback: "sean",
                image_url:
                    "https://i.imgur.com/5Hyqagp.png",
            },
        ],
    },
    tyler: {
        attachments: [
            {
                fallback: "tyler",
                image_url: "https://i.imgur.com/hmrxXbp.png",
            },
        ],
    },
    november: {
        attachments: [
            {
                fallback: "november",
                image_url:
                    "https://imgur.com/0YDMjC3",
            },
        ],
    },
    al: {
        attachments: [
            {
                fallback: "al",
                image_url:
                    "https://imgur.com/y1ZYlx5",
            },
        ],
    },
    mills: {
        attachments: [
            {
                fallback: "mills",
                image_url:
                    "https://imgur.com/UL1Z6Sn",
            },
        ],
    },
    prism: {
        text: ":rip: :prism: :cry:",
    },
    cc: {
        text: ":coincap: :killitwithfire:",
    },
    binance: {
        text: "funds are safu :binance:",
    },
    jon: {
        attachments: [
            {
                fallback: "jon",
                image_url:
                    "https://media4.giphy.com/media/tPKoWQJk3cEbC/giphy.gif?cid=ecf05e47lij77ogbkxs6xjhbkw4yakky3rr84once3us7cu6&rid=giphy.gif&ct=g",
            },
        ],
    },
    greg: {
        attachments: [
            {
                fallback: "greg",
                image_url: "https://media.giphy.com/media/b6iVj3IM54Abm/giphy.gif",
            },
        ],
    },
    perklin: {
        attachments: [
            {
                fallback: "perklin",
                image_url: "https://imgur.com/1Xcz1Yq.jpg",
            },
        ],
    },
    ben: {
        attachments: [
            {
                fallback: "ben",
                image_url:
                    "https://i.imgur.com/4PxxloQ.png",
            },
        ],
    },
    internetmoney: {
        attachments: [
            {
                fallback: "internetmoney",
                image_url:
                    "https://i.imgur.com/ahc68Vt.png",
            },
        ],
    },
    runemoney: {
        attachments: [
            {
                fallback: "runemoney",
                image_url:
                    "https://i.imgur.com/BGjSyhL.png",
            },
        ],
    },
    beorn: {
        attachments: [
            {
                fallback: "beorn",
                image_url:
                    "https://imgur.com/mndxQp6",
            },
        ],
    },
    moon: {
        attachments: [
            {
                fallback: "moon",
                image_url:
                    "https://media0.giphy.com/media/jQWJUET9SPFxRINeMP/giphy.gif?cid=ecf05e47398f523b3187787f3246dc6fbd270877234a5427&rid=giphy.gif",
            },
        ],
    },
    beard: {
        attachments: [
            {
                fallback: "beard",
                image_url: "https://i.imgflip.com/40afm5.jpg",
                author_name: "beard",
                author_icon:
                    "https://i.imgur.com/y00z33Y.jpg",
                footer: "Don't be salty...",
            },
        ],
    },
    moonmaths: {
        attachments: [
            {
                fallback: "moonmaths",
                image_url:
                    "https://i.imgur.com/RYTl0Px.jpg",
            },
        ],
    },
};
// Since there's not an easy way to tell normal commands from users, here's a
// small handful of awesome peeps.
//
// Add yourself, add your friends, cuz they be praisin' errybody!
const rockstars = [
    "adam",
    "beorn",
    "brett",
    "corin",
    "doktorbold",
    "drew",
    "ellie",
    "heywill",
    "hotoatmeal",
    "hoff",
    "jcash",
    "mperklin",
    "sean",
    "smc",
    "tarnhelm",
    "wintermute",
    "stoner",
];

let commands = function (command:string) {
    const motivation = [
        { text: `Great job ${command}, you're doing awesome things!` },
        { text: `Way to go ${command}!` },
        { text: `${command}, I'm so proud of you!` },
        { text: `${command}, having you on this team makes a huge difference.` },
        { text: `${command}, I love your great attitude even during this tough phase.`, },
        { text: `${command}, I just want to let you know how much you mean to the team.`, },
        { text: `${command}, you are one of the most reliable friends I've ever had. I believe in you. Like a robot does. 'Cause robots have feelings too.`, },
        { text: `We can't do this without you, ${command}! You're the best.` },
        { text: `Be like Satoshi. HODL them keys, ${command}` },
        { text: `Fantastic work, ${command}!` },
        { text: `Hal Finney died for this. Be his best legacy, ${command}` },
        { text: `hotoatmeal sucks at Harry Potter trivia. Yes, Grace made him write this.`, },
        { text: `Wassa wasssa wasssupppppppp ${command}??!` },
        { text: `HODL strong, ${command}!` },
        { text: `hotoatmeal <3's you, ${command}` },
        { text: `Help help! ${command}, I'm trapped in a universe factory!` },
        { text: `End the FED!` },
        { text: `Be a :fox:. Be like ${command}.` },
    ];

    if (rockstars.includes(command) && Math.random() >= 0.5)
        return motivation[Math.floor(Math.random() * motivation.length)];

    // @ts-ignore
    if (staticCommands[command] !== undefined) return staticCommands[command];

    if (rockstars.includes(command))
        return motivation[Math.floor(Math.random() * motivation.length)];

    return undefined;
};

module.exports = commands;
