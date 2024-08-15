const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser")
const bcrypt = require("bcryptjs");    //Password hashing
const webSocket = require("ws");


mongoose.connect(process.env.MONGODB_URL);
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const User = require("./models/User");
const Message = require("./models/Message");


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


const server = app.listen(4040);

const webSocketServer = new webSocket.WebSocketServer({server})
webSocketServer.on("connection", (connection, req) => {
    //read username and id for the cookie of the connection
    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenCookieString = cookies.split(";").find(str => str.startsWith('token='));
        if (tokenCookieString) {
            const token = tokenCookieString.split("=")[1];
            if (token) {
                jwt.verify(token, jwtSecret, {}, (err, userData) => {
                    if (err) throw err;
                    const {userId, username} = userData;
                    connection.userId = userId;
                    connection.username = username;
                });
            }
        }
    }
    connection.on("message", async (message) => {
        const messageData = JSON.parse(message.toString());
        const {recipient, text} = messageData;

        if (recipient && text) {
            const messageDoc = await Message.create({
                sender:connection.UserId,
                recipient,
                text,
            });
            [...webSocketServer.clients]    //Access to MongoDB
            .filter(c => c.userId === recipient)
            .forEach(c => c.send(JSON.stringify({
                text, 
                sender:connection.userId,
                recipient,
                id:messageDoc._id,
            })))
        }
    });

    //Notify everyone about online people when someone connects
    [...webSocketServer.clients].forEach(client => {
        client.send(JSON.stringify({
            online: [...webSocketServer.clients].map(c => ({userId:c.userId,username:c.username}))    //Building list of online clients
        }));
    })
});