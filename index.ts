/**
 * @fileoverview Entry point for the Express + Socket.IO server.
 * Handles real-time collaboration for rooms with authenticated users.
 */

import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { messageSchema, RoomZodInput, roomZodSchema } from "./lib/schema/room";
import { AuthenticatedSocket, COLLECTIONS } from "./type";
import login from "./routes/auth/login";
import register from "./routes/auth/register";
import rooms from "./routes/rooms/getrooms";
import getCollection from "./lib/db/collection";
import { z } from "zod";
import { getRoomById } from "./utils/getroomByid";

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
app.use("/api/room", rooms);

/**
 * Middleware to authenticate socket connections using JWT.
 * Adds `user` field to socket if valid token is present.
 */
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split('token=')[1]?.split(';')[0];
        const roomId = socket.handshake.auth.roomId;

        if (!token || !process.env.JWT_SECRET) {
            return next(new Error("Authentication error"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        const room = await getRoomById(roomId);

        if (!room) {
            return next(new Error("Room not found"));
        }

        if (!room?.isPublic && !room.participants.includes(decoded.userId)) {
            return next(new Error("Access denied to locked room"));
        }

        (socket as AuthenticatedSocket).user = decoded;

        next();
    } catch (err) {
        next(new Error("Authentication failed"));
    }
});

/**
 * In-memory state tracking for each room.
 * - elements: the canvas or drawing state
 * - participants: set of active userIds
 */
const roomStates = new Map<string, {
    elements: any[];
    participants: Set<string>;
}>();

/**
 * Main Socket.IO connection handler
 */
io.on("connection", (socket) => {
    const authSocket = socket as AuthenticatedSocket;

    socket.on('cursorMove', ({ roomId, x, y }) => {
        socket.to(roomId).emit('cursorUpdate', {
            userId: authSocket.user!.userId,
            x, y
        });
    });

    /**
     * Event: createAndJoinRoom
     * Allows user to create a room and automatically join it.
     */
    socket.on("createAndJoinRoom", async (roomData: RoomZodInput, callback: Function) => {
        try {
            const validated = roomZodSchema.parse(roomData);
            const userId = authSocket.user!.userId;

            const room = {
                roomId: randomUUID(),
                name: validated.name || "Untitled Room",
                ownerId: new mongoose.Types.ObjectId(userId),
                participants: [userId],
                data: validated.data || {},
                isPublic: validated.isPublic ?? false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const collection = await getCollection("ROOM");
            const result = await collection.insertOne(room);

            roomStates.set(room.roomId, {
                elements: room.data.elements || [],
                participants: new Set([userId])
            });

            socket.join(room.roomId);

            callback({
                success: true,
                roomId: room.roomId,
                _id: result.insertedId
            });

        } catch (err: any) {
            console.error("Room creation error:", err);
            callback({
                success: false,
                error: err.name === "ZodError" ? "Invalid room data" : "Failed to create room"
            });
        }
    });

    /**
     * Event: joinRoom
     * Adds a user to an existing room and syncs current state.
     */
    socket.on("joinRoom", async ({ roomId }: { roomId: string }, callback: Function) => {
        try {
            const userId = authSocket.user!.userId;
            const Room = await getCollection("ROOM");

            const dbRoom = await Room.findOne({ roomId });
            if (!dbRoom) {
                throw new Error("Room not found");
            }

            if (!roomStates.has(roomId)) {
                roomStates.set(roomId, {
                    elements: dbRoom.data?.elements || [],
                    participants: new Set()
                });
            }

            const room = roomStates.get(roomId)!;
            room.participants.add(userId);
            socket.join(roomId);

            await Room.updateOne(
                { roomId },
                { $addToSet: { participants: userId } }
            );

            callback({
                success: true,
                elements: room.elements,
                participants: Array.from(room.participants)
            });

            socket.to(roomId).emit("userJoined", {
                userId,
                participants: Array.from(room.participants)
            });

        } catch (err: any) {
            console.error("Join room error:", err);
            callback({
                success: false,
                error: err.message
            });
        }
    });

    /**
     * Event: drawingUpdate
     * Updates the current drawing/canvas state in a room and broadcasts it.
     */
    socket.on("drawingUpdate", async ({ roomId, elements }: { roomId: string; elements: any[] }) => {
        try {
            if (!roomStates.has(roomId)) return;

            const room = roomStates.get(roomId)!;
            room.elements = elements;
            const collection = await getCollection("ROOM");

            await collection.updateOne(
                { roomId },
                { $set: { "data.elements": elements, updatedAt: new Date() } }
            );

            socket.to(roomId).emit("drawingUpdate", elements);
        } catch (err) {
            console.error("Drawing update error:", err);
        }
    });

    /**
     * Event: sendMessage
     * Stores a chat message and broadcasts it to the room.
     */
    socket.on("sendMessage", async ({ roomId, text }: { roomId: string; text: string }, callback: Function) => {
        try {
            if (!authSocket.user) {
                return callback({ success: false, error: "User not authenticated" });
            }

            const validated = messageSchema.parse({
                userId: authSocket.user.userId,
                text,
                timestamp: new Date()
            });

            await mongoose.model(COLLECTIONS.ROOM).updateOne(
                { roomId },
                { $push: { messages: validated } }
            );

            io.to(roomId).emit("newMessage", validated);
            callback({ success: true });

        } catch (err) {
            if (err instanceof z.ZodError) {
                callback({ success: false, error: err.errors[0].message });
            } else {
                callback({ success: false, error: "Server error" });
            }
        }
    });
});

// Start server
server.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
});
