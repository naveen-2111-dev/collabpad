import express, { Request, Response } from "express";
import getCollection from "../../lib/db/collection";
import { blockBots } from "../../middleware/user-agent";

const router = express.Router();
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

router.get("/getrooms", blockBots, async (req: Request, res: Response): Promise<void> => {
    const internalSecret = req.headers["x-internal-secret"];

    if (internalSecret !== INTERNAL_SECRET) {
        res.status(403).json({
            success: false,
            message: "Forbidden. This route is restricted to internal services.",
        });
        return;
    }

    try {
        const collection = await getCollection("ROOM");
        const data = await collection.find({}).toArray();

        res.status(200).json({
            success: true,
            rooms: data,
        });
        return;
    } catch (err) {
        console.error("Error fetching rooms:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err instanceof Error ? err.message : err,
        });
        return;
    }
});

export default router;