import mongoose from "mongoose";
import getCollection from "../lib/db/collection";

async function saveNotification(toUserId: string, payload: {
    type: "INVITE" | "ALERT" | "MESSAGE";
    message: string;
    roomId?: string;
}) {
    const User = await getCollection("LOGIN");

    await User.updateOne(
        { _id: new mongoose.Types.ObjectId(toUserId) },
        {
            $push: {
                notifications: {
                    type: payload.type,
                    message: payload.message,
                    roomId: payload.roomId || null,
                    read: false,
                    createdAt: new Date()
                }
            }
        } as any
    );
}

export default saveNotification;