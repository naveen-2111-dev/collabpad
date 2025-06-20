import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { loginSchema } from "../../lib/schema/auth";
import getCollection from "../../lib/db/collection";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  try {
    const validated = loginSchema.parse(req.body);
    const attemptKey = `${req.ip}-${validated.email}`;
    const attempts = failedAttempts.get(attemptKey);

    if (attempts && attempts.count >= 5 && Date.now() - attempts.lastAttempt < 30 * 60 * 1000) {
      res.status(429).json({ error: "Account temporarily locked. Try again later." });
      return;
    }

    const collection = await getCollection("LOGIN");
    const user = await collection.findOne({
      email: validated.email.toLowerCase().trim()
    });

    const dummyHash = "$2b$12$dummdu74398430hjjcjds***^#(@*#*$^^@(#I))**#(^%$$#!%!&*~";
    const passwordToCheck = user?.password || dummyHash;

    const isPasswordValid = await bcrypt.compare(validated.password, passwordToCheck);

    if (!user || !isPasswordValid) {
      const currentAttempts = failedAttempts.get(attemptKey) || { count: 0, lastAttempt: 0 };
      failedAttempts.set(attemptKey, {
        count: currentAttempts.count + 1,
        lastAttempt: Date.now()
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    failedAttempts.delete(attemptKey);

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not configured");
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
        issuer: "your-app-name",
        audience: "your-app-users"
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

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
      }
    });

  } catch (err: any) {
    console.error("Login error:", err);

    // Don't expose internal errors to client
    const isValidationError = err.name === "ZodError";
    res.status(isValidationError ? 400 : 500).json({
      error: isValidationError ? "Invalid input data" : "Internal server error"
    });
  }
});

export default router;