import express, { Request, Response, RequestHandler } from "express";
import { ObjectId } from "mongodb";
import getCollection from "../../lib/db/collection";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { roomZodSchema } from "../../lib/schema/room";

const router = express.Router();

const createRoomHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.cookies.token;

        if (!token || !process.env.JWT_SECRET) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };

        const validated = roomZodSchema.parse(req.body);

        const room = {
            roomId: randomUUID(),
            name: validated.name || "Untitled Room",
            ownerId: new ObjectId(decoded.userId),
            participants: [decoded.userId],
            data: validated.data || {},
            isPublic: validated.isPublic ?? false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const collection = await getCollection("ROOM");
        const result = await collection.insertOne(room);

        res.status(201).json({
            message: "Room created successfully",
            roomId: room.roomId,
            _id: result.insertedId
        });

    } catch (err: any) {
        console.error("Room creation error:", err);
        const isValidationError = err.name === "ZodError";
        res.status(isValidationError ? 400 : 500).json({
            error: isValidationError ? "Invalid input data" : "Internal server error"
        });
    }
};

router.post("/create", createRoomHandler);

export default router;