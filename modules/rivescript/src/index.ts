
const fs = require('fs')

const RiveScript = require('rivescript')
const bot = new RiveScript();

module.exports = {
    //save entire user history to file
    initialize:async function(){
        await bot.loadDirectory("./brain", loading_done, loading_error);
        return true
    },
    respond:function(input:any){
        bot.setUservar("local-user", "origMessage", input);
        return bot.reply("local-user", input);
    },
    //create
    create:function(trigger:any,response:any){
        return create_rive(trigger,response);
    },
    //read

    //update

    //destroy
}


/*****************************************
 // Primary
 //*****************************************/

var create_rive = async function (trigger:any,response:any) {
    var tag = " | get_response | "
    let debug = true
    try{
        //
        trigger = trigger.replace(".","")
        response = response.replace(".","")
        response = response.trim()
        let entry = ""
        if(debug) console.log(tag,"response: ",response)
        if(debug) console.log(tag,"response: ",response[0])
        if(response[0] == "@"){
            entry = "\n \n + "+trigger+" \n "+response
        }else{
            entry = "\n \n + "+trigger+" \n - "+response
        }



        fs.appendFile('./brain/begin.rive', entry, function (err:any) {});

        //restart brain

        await bot.loadDirectory("./brain", loading_done, loading_error);
        return true
    }catch(e){
        console.error(tag,"Error: ",e)
    }
}




//lib
function loading_done (batch_num:any) {
    let debug = false
    if(debug) console.log("Batch #" + batch_num + " has finished loading!");

    // Now the replies must be sorted!
    bot.sortReplies();

}

// It's good to catch errors too!
function loading_error (error:any) {
    throw Error("100: Error when loading files: " + error);
}
