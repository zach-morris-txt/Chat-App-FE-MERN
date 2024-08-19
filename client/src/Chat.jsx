import { useContext, useEffect, useRef, useState } from "react";
import { uniqBy } from "lodash";
import axios from "axios";
import { UserContext } from "./UserContext";
import Avatar from "./Avatar";
import Logo from "./Logo";
import Contact from "./Contact";


export default function Chat() {
    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({});
    const [offlinePeople, setOfflinePeople] = useState({});
    const [selectedContact, setSelectedContact] = useState(null);
    const [newMessageText, setNewMessageText] = useState("");
    const [messages, setMessages] = useState([]);
    const {username, id, setId, setUsername} = useContext(UserContext);
    const underMessagesRef = useRef();    //Handles scroll bar scroll down on new message


    useEffect(() => {
        connectToWS();
    }, [selectedContact]);

    function connectToWS() {
        const ws = new WebSocket("ws://localhost:4040");
        setWs(ws);
        ws.addEventListener("message", handleMessage);
        ws.addEventListener("close", () => {
            setTimeout(() => {
                console.log("Disconnected. Trying to reconnect");
                connectToWS();
            }, 1000)
        })
    }
    function showOnlinePeople(peopleArray) {
        const people = {};
        peopleArray.forEach(({userId, username}) => {
            people[userId] = username;    //Handles possible bug: multiple logged-in instances of single user duplicated in online list
        })
        setOnlinePeople(people);
    }
    function logout() {
        axios.post("/logout").then(() => {
            setId(null);
            setUsername(null);
        });
    }
    function handleMessage(e) {
        const messageData = JSON.parse(e.data);
        if ("online" in messageData) {
            showOnlinePeople(messageData.online)
        } else if ("text" in messageData) {
            if (messageData.sender === selectedContact) {
                setMessages(prev => ([...prev, {...messageData}]));
            }
        }
    }
    function sendMessage(e) {
        e.preventDefault();
        ws.send(JSON.stringify({
            recipient: selectedContact,
            text: newMessageText,
        }));
        setNewMessageText("");
        setMessages(prev => ([...prev, {
            text: newMessageText, 
            sender: id,
            recipient: selectedContact,
            _id: Date.now(),    //Timestamp message identifier
        }]));
    }


    useEffect(() => {
        const divMessages = underMessagesRef.current;
        if(divMessages) {
            divMessages.scrollIntoView({behavior:"smooth", block: "end"});
        }
    }, [messages]);
    useEffect(() => {
        axios.get("/people").then(res => {
            const offlinePeopleArray = res.data.filter(p => p._id !== id)    //Should not include our user
                .filter(p => !Object.keys(onlinePeople).includes(p._id));    //Should not include online users
            const offlinePeople = {};
            offlinePeopleArray.forEach(p => {
                offlinePeople[p._id] = p;
            });
            setOfflinePeople(offlinePeople);
        });
    }, [onlinePeople]);
    useEffect(() => {
        if(selectedContact) {
            axios.get('/messages/'+selectedContact).then(res => {
                setMessages(res.data)
            });
        }
    }, [selectedContact]);


    const onlinePeopleExcludeOurUser = {...onlinePeople};
    delete onlinePeopleExcludeOurUser[id];
    const messagesWithoutDuplicates = uniqBy(messages, "_id");    //Database recognizes message ID as "_id"


    return (
        <div className="flex h-screen">
            <div className="bg-blue-100 w-1/4 p-2 flex flex-col">
                <div className="flex-grow overflow-y-scroll">
                    <Logo />
                    {Object.keys(onlinePeopleExcludeOurUser).map(userId => (
                        <Contact id={userId} 
                            key={userId}
                            username={onlinePeopleExcludeOurUser[userId]} 
                            onClick={() => {setSelectedContact(userId)}} 
                            selected = {userId === selectedContact} 
                            online={true} />
                    ))}
                    {Object.keys(offlinePeople).map(userId => (
                        <Contact id={userId} 
                            key={userId}
                            username={offlinePeople[userId].username} 
                            onClick={() => {setSelectedContact(userId)}} 
                            selected = {userId === selectedContact} 
                            online={false} />
                    ))}
                </div>
                <div className="flex items-center justify-end text-center p-2">
                    <button onClick={logout} className="bg-white text-gray-600 py-1 px-8 border border-black rounded-md">Logout</button>
                </div>
            </div>
            <div className="flex flex-col bg-blue-300 w-3/4 p-2">
                <div className="flex-grow">
                    {!selectedContact && (
                        <div className="flex flex-grow items-center justify-center h-full">
                            <div className="text-gray-500">Select a contact</div>
                        </div>
                    )}
                    {!!selectedContact && (
                        <div className="relative h-full ">
                            <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                                {messagesWithoutDuplicates.map(message => (
                                    <div key={message._id} className={(message.sender === id ? "text-right" : "text-left")}>
                                        <div className={"inline-block fit-content w-fit max-w-3xl text-left break-all p-2 my-2 rounded-md text-sm " + 
                                        (message.sender === id ? "bg-purple-500 text-white" : "bg-white text-grey-500")}>
                                            {message.text}
                                        </div>
                                    </div>
                                ))}
                                <div ref={underMessagesRef}></div>
                            </div>
                        </div>
                    )}
                </div>
                {selectedContact && (
                    <form className="flex gap-1" onSubmit={sendMessage}>
                        <input 
                            type="text"
                            value={newMessageText}
                            onChange={e => setNewMessageText(e.target.value)}
                            placeholder="Type your message" 
                            className="bg-white flex-grow border p-2 rounded-sm" />
                        <button type="submit" className="bg-blue-800 p-2 text-white rounded-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}