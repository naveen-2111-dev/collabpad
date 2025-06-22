import express, { Request, Response } from "express";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { blockBots } from "../../middleware/user-agent";
import getCollection from "../../lib/db/collection";
import { JwtPayloadTypes } from "../../type";

const router = express.Router();

router.get("/me", blockBots, async (req: Request, res: Response): Promise<void> => {
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

        const collection = await getCollection("LOGIN");
        const dbUser = await collection.findOne({ _id: new ObjectId(user.userId) });

        if (!dbUser) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(200).json({
            success: true,
            user: {
                id: dbUser._id,
                email: dbUser.email,
            }
        });
    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err instanceof Error ? err.message : err,
        });
    }
});

export default router;
