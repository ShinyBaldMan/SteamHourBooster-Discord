const mongoose = require('mongoose');

var account = mongoose.Schema({
    username: {
        unique: true,
        type: String
    },
    password: String,
    ownerDiscordID: String,
    sharedSecret: String
});

var accountSchema = mongoose.model('Account', account, 'accounts');

module.exports = accountSchema;