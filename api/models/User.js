const mongoose = require("mongoose");


//DATABASE MODELS
const UserSchema = new mongoose.Schema({
    username: {type: String, unique: true},
    password: String,
}, {timestamps: true});


// export const UserModel = mongoose.model('User', UserSchema);
module.exports = UserSchema;