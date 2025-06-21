import { z } from "zod";
import mongoose from "mongoose";
import { COLLECTIONS } from "../../type";

export const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        default: "",
    },
    ownerId: {
        type: String,
        required: true,
    },
    participants: {
        type: [String],
        default: [],
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    messages: [{
        userId: String,
        text: String,
        timestamp: { type: Date, default: Date.now }
    }],
    isPublic: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: () => new Date(),
    },
    updatedAt: {
        type: Date,
        default: () => new Date(),
    },
});

export const messageSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    text: z.string()
        .min(1, "Message cannot be empty")
        .max(500, "Message too long (max 500 chars)"),
    timestamp: z.date().default(() => new Date())
});

export const roomZodSchema = z.object({
    name: z.string()
        .min(1, "Name is required")
        .max(100, "Name must be less than 100 characters")
        .refine(async (name) => {
            const exists = await mongoose.model(COLLECTIONS.ROOM)?.exists({ name });
            return !exists;
        }, { message: "Room name already exists" })
        .default(""),
    data: z.any().optional(),
    messages: z.array(messageSchema).optional(),
    isPublic: z.boolean().optional()
});

export type Message = z.infer<typeof messageSchema>;
export type RoomZodInput = z.infer<typeof roomZodSchema>;