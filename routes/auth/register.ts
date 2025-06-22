import express, { Request, Response, RequestHandler } from "express";
import getCollection from "../../lib/db/collection";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { loginSchema } from "../../lib/schema/auth";

const router = express.Router();

const registerHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const validated = loginSchema.parse(req.body);

        const collection = await getCollection("LOGIN");
        const existingUser = await collection.findOne({
            email: validated.email.toLowerCase().trim()
        });

        if (existingUser) {
            res.status(409).json({ error: "Email already registered" });
            return;
        }

        const hashedPassword = await bcrypt.hash(validated.password, 12);

        const result = await collection.insertOne({
            email: validated.email.toLowerCase().trim(),
            password: hashedPassword,
            createdAt: new Date()
        });

        const userId = result.insertedId;

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET not configured");
            res.status(500).json({ error: "Server configuration error" });
            return;
        }

        const token = jwt.sign(
            {
                userId,
                email: validated.email,
                iat: Math.floor(Date.now() / 1000)
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
            domain: process.env.NODE_ENV === "production" ? ".yourdomain.com" : undefined
        });

        res.status(201).json({
            message: "Registration successful",
            user: {
                id: userId,
                email: validated.email
            }
        });
        return;

    } catch (err: any) {
        console.error("Register error:", err);

        const isValidationError = err.name === "ZodError";
        res.status(isValidationError ? 400 : 500).json({
            error: isValidationError ? "Invalid input data" : "Internal server error"
        });
    }
};

router.post("/register", registerHandler);

export default router;