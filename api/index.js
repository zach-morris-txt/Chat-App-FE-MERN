const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");


mongoose.connect(process.env.MONGODB_URL);
const jwtSecret = process.env.JWT_SECRET;

const User = require("./models/User");

app.use(express.json());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));

 
app.get("/test", (req, res, ) => {
    res.json("Test ok");
})
app.post("/register", async (req, res, ) => {
    const {username, password} = req.body;
    try {
        const createdUser = await User.create({username, password});    //Async json
        jwt.sign({userId:createdUser._id}, jwtSecret, {}, (err, token) => {    //Payload  Async token
            if (err) throw err;
            res.cookie("token", token).status(201).json({    //Name of token and Value of token
                id: createdUser._id,
            })
        });
    } catch(err) { if (err) throw err; }
})


app.listen(4040);