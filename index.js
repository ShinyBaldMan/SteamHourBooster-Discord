const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const Discord = require('discord.js');

let mongoose = require('mongoose');

const discordclient = new Discord.Client();

let allSteamApps;

let axios = require('axios');
// schema for mongodb
let accountSchema = require('./schemas/accountSchema.js');
let keySchema = require('./schemas/keySchema.js');

async function connectDatabase(){
    return mongoose.connect("mongodb://localhost:27017/hourboosting", {useUnifiedTopology: true, useNewUrlParser: true});
}
connectDatabase();
mongoose.connection.on("connected", err=>{
    if(err) throw "DB ERROR! : " + err;
  
    console.log(dateLog() + "Connected to DB!");

});

let visibleStatus = {};
let acceptFriendsStatus = {};

let embedColor = "#cf000f";

const config = require('./config.json');
discordclient.login(config.discordToken);
discordclient.on('ready', async () => {
    console.log(dateLog() + `Logged in to Discord as ${discordclient.user.tag}!`);
    setTimeout(() => {
        getAllSteamApps(response=>{
            allSteamApps = response;
            console.log(dateLog() + "Loaded all steam apps.")           
        })
    }, 2000);
});

mongoose.set('useCreateIndex', true);
// Steam User

let onlineAccounts = {};
let hourIntervals = {};

