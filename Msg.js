const mongoose = require('mongoose');

const MsgSchema = new mongoose.Schema(
    {
        from: String,
        to: String,
        msg: String
    },

    { timestamps: true }
);

module.exports = mongoose.model('Chats', MsgSchema);