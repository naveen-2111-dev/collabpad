import { z } from "zod";
import mongoose from "mongoose";
import { roomSchema, roomZodSchema } from "./room";

new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  rooms: [roomSchema],
}, { timestamps: true });

export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  rooms: z.array(roomZodSchema).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
