import { z } from "zod";
import mongoose from "mongoose";

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

export const roomZodSchema = z.object({
    name: z.string().optional(),
    data: z.any().optional(),
    isPublic: z.boolean().optional()
});

export type RoomZodInput = z.infer<typeof roomZodSchema>;