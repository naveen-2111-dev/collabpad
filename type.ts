/**
 * Object containing the names of MongoDB collections used in the app.
 * The keys represent collection identifiers used in code,
 * and the values are the actual collection names in the database.
 */
export const COLLECTIONS = {
    LOGIN: "user",
    ROOM: "rooms",
} as const;

/**
 * Type representing the valid collection names defined in COLLECTIONS.
 * It is a union type of the keys of COLLECTIONS.
 */
export type CollectionName = keyof typeof COLLECTIONS;