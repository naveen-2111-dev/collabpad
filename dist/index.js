"use strict";
/**
 * @fileoverview Entry point for the Express + Socket.IO server.
 * Handles real-time collaboration for rooms with authenticated users.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const socket_io_1 = require("socket.io");
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const mongoose_1 = __importDefault(require("mongoose"));
const room_1 = require("./lib/schema/room");
const type_1 = require("./type");
const login_1 = __importDefault(require("./routes/auth/login"));
const register_1 = __importDefault(require("./routes/auth/register"));
const getrooms_1 = __importDefault(require("./routes/rooms/getrooms"));
const invite_1 = __importDefault(require("./routes/rooms/invite"));
const myrooms_1 = __importDefault(require("./routes/rooms/myrooms"));
const collection_1 = __importDefault(require("./lib/db/collection"));
const email_1 = __importDefault(require("./routes/notification/email"));
const me_1 = __importDefault(require("./routes/profile/me"));
const zod_1 = require("zod");
const getroomByid_1 = require("./utils/getroomByid");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:3000",
        credentials: true,
    }
});
exports.io = io;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use("/api/auth", login_1.default);
app.use("/api/auth", register_1.default);
app.use("/api/room", getrooms_1.default);
app.use("/api/room", invite_1.default);
app.use("/api/room", myrooms_1.default);
app.use("/api/profile", me_1.default);
app.use("/api/email", email_1.default);
/**
 * Middleware to authenticate socket connections using JWT.
 * Adds `user` field to socket if valid token is present.
 */
io.use((socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const token = socket.handshake.auth.token || ((_b = (_a = socket.handshake.headers.cookie) === null || _a === void 0 ? void 0 : _a.split('token=')[1]) === null || _b === void 0 ? void 0 : _b.split(';')[0]);
        const roomId = socket.handshake.auth.roomId;
        if (!token || !process.env.JWT_SECRET) {
            return next(new Error("Authentication error"));
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const room = yield (0, getroomByid_1.getRoomById)(roomId);
        if (!room) {
            return next(new Error("Room not found"));
        }
        if (!(room === null || room === void 0 ? void 0 : room.isPublic) && !room.participants.includes(decoded.userId)) {
            return next(new Error("Access denied to locked room"));
        }
        socket.user = decoded;
        next();
    }
    catch (err) {
        next(new Error("Authentication failed"));
    }
}));
/**
 * In-memory state tracking for each room.
 * - elements: the canvas or drawing state
 * - participants: set of active userIds
 */
const roomStates = new Map();
/**
 * Main Socket.IO connection handler
 */
io.on("connection", (socket) => {
    const authSocket = socket;
    socket.on('cursorMove', ({ roomId, x, y }) => {
        socket.to(roomId).emit('cursorUpdate', {
            userId: authSocket.user.userId,
            x, y
        });
    });
    /**
     * Event: createAndJoinRoom
     * Allows user to create a room and automatically join it.
     */
    socket.on("createAndJoinRoom", (roomData, callback) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const validated = room_1.roomZodSchema.parse(roomData);
            const userId = authSocket.user.userId;
            const room = {
                roomId: (0, crypto_1.randomUUID)(),
                name: validated.name || "Untitled Room",
                ownerId: new mongoose_1.default.Types.ObjectId(userId),
                participants: [userId],
                data: validated.data || {},
                isPublic: (_a = validated.isPublic) !== null && _a !== void 0 ? _a : false,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const collection = yield (0, collection_1.default)("ROOM");
            const result = yield collection.insertOne(room);
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
        }
        catch (err) {
            console.error("Room creation error:", err);
            callback({
                success: false,
                error: err.name === "ZodError" ? "Invalid room data" : "Failed to create room"
            });
        }
    }));
    /**
     * Event: joinRoom
     * Adds a user to an existing room and syncs current state.
     */
    socket.on("joinRoom", (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId }, callback) {
        var _b;
        try {
            const userId = authSocket.user.userId;
            const Room = yield (0, collection_1.default)("ROOM");
            const dbRoom = yield Room.findOne({ roomId });
            if (!dbRoom) {
                throw new Error("Room not found");
            }
            if (!roomStates.has(roomId)) {
                roomStates.set(roomId, {
                    elements: ((_b = dbRoom.data) === null || _b === void 0 ? void 0 : _b.elements) || [],
                    participants: new Set()
                });
            }
            const room = roomStates.get(roomId);
            room.participants.add(userId);
            socket.join(roomId);
            yield Room.updateOne({ roomId }, { $addToSet: { participants: userId } });
            callback({
                success: true,
                elements: room.elements,
                participants: Array.from(room.participants)
            });
            socket.to(roomId).emit("userJoined", {
                userId,
                participants: Array.from(room.participants)
            });
        }
        catch (err) {
            console.error("Join room error:", err);
            callback({
                success: false,
                error: err.message
            });
        }
    }));
    /**
     * Event: drawingUpdate
     * Updates the current drawing/canvas state in a room and broadcasts it.
     */
    socket.on("drawingUpdate", (_a) => __awaiter(void 0, [_a], void 0, function* ({ roomId, elements }) {
        try {
            if (!roomStates.has(roomId))
                return;
            const room = roomStates.get(roomId);
            room.elements = elements;
            const collection = yield (0, collection_1.default)("ROOM");
            yield collection.updateOne({ roomId }, { $set: { "data.elements": elements, updatedAt: new Date() } });
            socket.to(roomId).emit("drawingUpdate", elements);
        }
        catch (err) {
            console.error("Drawing update error:", err);
        }
    }));
    /**
     * Event: sendMessage
     * Stores a chat message and broadcasts it to the room.
     */
    socket.on("sendMessage", (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId, text }, callback) {
        try {
            if (!authSocket.user) {
                return callback({ success: false, error: "User not authenticated" });
            }
            const validated = room_1.messageSchema.parse({
                userId: authSocket.user.userId,
                text,
                timestamp: new Date()
            });
            yield mongoose_1.default.model(type_1.COLLECTIONS.ROOM).updateOne({ roomId }, { $push: { messages: validated } });
            io.to(roomId).emit("newMessage", validated);
            callback({ success: true });
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
                callback({ success: false, error: err.errors[0].message });
            }
            else {
                callback({ success: false, error: "Server error" });
            }
        }
    }));
});
// Start server
server.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
});
