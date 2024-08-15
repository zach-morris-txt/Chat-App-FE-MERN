const mongoose = require("mongoose");


//DATABASE MODELS
const MessageSchema = new mongoose.Schema({
    sender: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    recipient: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    text: String,
}, {timestamps: true});


const MessageModel = mongoose.model("Message", MessageSchema);
module.exports = MessageModel;