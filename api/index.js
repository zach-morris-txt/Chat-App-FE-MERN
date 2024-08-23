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
const fs = require("fs");


mongoose.connect(process.env.MONGODB_URL);
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const User = require("./models/User");
const Message = require("./models/Message");
const { pathToFileURL } = require("url");

app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));

 
async function getUserDataFromReq (req) {
    return new Promise((resolve, reject) => {    //Required to handle callback inside async
        const token = req.cookies?.token;
        if (token) {
            jwt.verify(token, jwtSecret, {}, (err, userData) => {
                if (err) throw err;
                resolve(userData);
            });
        } else {
            reject("No token")
        }
    });
}


app.get("/test", (req, res) => {
    res.json("Test ok");
});
app.get('/messages/:userId', async (req, res) => {    //Id of contact
    const {userId} = req.params;
    const userData = await getUserDataFromReq(req); //POSS const userData = await getUserDataFromReq(req)
    const ourUserId = userData.userId;
    const messages = await Message.find({
        sender:{$in:[userId, ourUserId]},
        recipient:{$in:[userId, ourUserId]},
    }).sort({createdAt: 1});    //Sorted at most recent message
    res.json(messages);
});
app.get("/people", async (req, res) => {
    const users = await User.find({}, {"_id":1, username:1});    //First empty object signifies no conditions
    res.json(users);
});
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
});
app.post("/login", async (req, res) => {
    const {username, password} = req.body;
    const foundUser = await User.findOne({username});
    if (foundUser) {
        const passOk = bcrypt.compareSync(password, foundUser.password);
        if (passOk) {
            jwt.sign({userId:foundUser._id,username}, jwtSecret, {}, (err, token) => {    //Payload  Async token
                res.cookie("token", token, {sameSite:"none", secure:true}).json({    //Name of token and Value of token
                    id: foundUser._id,
                })
            });
        }
    }
});
app.post("/logout", (req, res) => {
    res.cookie("token", '', {sameSite:"none", secure:true}).json("Logged out")    //Name of token and Value of token
});
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
});


const server = app.listen(4040);
const webSocketServer = new webSocket.WebSocketServer({server})
webSocketServer.on("connection", (connection, req) => {
    function notifyAboutOnlinePeople() {
        [...webSocketServer.clients].forEach(client => {    //Notify everyone about online people when someone connects:
            client.send(JSON.stringify({
                online: [...webSocketServer.clients].map(c => ({userId:c.userId,username:c.username}))    //Building list of online clients
            }));
        });
    }
    connection.isAlive = true;
    connection.timer = setInterval(() => {
        connection.ping();
        connection.deathTimer = setTimeout(() => {    //If 1 second without ping, set isAlive to false
            connection.isAlive = false;
            clearInterval(connection.timer);    //Stop endless timer loop
            connection.terminate();
            notifyAboutOnlinePeople();
        }, 1000);
    }, 120000);    //Ping every two minutes
    connection.on("pong", () => {
        clearTimeout(connection.deathTimer);    //Refresh/recheck deathTimer
    });

    const cookies = req.headers.cookie;    //read username and id for the cookie of the connection:
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
        const {recipient, text, file} = messageData;
        let fileName = null;

        if (file) {
            fileName = Date.now() + file.name;
            const path = __dirname + "/uploads/" + fileName;
            const bufferData = Buffer.from(file.data.split(',')[1], "base64");    //Split Base64 string label from encoding
            fs.writeFile(path, bufferData, () => {
                console.log(path)
            });
        }
        if (recipient && (text || file)) {
            const messageDoc = await Message.create({
                sender:connection.userId,
                recipient,
                text,
                file: file ? fileName : null, 
            });
            console.log("Created message");
            [...webSocketServer.clients]    //Access to MongoDB
            .filter(c => c.userId === recipient)
            .forEach(c => c.send(JSON.stringify({
                text, 
                sender:connection.userId,
                recipient,
                file: file ? fileName : null,
                _id:messageDoc._id,
            })))
        }
    });
    notifyAboutOnlinePeople()
});