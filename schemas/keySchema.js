const mongoose = require('mongoose');

var key = mongoose.Schema({
    key: {
        unique: true,
        type: String
    },
    hoursLeft: mongoose.Decimal128,
    maxAccounts: Number,
    maxGames: Number,
    accountsOnline: Array
});

var keySchema = mongoose.model('Key', key, 'keys');

module.exports = keySchema;