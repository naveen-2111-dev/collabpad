import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import getCollection from "../../lib/db/collection";
import { JwtPayloadTypes } from "../../type";
import { blockBots } from "../../middleware/user-agent";
import saveNotification from "../../utils/inapp";
import { io } from "../..";

const router = express.Router();

router.post("/:id/invite", blockBots, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: roomId } = req.params;
        const { userIdToInvite } = req.body;


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
        const currentUserId = user.userId;

        const Room = await getCollection("ROOM");
        const room = await Room.findOne({ roomId });

        if (!room) { res.status(404).json({ error: "Room not found" }); return; }

        if (room?.ownerId.toString() !== currentUserId) {
            res.status(403).json({ error: "Only the room owner can invite users" });
            return;
        }

        if (room?.participants.includes(userIdToInvite)) {
            res.status(400).json({ error: "User already in room" });
            return;
        }

        await Room.updateOne(
            { roomId },
            { $addToSet: { participants: userIdToInvite } }
        );

        await saveNotification(userIdToInvite, {
            type: "INVITE",
            message: `hey ${user.email} invites you to ${room.name}`,
            roomId,
        });

        io.to(`user:${userIdToInvite}`).emit("notification", {
            type: "INVITE",
            from: currentUserId,
            roomId,
            roomName: room.name,
            timestamp: new Date()
        });

        res.json({ success: true, message: "User invited successfully" });
        return;

    } catch (err: any) {
        console.error("Invite error:", err);
        res.status(500).json({ error: "Internal server error" });
        return;
    }
});

export default router;
