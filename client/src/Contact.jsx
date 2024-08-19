import Avatar from "./Avatar";


export default function Contact({id, username, onClick, selected, online}) {
    return (
        <div key={id} onClick={() => onClick(id)} 
        className={"border-b border-gray-100 flex items-center gap-2 cursor-pointer "+(selected ? "bg-blue-800" : "")}>
            {selected && (
                <div className="h-12 w-1 bg-blue-500 rounded-r-md items-center"></div>
            )}
            <div className="flex gap-2 py-2 pl-4">
                <Avatar online={online} username={username} userId={id} />
                <span className="text-gray-900">{username}</span>
            </div>
        </div>
    );
}