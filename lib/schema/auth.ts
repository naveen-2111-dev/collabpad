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
  notifications: [
    {
      type: { type: String, enum: ["INVITE", "ALERT", "MESSAGE"] },
      message: String,
      roomId: String,
      read: Boolean,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  rooms: [roomSchema],
}, { timestamps: true });

const notificationZodSchema = z.object({
  type: z.enum(["INVITE", "ALERT", "MESSAGE"]),
  message: z.string(),
  roomId: z.string().optional(),
  read: z.boolean().default(false),
  createdAt: z.date().optional()
});

export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  rooms: z.array(roomZodSchema).optional(),
  notifications: z.array(notificationZodSchema).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type notificationsInput = z.infer<typeof notificationZodSchema>;
