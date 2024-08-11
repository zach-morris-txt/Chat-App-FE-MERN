const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser")
const bcrypt = require("bcryptjs");    //Password hashing



mongoose.connect(process.env.MONGODB_URL);
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const User = require("./models/User");

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));

 
app.get("/test", (req, res) => {
    res.json("Test ok");
})
app.get("/profile", (req, res) => {
    const token = req.cookies?.token;
    if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            res.json(userData);
        });
    } else {
        res.status(401).json("No token")
    }

})
app.post("/login", async (req, res) => {
    const {username, password} = req.body;
    const foundUser = await User.findOne({username});
    if (foundUser) {
        const passOk = bcrypt.compareSync(password, foundUser.password);
        if (passOk) {
            jwt.sign({userId:foundUser._id,username}, jwtSecret, {}, (err, token) => {    //Payload  Async token
                if (err) throw err;
                res.cookie("token", token, {sameSite:"none", secure:true}).json({    //Name of token and Value of token
                    id: foundUser._id,
                })
            });
        }
    }
})
app.post("/register", async (req, res) => {
    const {username, password} = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt)
        const createdUser = await User.create({    //Async json
            username:username, 
            password:hashedPassword,
        });
        jwt.sign({userId:createdUser._id,username}, jwtSecret, {}, (err, token) => {    //Payload  Async token
            if (err) throw err;
            res.cookie("token", token, {sameSite:"none", secure:true}).status(201).json({    //Name of token and Value of token
                id: createdUser._id,
            })
        });
    } catch(err) { if (err) throw err; }
})


app.listen(4040);