discordclient.on('message', async msg => {    
   // discord message event
    if (msg.channel.type == "dm") {
        
        if(msg.content.startsWith("!addaccount")){
            let details = msg.content.replace('!addaccount', '').trim().split(/[ ,]+/);

           if(details.length >= 2){
                let newAccount;

                let client = new SteamUser();
               
                let logOnOptions = {
                    accountName: details[0],
                    password: details[1]
                };
                
                // steam login
                client.logOn(logOnOptions);
                client.on('error', function(err){
                   if(err.eresult == 5){
                    const embedMessage = new Discord.MessageEmbed()
                    .setColor(embedColor)
                    .setTitle('Cannot Login')
                    .setDescription(`Invalid account details, cannot login.`)
                    .setTimestamp()

                    return sendMessage(msg.author.id, embedMessage);
                   }
                    
                })
                client.on('steamGuard', function(domain, callback) {
                    client.logOff();    
                    if(details[2]){
                        newAccount = new accountSchema({
                            username: details[0],
                            password: details[1],
                            ownerDiscordID: msg.author.id,
                            sharedSecret: details[2]
                        })
                    }else{
                        newAccount = new accountSchema({
                            username: details[0],
                            password: details[1],
                            ownerDiscordID: msg.author.id,
                            sharedSecret: ""
                        })
                    }
                    
    
                    newAccount.save(err=>{
                        if(!err){
                            const embedMessage = new Discord.MessageEmbed()
                                .setColor(embedColor)
                                .setTitle('Account Saved!')
                                .setDescription(`Account successfully saved with ${details[0]} username.`)
                                .setTimestamp()
    
                            return sendMessage(msg.author.id, embedMessage);
    
                        }else{
                            const embedMessage = new Discord.MessageEmbed()
                                .setColor(embedColor)
                                .setTitle('Account Could Not Be Saved!')
                                .setDescription(`:x: ${details[0]} username is already exists, could not be saved.`)
                                .setTimestamp()
                            return sendMessage(msg.author.id, embedMessage)
                        }
                    })         
                });
                client.on('loggedOn', (detailsx, parental) => {
                    client.logOff();
                    if(details[2]){
                        newAccount = new accountSchema({
                            username: details[0],
                            password: details[1],
                            ownerDiscordID: msg.author.id,
                            sharedSecret: details[2]
                        })
                    }else{
                        newAccount = new accountSchema({
                            username: details[0],
                            password: details[1],
                            ownerDiscordID: msg.author.id,
                            sharedSecret: ""
                        })
                    }
                    
    
                    newAccount.save(err=>{
                        if(!err){
                            const embedMessage = new Discord.MessageEmbed()
                                .setColor(embedColor)
                                .setTitle('Account Saved!')
                                .setDescription(`Account successfully saved with ${details[0]} username.`)
                                .setTimestamp()
    
                            return sendMessage(msg.author.id, embedMessage);
    
                        }else{
                            const embedMessage = new Discord.MessageEmbed()
                                .setColor(embedColor)
                                .setTitle('Account Could Not Be Saved!')
                                .setDescription(`:x: ${details[0]} username is already exists, could not be saved.`)
                                .setTimestamp()
                            return sendMessage(msg.author.id, embedMessage)
                        }
                    })
                })

                
           }else{
            const embedMessage = new Discord.MessageEmbed()
            .setColor(embedColor)
            .setTitle('Warning!')
            .setDescription(`:information_source: Usage: !addaccount [login] [pass] [shared secret or blank].`)
            .setTimestamp()
        return sendMessage(msg.author.id, embedMessage);
           }
        }
        
        else if(msg.content.startsWith("!start")){
			// parsing message spaces to array one by one
            let details = msg.content.replace('!start', '').trim().split(/[ ]+/);
            
            if(details[2] && details[3] || !details[3] && details[2]){
                let licenseKey;
                if(details[2] && details[3]){
                    licenseKey = details[3];
                }
                if(!details[3] && details[2]){
                    licenseKey = details[2];
                }
                keySchema.findOne({key: licenseKey}, (err2,res2)=>{
                    if(!err2 && res2){
                        if(res2.maxAccounts > res2.accountsOnline.length){
                            
                            if(details[0]){
                                if(Number(res2.hoursLeft) > 0){
                                    if(!res2.accountsOnline.includes(details[0])){
                                        accountSchema.findOne({username: details[0]}, (err, res)=>{
                                    
                                   
                                            let appidinfo = details[1];
                                            let appids = details[1].split(',');
                                                        let allappids = [];
                                                        appids.forEach(id=>{
                                                            allappids.push(Number(id));
                                                        })

                                                        if(allappids.length > res2.maxGames){
                                                            const embedMessage = new Discord.MessageEmbed()
                                                                        .setColor(embedColor)
                                                                        .setTitle('Max App Limit')
                                                                        .setDescription(`:x: This key has ${res2.maxGames} game limit at once, you cannot exceed that.`)
                                                                        .setTimestamp()
                                                                    return sendMessage(msg.author.id, embedMessage);      
                                                        }
                                            if(res && res.ownerDiscordID == msg.author.id){
                                                if(onlineAccounts[res.username]){
                                                    const embedMessage = new Discord.MessageEmbed()
                                                                        .setColor(embedColor)
                                                                        .setTitle('Account Already Online!')
                                                                        .setDescription(`:x: Account with ${res.username} is already idling, use !stop ${res.username} for stopping it.`)
                                                                        .setTimestamp()
                                                                    return sendMessage(msg.author.id, embedMessage);      
                                                }else{
                                                        
                                                        let client = new SteamUser();
                                                        onlineAccounts[res.username] = client;
                                                        
                                                        let logOnOptions;
                                                        if(res.sharedSecret){
                                                            logOnOptions = {
                                                                accountName: res.username,
                                                                password: res.password,
                                                                twoFactorCode: SteamTotp.generateAuthCode(res.sharedSecret)
                                                            };
                                                        }else{
															if(!details[3] && details[2]){
																logOnOptions = {
                                                                accountName: res.username,
                                                                password: res.password
                                                                
																};
															}else{
																logOnOptions = {
																	accountName: res.username,
																	password: res.password,
																	twoFactorCode: details[2]
																};
															}
                                                            
                                                        }
                                                        
                                                        client.logOn(logOnOptions);
                                                        client.on('error', function(err){
                                                            if(err.eresult == 5){
                                                             const embedMessage = new Discord.MessageEmbed()
                                                             .setColor(embedColor)
                                                             .setTitle('Cannot Login')
                                                             .setDescription(`Invalid account details, cannot login.`)
                                                             .setTimestamp()
                                         
                                                             return sendMessage(msg.author.id, embedMessage);
                                                            }
                                                            else if(err.eresult == 6){
                                                                client.logOff();
                                                                if(onlineAccounts[res.username]){           
                                                                    delete onlineAccounts[res.username];
                                                                }
                                                                if(hourIntervals[res.username]){
                                                                    clearInterval(hourIntervals[res.username]);
                                                                    delete hourIntervals[res.username];
                                                                }
                                                                keySchema.find((err,resz)=>{
                                                                    if(resz){
                                                                        resz.forEach(data=>{
                                                                            data.accountsOnline.forEach(account=>{
                                                                                if(account == res.username){                                     
                                                                                    data.accountsOnline = data.accountsOnline.filter(veri=> veri !== res.username)
                                                                                    data.markModified('accountsOnline');
                                                                                    data.save();
                                                                                }
                                                                            })
                                                                        })
                                                                    }
                                                                })

                                                                const embedMessage = new Discord.MessageEmbed()
                                                                    .setColor(embedColor)
                                                                    .setTitle('Error at Account')
                                                                    .setDescription(`Logged in to account else where, idling stopped.`)
                                                                    .setTimestamp()
                                                
                                                                return sendMessage(msg.author.id, embedMessage);
                                                            }else{
                                                                client.logOff();
                                                                if(onlineAccounts[res.username]){           
                                                                    delete onlineAccounts[res.username];
                                                                }
                                                                if(hourIntervals[res.username]){
                                                                    clearInterval(hourIntervals[res.username]);
                                                                    delete hourIntervals[res.username];
                                                                }
                                                                keySchema.find((err,resz)=>{
                                                                    if(resz){
                                                                        resz.forEach(data=>{
                                                                            data.accountsOnline.forEach(account=>{
                                                                                if(account == res.username){                                     
                                                                                    data.accountsOnline = data.accountsOnline.filter(veri=> veri !== res.username)
                                                                                    data.markModified('accountsOnline');
                                                                                    data.save();
                                                                                }
                                                                            })
                                                                        })
                                                                    }
                                                                })

                                                                const embedMessage = new Discord.MessageEmbed()
                                                                    .setColor(embedColor)
                                                                    .setTitle('Error at Account')
                                                                    .setDescription(`An error occurred on your account with ${res.username} username, logged off.`)
                                                                    .setTimestamp()
                                                
                                                                return sendMessage(msg.author.id, embedMessage);
                                                            }
                                                             
                                                        })
                                                        client.on('steamGuard', function(domain, callback) {
                                                            client.logOff();       
                                                            delete onlineAccounts[res.username];
                                                            const embedMessage = new Discord.MessageEmbed()
                                                                .setColor(embedColor)
                                                                .setTitle('Steam Guard Error!')
                                                                .setDescription(`:x: Logged off from ${res.username}, you should provide steam guard code with !start command.`)
                                                                .setTimestamp()
                                                            return sendMessage(msg.author.id, embedMessage);                
                                                        });
                                                        
                                                        if(acceptFriendsStatus[msg.author.id]=="on"){
                                                            client.on('friendRelationship', function(sid, relationship){
                                                                if(relationship == SteamUser.EFriendRelationship.RequestRecipient){
                                                                    
                                                                    client.addFriend(sid, function(err, name){
                                                                        if(err){
                                                                            return;
                                                                        }    
                                                                    });
                                                                }
                                                            });
                                                        }

                                                        client.on('loggedOn', (detailsx, parental) => {
                                                            res2.accountsOnline.push(res.username);
                                                            res2.markModified('accountsOnline');
                                                            res2.save();

                                                            if(visibleStatus[msg.author.id] == "invisible"){
                                                                client.setPersona(SteamUser.EPersonaState.Invisible);
                                                            }else{
                                                                client.setPersona(SteamUser.EPersonaState.Online);
                                                            }

                                                         
                                                            
                                                            
                                                            setTimeout(function(){
                                                                
                                                                client.gamesPlayed(allappids);
                                                                const embedMessage = new Discord.MessageEmbed()
                                                                    .setColor(embedColor)
                                                                    .setTitle('Idling Started!')
                                                                    .setDescription(`:white_check_mark: Idling started with app id(s) ${appidinfo}.`)
                                                                    .setTimestamp()
                        
                                                                sendMessage(msg.author.id, embedMessage);

                                                                hourIntervals[res.username] = setInterval(async () => {
                                                                    await hourInterval(licenseKey);
                                                                    await getHours(licenseKey, (left)=>{
                                                                        
                                                                        if(Number(left) <= 0){
                                                                            onlineAccounts[res.username].logOff();
                                                                            delete onlineAccounts[res.username];
                                                                            if(hourIntervals[res.username]){
                                                                                clearInterval(hourIntervals[res.username]);
                                                                                delete hourIntervals[res.username];
                                                                            }
                                                                            const embedMessage = new Discord.MessageEmbed()
                                                                                .setColor(embedColor)
                                                                                .setTitle('Idling Process Done!')
                                                                                .setDescription(`:x: Logged off from ${res.username} due to expiry of the hour limit. You can buy another key with contacting us via !contact.`)
                                                                                .setTimestamp()
                                                                                
                                                                            keySchema.find((err,resz)=>{
                                                                                if(resz){
                                                                                    resz.forEach(data=>{
                                                                                        data.accountsOnline.forEach(account=>{
                                                                                            if(account == res.username){                                     
                                                                                                data.accountsOnline = data.accountsOnline.filter(veri=> veri !== res.username)
                                                                                                data.markModified('accountsOnline');
                                                                                                data.save();
                                                                                            }
                                                                                        })
                                                                                    })
                                                                                }
                                                                            })
                                                                            return sendMessage(res.ownerDiscordID, embedMessage);   
                                                                        }
                                                                    });
                                                                    
                                                                   
                                                                    
                                                                }, 60* 1000);
                                                            }, 3000)
                                                        })
                                                }
                                                        }else{
                                                            const embedMessage = new Discord.MessageEmbed()
                                                                .setColor(embedColor)
                                                                .setTitle('Error!')
                                                                .setDescription(`:x: Cannot find account with ${details[0]} username.`)
                                                                .setTimestamp()
                                                            return sendMessage(msg.author.id, embedMessage);
                        
                                                        }
                                            
                                        })
                                    }else{
                                        const embedMessage = new Discord.MessageEmbed()
                                        .setColor(embedColor)
                                        .setTitle('Account Exists')
                                        .setDescription(`:x: Account using the key already.`)
                                        .setTimestamp()
                                    return sendMessage(msg.author.id, embedMessage);
                                    }
                                }else{
                                    const embedMessage = new Discord.MessageEmbed()
                                    .setColor(embedColor)
                                    .setTitle('Limit Exceeded')
                                    .setDescription(`:x: The hour limits for this key is over. You can buy another one with contacting us via !contact.`)
                                    .setTimestamp()
                                return sendMessage(msg.author.id, embedMessage);
                                }
                                
                                
                            }else{
                                const embedMessage = new Discord.MessageEmbed()
                                                        .setColor(embedColor)
                                                        .setTitle('Warning!')
                                                        .setDescription(`:information_source: Usage: !start [account username] [app id (730 or 730,440...)] [steam guard code] [key].`)
                                                        .setTimestamp()
                                                    return sendMessage(msg.author.id, embedMessage);
                            }
                        }else{
                            const embedMessage = new Discord.MessageEmbed()
                                        .setColor(embedColor)
                                        .setTitle('Max Account Limit')
                                        .setDescription(`:x: This key only can be used with ${res2.maxAccounts} account(s).`)
                                        .setTimestamp()
                                    return sendMessage(msg.author.id, embedMessage);
                        }                     
                    }else{
                       
                        const embedMessage = new Discord.MessageEmbed()
                                        .setColor(embedColor)
                                        .setTitle('Invalid Key!')
                                        .setDescription(`:information_source: Invalid license key, you can contact & buy via !contact.`)
                                        .setTimestamp()
                                    return sendMessage(msg.author.id, embedMessage);
                    }
                })
            }else{
                const embedMessage = new Discord.MessageEmbed()
                                        .setColor(embedColor)
                                        .setTitle('Warning!')
                                        .setDescription(`:information_source: Usage: !start [account username] [app id (730 or 730,440...)] [steam guard code] [key].`)
                                        .setTimestamp()
                                    return sendMessage(msg.author.id, embedMessage);
            }
           
            


           
        } 
        else if(msg.content.startsWith("!stop")){
            let details = msg.content.replace('!stop', '').trim();
            if(details.length > 0){

                accountSchema.findOne({username: details}, (errxx, resxx)=>{
                    if(resxx){
                        if(resxx.ownerDiscordID == msg.author.id){
                            if(onlineAccounts[details]){
                                onlineAccounts[details].logOff();
                                delete onlineAccounts[details];
                                if(hourIntervals[details]){
                                    clearInterval(hourIntervals[details]);
                                    delete hourIntervals[details];
                                }
                                keySchema.find((err,res)=>{
                                    if(res){
                                        res.forEach(data=>{
                                            data.accountsOnline.forEach(account=>{
                                                if(account == details){                                     
                                                    data.accountsOnline = data.accountsOnline.filter(veri=> veri !== details)
                                                    data.markModified('accountsOnline');
                                                    data.save();
                                                }
                                            })
                                        })
                                    }
                                })
                                const embedMessage = new Discord.MessageEmbed()
                                    .setColor(embedColor)
                                    .setTitle('Successfully Logged Off!')
                                    .setDescription(`:white_check_mark: Logged off from ${details}.`)
                                    .setTimestamp()
                                return sendMessage(msg.author.id, embedMessage);
                            }else{
                                const embedMessage = new Discord.MessageEmbed()
                                    .setColor(embedColor)
                                    .setTitle('Warning!')
                                    .setDescription(`:x: ${details} isn't online already.`)
                                    .setTimestamp()
                                return sendMessage(msg.author.id, embedMessage);
                
                            }
                        }else{
                            const embedMessage = new Discord.MessageEmbed()
                            .setColor(embedColor)
                            .setTitle('Error!')
                            .setDescription(`:x: Account with ${details} username, could not be found.`)
                            .setTimestamp()
                        return sendMessage(msg.author.id, embedMessage); 
                        }
                    }else{
                        const embedMessage = new Discord.MessageEmbed()
                            .setColor(embedColor)
                            .setTitle('Error!')
                            .setDescription(`:x: Account with ${details} username, could not be found.`)
                            .setTimestamp()
                        return sendMessage(msg.author.id, embedMessage);
                    }
                })

               
            }else{
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Warning!')
                .setDescription(`:information_source: Usage: !stop [account username].`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
        }
        else if(msg.content.startsWith("!delete") && !msg.content.startsWith('!deletekey')){
            let details = msg.content.replace('!delete', '').trim();
            if(details){
				//mongoose findone function
                accountSchema.findOne({username: details}, (errx, resx)=>{
                    if(resx){
                        if(resx.ownerDiscordID == msg.author.id){
                            accountSchema.findOneAndDelete({username: details}, (err,res)=>{
                                if(res){
                                    const embedMessage = new Discord.MessageEmbed()
                                    .setColor(embedColor)
                                    .setTitle('Account Deleted!')
                                    .setDescription(`:white_check_mark: Account with ${details} username, successfully deleted.`)
                                    .setTimestamp()
                                return sendMessage(msg.author.id, embedMessage);
                                }else{
                                    const embedMessage = new Discord.MessageEmbed()
                                        .setColor(embedColor)
                                        .setTitle('Error!')
                                        .setDescription(`:x: Account with ${details} username, could not be found.`)
                                        .setTimestamp()
                                    return sendMessage(msg.author.id, embedMessage);
                                }
                            })
                        }else{
                            const embedMessage = new Discord.MessageEmbed()
                            .setColor(embedColor)
                            .setTitle('Error!')
                            .setDescription(`:x: Account with ${details} username, could not be found.`)
                            .setTimestamp()
                        return sendMessage(msg.author.id, embedMessage);
                        }
                    }else{
                        const embedMessage = new Discord.MessageEmbed()
                            .setColor(embedColor)
                            .setTitle('Error!')
                            .setDescription(`:x: Account with ${details} username, could not be found.`)
                            .setTimestamp()
                        return sendMessage(msg.author.id, embedMessage);
                    }
                })
                
            }else{
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Warning!')
                .setDescription(`:information_source: Usage: !delete [account username].`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
        }
        else if(msg.content.startsWith("!changegames")){
            let details = msg.content.replace('!changegames', '').trim().split(/[ ]+/);

            if(details.length == 2){
                accountSchema.findOne({username: details[0]}, (errx, resx)=>{
                    if(resx){
                        if(resx.ownerDiscordID == msg.author.id){


                            if(onlineAccounts[details[0]]){
                                let maxGameLimit = 0;
                                keySchema.find((errxx,resxx)=>{
                                    if(resxx){
                                        resxx.forEach(data=>{
                                            if(data.accountsOnline.includes(details[0])){
                                                maxGameLimit += Number(data.maxGames);
                                            }
                                        })
                                        let appids = details[1].split(',');
                                        let allappids = [];
                                        appids.forEach(id=>{
                                            allappids.push(Number(id));
                                        })
                    
                    
                                        
                                        if(allappids.length > maxGameLimit){
                                            const embedMessage = new Discord.MessageEmbed()
                                                                        .setColor(embedColor)
                                                                        .setTitle('Max App Limit')
                                                                        .setDescription(`:x: This account has ${maxGameLimit} game limit at once, you cannot exceed that.`)
                                                                        .setTimestamp()
                                                                    return sendMessage(msg.author.id, embedMessage);    
                                        }else{
                                            onlineAccounts[details[0]].gamesPlayed([]);
                                            setTimeout(() => {
                                                onlineAccounts[details[0]].gamesPlayed(allappids);
                                                const embedMessage = new Discord.MessageEmbed()
                                                    .setColor(embedColor)
                                                    .setTitle('Success!')
                                                    .setDescription(`:white_check_mark: Changed games to ${details[1]} for ${details[0]} successfully.`)
                                                    .setTimestamp()
                                                return sendMessage(msg.author.id, embedMessage);
                                            }, 5000);
                                        }
                                    }
                                })
                               
                            }else{
                                const embedMessage = new Discord.MessageEmbed()
                                    .setColor(embedColor)
                                    .setTitle('Warning!')
                                    .setDescription(`:x: ${details[0]} isn't online for changing games.`)
                                    .setTimestamp()
                                return sendMessage(msg.author.id, embedMessage);
                            }
                        }else{
                            const embedMessage = new Discord.MessageEmbed()
                            .setColor(embedColor)
                            .setTitle('Error!')
                            .setDescription(`:x: Account with ${details[0]} username, could not be found.`)
                            .setTimestamp()
                        return sendMessage(msg.author.id, embedMessage);
                        }
                    }else{
                        const embedMessage = new Discord.MessageEmbed()
                        .setColor(embedColor)
                        .setTitle('Error!')
                        .setDescription(`:x: Account with ${details[0]} username, could not be found.`)
                        .setTimestamp()
                    return sendMessage(msg.author.id, embedMessage);
                    }
                })
                
            }else{
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Warning!')
                .setDescription(`:information_source: Usage: !changegames [account username] [app id (730 or 730,440...)].`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
        }
        else if(msg.content == "!contact"){
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Contact Us')
                .setDescription(`CONTACT DETAILS.`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
        }
        else if(msg.content.startsWith("!status")){
            let details = msg.content.replace('!status', '').trim();
            if(details){
                if(onlineAccounts[details]){
                    const embedMessage = new Discord.MessageEmbed()
                    .setColor(embedColor)
                    .setTitle('Online')
                    .setDescription(`:rocket: Account with ${details} username, is online!`)
                    .setTimestamp()
                return sendMessage(msg.author.id, embedMessage);
                }else{
                    const embedMessage = new Discord.MessageEmbed()
                    .setColor(embedColor)
                    .setTitle('Offline')
                    .setDescription(`:pensive: Account with ${details} username, is offline for now.`)
                    .setTimestamp()
                return sendMessage(msg.author.id, embedMessage);
                }
            }else{
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Warning!')
                .setDescription(`:information_source: Usage: !status [account username].`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
        }

        else if(msg.content.startsWith("!setvisibility")){
            let status = msg.content.replace("!setvisibility", "").trim();

            if(status == "invisible"){
                visibleStatus[msg.author.id] = "invisible";
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Success!')
                .setDescription(`:lock: Successfully set the visibility, you're now invisible.`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
            else if(status == "online"){
                visibleStatus[msg.author.id] = "";
                    const embedMessage = new Discord.MessageEmbed()
                    .setColor(embedColor)
                    .setTitle('Success!')
                    .setDescription(`:unlock: Successfully set the visibility, you're now online.`)
                    .setTimestamp()
                return sendMessage(msg.author.id, embedMessage);
            }
            else{
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Warning!')
                .setDescription(`:information_source: Usage: !setvisibility [online/invisible].`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
        }
        else if(msg.content.startsWith("!commands")){
            const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Commands')
                .setDescription('You can see the commands below.')
                .addFields(
                    { name: 'Adding Account', value: `!addaccount [login] [pass] [shared secret or blank]`},
                    { name: 'Deleting Account', value: `!delete [account username]`, inline:true},
                    { name: 'Starting Idling', value: `!start [account username] [app id (730 or 730,440...)] [steam guard code or blank (if shared given)] [key]`},

                    { name: 'Stopping Idling', value: `!stop [account username]`},

                    { name: 'Changing Games', value: `!changegames [account username] [app id (730 or 730,440...)]`, inline:true},
                    { name: 'Fetching Apps', value: `!fetchapps [steam url]`},
                    { name: 'Checking Idling Status of Account', value: `!status [account username]`},
                    { name: 'Steam Chat Settings', value: `!setvisibility [online/invisible] (Default is online)`},
                    { name: 'Steam Auto-accepting Friend Requests', value: `!acceptfriends [on/off] (Default is off)`},
                    { name: 'Contact | Support & Purchasing', value: `!contact`},

                    
                 
        
                )
        

                .setTimestamp()



            return sendMessage(msg.author.id,embedMessage);
        }
        else if(msg.content.startsWith("!createkey") && config.adminDiscordID.includes(msg.author.id)){
            let details = msg.content.replace('!createkey', '').trim().split(/[ ]+/);

            if(details.length  == 3){ 
                let createdKey = makeKey();
                let newkey = new keySchema({
                    key:createdKey,
                    hoursLeft: Number(details[0]),
                    maxAccounts: Number(details[1]),
                    maxGames: Number(details[2]),
                    accountsOnline: []
                })

                newkey.save(err=>{
                    if(!err){
                        const embedMessage = new Discord.MessageEmbed()
                            .setColor(embedColor)
                            .setTitle('Key Created!')
                            .setDescription(`:white_check_mark: Successfully created, Key: ${createdKey}.`)
                            .setTimestamp()

                        return sendMessage(msg.author.id, embedMessage);

                    }else{
                        const embedMessage = new Discord.MessageEmbed()
                            .setColor(embedColor)
                            .setTitle('Key Could Not Be Created!')
                            .setDescription(`:x: Could not create the key, maybe already exists? Try again.`)
                            .setTimestamp()
                        return sendMessage(msg.author.id, embedMessage)
                    }
                })
            }else{
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Warning!')
                .setDescription(`:information_source: Usage: !createkey [boost hours] [max accounts] [max games].`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
        }
        else if(msg.content.startsWith("!updatekey") && config.adminDiscordID.includes(msg.author.id)){
            let details = msg.content.replace('!updatekey', '').trim().split(/[ ]+/);

            if(details.length == 4){
                keySchema.findOne({key: details[0]}, (err,res)=>{
                    if(res){
                        keySchema.findOneAndUpdate({key:details[0]},{hoursLeft: Number(details[1]), maxAccounts: Number(details[2]), maxGames: Number(details[3])}, (err2,res2)=>{
                            if(res2){
                                const embedMessage = new Discord.MessageEmbed()
                                    .setColor(embedColor)
                                    .setTitle('Success!')
                                    .setDescription(`:white_check_mark: Key updated successfully.`)
                                    .setTimestamp()
                                return sendMessage(msg.author.id, embedMessage);
                            }else{
                                const embedMessage = new Discord.MessageEmbed()
                                    .setColor(embedColor)
                                    .setTitle('Error!')
                                    .setDescription(`:x: Couldn't update the key in database.`)
                                    .setTimestamp()
                                return sendMessage(msg.author.id, embedMessage);
                            }
                        })
                    }else{
                        const embedMessage = new Discord.MessageEmbed()
                            .setColor(embedColor)
                            .setTitle('Error!')
                            .setDescription(`:x: Couldn't find the key in database.`)
                            .setTimestamp()
                        return sendMessage(msg.author.id, embedMessage);
                    }
                })
            }else{
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Warning!')
                .setDescription(`:information_source: Usage: !updatekey [key] [boost hours] [max accounts] [max games].`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
        }
        else if(msg.content.startsWith("!deletekey") && config.adminDiscordID.includes(msg.author.id)){
            let details = msg.content.replace('!deletekey', '').trim();

            if(details){
                keySchema.findOneAndDelete({key:details}, (err,res)=>{
                    if(!err && res){
                        const embedMessage = new Discord.MessageEmbed()
                            .setColor(embedColor)
                            .setTitle('Key Created!')
                            .setDescription(`:white_check_mark: Successfully deleted.`)
                            .setTimestamp()

                        return sendMessage(msg.author.id, embedMessage);
                    }else{
                        const embedMessage = new Discord.MessageEmbed()
                        .setColor(embedColor)
                        .setTitle('Error!')
                        .setDescription(`:x: The key you provided, isn't exists already.`)
                        .setTimestamp()
                    return sendMessage(msg.author.id, embedMessage)
                    }
                })
            }else{
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Warning!')
                .setDescription(`:information_source: Usage: !deletekey [key].`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
        }
        else if(msg.content.startsWith("!checkkey") && config.adminDiscordID.includes(msg.author.id)){
            let key = msg.content.replace("!checkkey", "").trim();

            if(key){
                keySchema.findOne({key: key}, (err,res)=>{
                    if(res){
                        const embedMessage = new Discord.MessageEmbed()
                            .setColor(embedColor)
                            .setTitle('Details of Key')
                            .setDescription(`:white_check_mark: Key found, you can see the details below.`)
                            .addFields(
                                { name: 'Key', value: res.key},
                                { name: 'Hours Left', value: Number(res.hoursLeft).toFixed(2), inline:true},
                                { name: 'Max Accounts', value: res.maxAccounts},         
                                { name: 'Max Games', value: res.maxGames},
                                { name: 'Online Accounts', value: res.accountsOnline.length},
                            )
                            .setTimestamp()
                        return sendMessage(msg.author.id, embedMessage);
                    }else{
                        const embedMessage = new Discord.MessageEmbed()
                        .setColor(embedColor)
                        .setTitle('Error!')
                        .setDescription(`:x: There is no such a key like this.`)
                        .setTimestamp()
                    return sendMessage(msg.author.id, embedMessage);
                    }
                })
            }else{
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Warning!')
                .setDescription(`:information_source: Usage: !checkkey [key].`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
        }
        else if(msg.content.startsWith("!clearcache") && config.adminDiscordID.includes(msg.author.id)){
            keySchema.find((err,res)=>{
                if(res){
                    res.forEach(data=>{
                        data.accountsOnline = [];
                        data.markModified('accountsOnline');
                        data.save();
                    })
                    const embedMessage = new Discord.MessageEmbed()
                    .setColor(embedColor)
                    .setTitle('Success!')
                    .setDescription(`:white_check_mark: Done, boss!`)
                    .setTimestamp()
                return sendMessage(msg.author.id, embedMessage);

                }else{
                    const embedMessage = new Discord.MessageEmbed()
                    .setColor(embedColor)
                    .setTitle('Error!')
                    .setDescription(`:x: I cannot reach keys in db boss.`)
                    .setTimestamp()
                return sendMessage(msg.author.id, embedMessage);

                }
            })
        }
        else if(msg.content.startsWith("!fetchapps")){
            let link = msg.content.replace('!fetchapps', '').trim();
            if(link && link.includes("steamcommunity.com")){
                if(link.includes("steamcommunity.com/profiles")){
                    if(msg.content.includes("http://")){
                            steamID = link.trim().replace('http://steamcommunity.com/profiles/', '').replace('/', '');
                            if(steamID.length == 17){
                            // get games function
                                await checkUsersGames(steamID, (games)=>{
                                    if(games.length > 0){
										
                                        const embedMessage = new Discord.MessageEmbed()
                                            .setColor(embedColor)
                                            .setTitle('Games & Game IDs of Account')
                                            .setDescription('You can see games and details about games below.')
                                            
                                    
                                            .setTimestamp()
                                            let i =0;
                                            games.forEach(data=>{
                                                if(i<25){
                                                    i++;
                                                    embedMessage.addField(data, '** **', true)
                                                    games = games.filter(veri=> veri !== data)
                                                }
                                               
                                            })
                                            sendMessage(msg.author.id, embedMessage);
                                            let pageInterval;
                                            let ix = 0;
                                            let iz = 1;
                                            setTimeout(function(){
                                               
                                               pageInterval = setInterval(() => {
                                                    if (ix != Math.ceil(games.length / 25) && games.length > 0) {
                                                        
                                                        let iy = 0;
                                                        const embedMessage = new Discord.MessageEmbed()
                                                            .setColor(embedColor)
                                                            .setTitle('Games & Game IDs of Account | Page ' + iz)
                                                            .setDescription('You can see games and details about games below.')
                                                            games.forEach(data=>{
                                                                if(iy<25){
                                                                    iy++;
                                                                    embedMessage.addField(data, '** **', true)
                                                                    games = games.filter(veri=> veri !== data)
                                                                }
                                                               
                                                            })
                                                            sendMessage(msg.author.id, embedMessage);
                                                            ix++;
                                                            iz++;
                                                    }else{
                                                        return clearInterval(pageInterval);
                                                    }

                                                    
                                                    
                                                }, 3000);

                                               
                                            }, 3000)

                                           
                                        
                                        
                                    }else{
										const embedMessage = new Discord.MessageEmbed()
											.setColor(embedColor)
											.setTitle('Warning!')
											.setDescription(`:information_source: Cannot reach the games of profile, game details of profile may be private.`)
											.setTimestamp()
										return sendMessage(msg.author.id, embedMessage);
									}
                                })
                            }
                        
                    }
                        if(msg.content.includes("https://")){
                            steamID = link.trim().replace('https://steamcommunity.com/profiles/', '').replace('/', '');
                            if(steamID.length == 17){
                                // get games function
                                await checkUsersGames(steamID, (games)=>{
                                    if(games.length > 0){
										
                                        const embedMessage = new Discord.MessageEmbed()
                                            .setColor(embedColor)
                                            .setTitle('Games & Game IDs of Account')
                                            .setDescription('You can see games and details about games below.')
                                            
                                    
                                            .setTimestamp()
                                            let i =0;
                                            games.forEach(data=>{
                                                if(i<25){
                                                    i++;
                                                    embedMessage.addField(data, '** **', true)
                                                    games = games.filter(veri=> veri !== data)
                                                }
                                               
                                            })
                                            sendMessage(msg.author.id, embedMessage);
                                            let pageInterval;
                                            let ix = 0;
                                            let iz = 1;
                                            setTimeout(function(){
                                               
                                               pageInterval = setInterval(() => {
                                                    if (ix != Math.ceil(games.length / 25) && games.length > 0) {
                                                        
                                                        let iy = 0;
                                                        const embedMessage = new Discord.MessageEmbed()
                                                            .setColor(embedColor)
                                                            .setTitle('Games & Game IDs of Account | Page ' + iz)
                                                            .setDescription('You can see games and details about games below.')
                                                            games.forEach(data=>{
                                                                if(iy<25){
                                                                    iy++;
                                                                    embedMessage.addField(data, '** **', true)
                                                                    games = games.filter(veri=> veri !== data)
                                                                }
                                                               
                                                            })
                                                            sendMessage(msg.author.id, embedMessage);
                                                            ix++;
                                                            iz++;
                                                    }else{
                                                        return clearInterval(pageInterval);
                                                    }

                                                    
                                                    
                                                }, 3000);

                                               
                                            }, 3000)

                                           
                                        
                                        
                                    }else{
										const embedMessage = new Discord.MessageEmbed()
											.setColor(embedColor)
											.setTitle('Warning!')
											.setDescription(`:information_source: Cannot reach the games of profile, game details of profile may be private.`)
											.setTimestamp()
										return sendMessage(msg.author.id, embedMessage);
									}
                                })
                            }
                        }
                  
                    }
                    if(link.includes("steamcommunity.com/id")){
                        if(link.includes("https://")){
                            let steamUsername = link.trim().replace('https://steamcommunity.com/id/', '').replace('/', '');
                            axios.get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${config.steamAPIKey}&vanityurl=${steamUsername}`).then(async response=>{
                                if(response.data.response.steamid){
                                    let userSteamID = response.data.response.steamid;
                                    // get games function
                                    await checkUsersGames(userSteamID, (games)=>{
                                        if(games.length > 0){
                                            
                                            const embedMessage = new Discord.MessageEmbed()
                                                .setColor(embedColor)
                                                .setTitle('Games & Game IDs of Account')
                                                .setDescription('You can see games and details about games below.')
                                                
                                        
                                                .setTimestamp()
                                                let i =0;
                                                games.forEach(data=>{
                                                    if(i<25){
                                                        i++;
                                                        embedMessage.addField(data, '** **', true)
                                                        games = games.filter(veri=> veri !== data)
                                                    }
                                                   
                                                })
                                                sendMessage(msg.author.id, embedMessage);
                                                let pageInterval;
                                                let ix = 0;
                                                let iz = 1;
                                                setTimeout(function(){
                                                   
                                                   pageInterval = setInterval(() => {
                                                        if (ix != Math.ceil(games.length / 25) && games.length > 0) {
                                                            
                                                            let iy = 0;
                                                            const embedMessage = new Discord.MessageEmbed()
                                                                .setColor(embedColor)
                                                                .setTitle('Games & Game IDs of Account | Page ' + iz)
                                                                .setDescription('You can see games and details about games below.')
                                                                games.forEach(data=>{
                                                                    if(iy<25){
                                                                        iy++;
                                                                        embedMessage.addField(data, '** **', true)
                                                                        games = games.filter(veri=> veri !== data)
                                                                    }
                                                                   
                                                                })
                                                                sendMessage(msg.author.id, embedMessage);
                                                                ix++;
                                                                iz++;
                                                        }else{
                                                            return clearInterval(pageInterval);
                                                        }
    
                                                        
                                                        
                                                    }, 3000);
    
                                                   
                                                }, 3000)
    
                                               
                                            
                                            
                                        }else{
                                            const embedMessage = new Discord.MessageEmbed()
                                                .setColor(embedColor)
                                                .setTitle('Warning!')
                                                .setDescription(`:information_source: Cannot reach the games of profile, game details of profile may be private.`)
                                                .setTimestamp()
                                            return sendMessage(msg.author.id, embedMessage);
                                        }
                                    })
                                }else{
                                    const embedMessage = new Discord.MessageEmbed()
                                    .setColor(embedColor)
                                    .setTitle('Error!')
                                    .setDescription(`:x: Cannot get steamid of user.`)
                                    .setTimestamp()
                                return sendMessage(msg.author.id, embedMessage);
                                }
                            })
                        }
                        if(link.includes("http://")){
                            let steamUsername = link.trim().replace('http://steamcommunity.com/id/', '').replace('/', '');
                            axios.get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${config.steamAPIKey}&vanityurl=${steamUsername}`).then(async response=>{
                                if(response.data.response.steamid){
                                    let userSteamID = response.data.response.steamid;
                                    // get games function
                                    await checkUsersGames(userSteamID, (games)=>{
                                        if(games.length > 0){
                                            
                                            const embedMessage = new Discord.MessageEmbed()
                                                .setColor(embedColor)
                                                .setTitle('Games & Game IDs of Account')
                                                .setDescription('You can see games and details about games below.')
                                                
                                        
                                                .setTimestamp()
                                                let i =0;
                                                games.forEach(data=>{
                                                    if(i<25){
                                                        i++;
                                                        embedMessage.addField(data, '** **', true)
                                                        games = games.filter(veri=> veri !== data)
                                                    }
                                                   
                                                })
                                                sendMessage(msg.author.id, embedMessage);
                                                let pageInterval;
                                                let ix = 0;
                                                let iz = 1;
                                                setTimeout(function(){
                                                   
                                                   pageInterval = setInterval(() => {
                                                        if (ix != Math.ceil(games.length / 25) && games.length > 0) {
                                                            
                                                            let iy = 0;
                                                            const embedMessage = new Discord.MessageEmbed()
                                                                .setColor(embedColor)
                                                                .setTitle('Games & Game IDs of Account | Page ' + iz)
                                                                .setDescription('You can see games and details about games below.')
                                                                games.forEach(data=>{
                                                                    if(iy<25){
                                                                        iy++;
                                                                        embedMessage.addField(data, '** **', true)
                                                                        games = games.filter(veri=> veri !== data)
                                                                    }
                                                                   
                                                                })
                                                                sendMessage(msg.author.id, embedMessage);
                                                                ix++;
                                                                iz++;
                                                        }else{
                                                            return clearInterval(pageInterval);
                                                        }
    
                                                        
                                                        
                                                    }, 3000);
    
                                                   
                                                }, 3000)
    
                                               
                                            
                                            
                                        }else{
                                            const embedMessage = new Discord.MessageEmbed()
                                                .setColor(embedColor)
                                                .setTitle('Warning!')
                                                .setDescription(`:information_source: Cannot reach the games of profile, game details of profile may be private.`)
                                                .setTimestamp()
                                            return sendMessage(msg.author.id, embedMessage);
                                        }
                                    })
                                }else{
                                    const embedMessage = new Discord.MessageEmbed()
                                    .setColor(embedColor)
                                    .setTitle('Error!')
                                    .setDescription(`:x: Cannot get steamid of user.`)
                                    .setTimestamp()
                                return sendMessage(msg.author.id, embedMessage);
                                }
                            })
                        }
                    }
            }else{
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Warning!')
                .setDescription(`:information_source: Usage: !fetchapps [steam url].`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
        }
        else if(msg.content.startsWith("!acceptfriends")){
            let status = msg.content.replace("!acceptfriends", "").trim();

            if(status == "on"){
                acceptFriendsStatus[msg.author.id] = "on";
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Success!')
                .setDescription(`:white_check_mark: Successfully set the auto-accepting friend requests.`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
            else if(status == "off"){
                acceptFriendsStatus[msg.author.id] = "";
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Success!')
                .setDescription(`:white_check_mark: Successfully set off the auto-accepting friend requests.`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
            else{
                const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Warning!')
                .setDescription(`:information_source: Usage: !acceptfriends [on/off].`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            }
        }
        else{
            const embedMessage = new Discord.MessageEmbed()
                .setColor(embedColor)
                .setTitle('Wrong Command!')
                .setDescription(`:information_source: Write !commands for learning about commands.`)
                .setTimestamp()
            return sendMessage(msg.author.id, embedMessage);
            
        }
        
        
       

    }
    
});


let sendMessage = async (id, msg)=>{
    //function for fetching user and sending direct message
    await discordclient.users.fetch(id);
    await discordclient.users.cache.get(id).send(msg).catch(() => {}); 
}

function dateLog(){
    // function for date log
    return "\x1b[36m" + new Date().toLocaleString() + "\x1b[0m | ";
}

let hourInterval = async (key)=>{
    keySchema.findOne({key: key}, (err,res)=>{
        if(res && res.hoursLeft != 0){
            res.hoursLeft = (Number(res.hoursLeft) * 60 - 1) / 60;
            res.markModified('hoursLeft');
            res.save();
        }
    })
}

let getHours = async (key, callback)=>{
    keySchema.findOne({key: key}, (err,res)=>{
        if(res){
            callback(res.hoursLeft);
        }
    })
}

function makeKey(){
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 12; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }




let getAppIDs = async (steamid, callback)=>{
    axios.get(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${config.steamAPIKey}&steamid=${steamid}`).then(response=>{
        if(response.data.response.games.length > 0){
            let gameDatas = response.data.response.games;
            let appids = [];
            gameDatas.forEach(game=>{
                appids.push(game.appid);
            })

            callback(appids);
        }else{
            callback(null);
        }
    })
}

function getAllSteamApps(callback){
    let steamapps = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';
    axios(steamapps).then(appsresponse=>{
        
        const apps = appsresponse.data.applist.apps;
        callback(apps);
    })
}

let checkUsersGames = async (steamid, callback)=>{
    let url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${config.steamAPIKey}&steamid=${steamid}`;
    
    axios(url).then(response=>{
        let appIDs = [];
        let appNames = [];
		if(response.data.response.games){
			
		
			const donut = response.data.response.games;
			donut.forEach(item=>{
				appIDs.push(item.appid);
			})

			
				for(let i = 0; i < allSteamApps.length; i++) {
					let app = allSteamApps[i];
					if(appIDs.includes(app.appid)){
						
						appNames.push(app.name + ` (${app.appid})`)
					}
				}
		
			
			
		   callback(appNames);
	   }else{
		   callback(null);
	   }
    })
}