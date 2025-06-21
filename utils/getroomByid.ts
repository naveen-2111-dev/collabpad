import getCollection from "../lib/db/collection";
import { Room } from "../type";

export async function getRoomById(roomId: string): Promise<Room | null> {
    const collection = await getCollection("ROOM");
    const room = await collection.findOne<Room>({ roomId });

    return room ?? null;
}

getRoomById("e9311558-5645-4021-843a-3a2644c87f98")