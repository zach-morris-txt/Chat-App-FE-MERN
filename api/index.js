const express = require("express");
const app = express();
const mongoose =require("mongoose");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

dotenv.config();
// mongoose.connect(process.env.MONGODB_URL);    //Currently connection breaks code because the env string does not beat
jwtSecret = process.env.JWT_SECRET;



//Need URL after download
// const mongoUrl = dotenv.MONGODB_URL


app.get("/test", (req, res, ) => {
    res.json("Test ok");
    res.json({message:"message"})
})
app.post("/register", async (req, res, ) => {
    const {username, password} = req.body;
    const createdUser = await User.create({username, password});    //Async json
    jwt.sign({userId:createdUser._id}, jwtSecret, (err, token) => {    //Async token
        if (err) throw err;
        res.cookie("token", token).status(201).json("Ok")    //Name and Value
    });
})


app.listen(4040);