const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const {generateMessage,generateLocationMessage} = require("./utils/messages");
const {addUser,removeUser,getUser,getUsersInRoom} = require("./utils/user");
dotenv.config({path:"../config.env"});

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 5000;
const publicDirectoryPath = path.join(__dirname,"../public");

app.use(express.static(publicDirectoryPath));

const time = new Date();
const currHour = time.getHours();
const currMinutes = time.getMinutes();
const currSecond = time.getSeconds();
const currDay = time.getDay()
const currTime =  `${currHour}:${currMinutes}:${currSecond}`
console.log("Current Time is: ",currTime)

io.on("connection",socket => {
    console.log(`New Connection at ${currTime} - ${currDay}`)

    socket.on("join",(options,callback)=>{
        const {error,user} = addUser({id:socket.id,...options});
        if(error){
            return callback(error);
        }
        else{
            socket.join(user.room);
            socket.emit("message",generateMessage("Admin","Welcome to CodoFile!"));
            socket.broadcast.to(user.room).emit("message", generateMessage("Admin",`${user.username} has joined!`));
            io.to(user.room).emit("roomData",{
                room:user.room,
                users:getUsersInRoom(user.room)
            });

            callback();
        }
    });

    socket.on("sendMessage",(message,callback) =>{
        const user = getUser(socket.id);
        const filter = new Filter();

        if(filter.isProfane(message)){
            return callback("Vulgar words is not allowed")
        }
        else{
            io.to(user.room).emit("message",generateMessage(user.username,message));
            callback();
        }
    });

    socket.on("sendLocation",(coords,callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit("locationMessage",generateLocationMessage(user.username, `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`));
        callback();
    });

    socket.on("disconnect",()=>{
        const user = removeUser(socket.id);

        if(user){
            io.to(user.room).emit("message",generateMessage("Admin", `${user.username} has Left!`));
            io.to(user.room).emit("roomData",{
                room:user.room,
                users : getUsersInRoom(user.room)
            });
        }
    });
});

server.listen(PORT,()=>{
    console.log(`Server is running at PORT  : ${PORT}`);
})