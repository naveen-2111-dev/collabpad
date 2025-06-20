import { MongoClient } from "mongodb";
import dotenv from "dotenv"

dotenv.config();

const URI = process.env.DB_URL;
const options = {}

if (!URI) {
    throw new Error("Please define the DB_URL environment variable inside .env.local");
}

const client: MongoClient = new MongoClient(URI, options);
const clientPromise: Promise<MongoClient> = client.connect()

/* eslint-disable no-var */
declare global {
    var _mongoClientPromise: Promise<MongoClient>;
}
/* eslint-enable no-var */

export default clientPromise;