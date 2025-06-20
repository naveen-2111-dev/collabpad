import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";

import login from "./routes/auth/login";
import register from "./routes/auth/register";
import createroom from "./routes/rooms/create";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        credentials: true,
    }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use("/api/auth", login);
app.use("/api/auth", register);
app.use("/api/room", createroom);

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("joinRoom", ({ roomId }) => {
        socket.join(roomId);
        console.log(`${socket.id} joined room ${roomId}`);
        socket.to(roomId).emit("userJoined", { socketId: socket.id });
    });

    socket.on("message", ({ roomId, message, user }) => {
        io.to(roomId).emit("message", {
            user,
            message,
            timestamp: new Date()
        });
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
    });
});

server.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
});
