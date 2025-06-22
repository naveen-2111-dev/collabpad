import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import getCollection from "../../lib/db/collection";
import { JwtPayloadTypes } from "../../type";
import { blockBots } from "../../middleware/user-agent";

const router = express.Router();

router.get("/myrooms", blockBots, async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.cookies.token;

        if (!token || !process.env.JWT_SECRET) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        if (typeof decoded !== "object" || decoded === null || !("userId" in decoded)) {
            res.status(401).json({ error: "Invalid token payload" });
            return;
        }

        const user = decoded as JwtPayloadTypes;
        const userId = user.userId;

        const Room = await getCollection("ROOM");

        const rooms = await Room.find({
            $or: [
                { ownerId: userId },
                { participants: userId }
            ]
        })
            .project({ _id: 1, roomId: 1, name: 1, ownerId: 1, participants: 1, updatedAt: 1 })
            .sort({ updatedAt: -1 })
            .toArray();

        res.status(200).json({ rooms });
        return;
    } catch (err: any) {
        console.error("Failed to get user rooms:", err);
        res.status(500).json({ error: "Internal server error" });
        return;
    }
});

export default router;
