import { useContext, useEffect, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import { uniqBy } from "lodash";


export default function Chat() {
    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({});
    const [selectedContact, setSelectedContact] = useState(null);
    const [newMessageText, setNewMessageText] = useState("");
    const [messages, setMessages] = useState([]);
    const {username, id} = useContext(UserContext);


    useEffect(() => {
        const ws = new WebSocket("ws://localhost:4040");
        setWs(ws);
        ws.addEventListener("message", handleMessage)
    }, []);

    function showOnlinePeople(peopleArray) {
        const people = {};
        peopleArray.forEach(({userId, username}) => {
            people[userId] = username;    //Handles possible bug: multiple logged-in instances of single user duplicated in online list
        })
        setOnlinePeople(people);
    }
    function handleMessage(e) {
        const messageData = JSON.parse(e.data);
        if ("online" in messageData) {
            showOnlinePeople(messageData.online)
        } else if ("text" in messageData) {
            setMessages(prev => ([...prev, {...messageData}]));
        }
    }
    function sendMessage(e) {
        e.preventDefault();
        ws.send(JSON.stringify({
            recipient: selectedContact,
            text: newMessageText,
        }));
        setNewMessageText("");
        setMessages(prev => ([...prev, {text: newMessageText, isOur:true}]));
    }

    const onlinePeopleExcludeOurUser = {...onlinePeople};
    delete onlinePeopleExcludeOurUser[id];

    const messagesWithoutDuplicates = uniqBy(messages, "id");

    return (
        <div className="flex h-screen">
            <div className="bg-blue-100 w-1/3 p-2">
                <Logo />
                {Object.keys(onlinePeopleExcludeOurUser).map(userId => (
                    <div key={userId} onClick={() => setSelectedContact(userId)} 
                    className={"border-b border-gray-100 flex items-center gap-2 cursor-pointer "+(userId === selectedContact ? "bg-blue-800" : "")}>
                        {userId === selectedContact && (
                            <div className="h-12 w-1 bg-blue-500 rounded-r-md items-center"></div>
                        )}
                        <div className="flex gap-2 py-2 pl-4">
                            <Avatar username={onlinePeople[userId]} userId={userId} />
                            <span className="text-gray-900">{onlinePeople[userId]}</span>
                        </div>
                    </div>
                ))} 
            </div>
            <div className="flex flex-col bg-blue-300 w-2/3 p-2">
                <div className="flex-grow">
                    {!selectedContact && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-gray-500">Select a contact</div>
                        </div>
                    )}
                    {!!selectedContact && (
                        <div>
                            {messagesWithoutDuplicates.map(message => (
                                <div>{message.text}</div>
                            ))}
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
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}