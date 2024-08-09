const mongoose = require("mongoose");


//DATABASE MODELS
const UserSchema = new mongoose.Schema({
    username: {type: String, unique: true},
    password: String,
}, {timestamps: true});


// console.log(UserSchema)
//EXPORT MODELS    ***It seems export won't be recognized until the MongoDB connection is clarified
// export const UserModel = mongoose.model('User', UserSchema);