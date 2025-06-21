import type { Request, Response, NextFunction } from "express";

export function blockBots(req: Request, res: Response, next: NextFunction): void {
    const ua = (req.headers["user-agent"] || "").toLowerCase();

    const botAgents = [
        "curl",
        "wget",
        "python",
        "scrapy",
        "httpclient",
        "axios",
        // "postman",
        "node-fetch",
        "go-http-client",
        "java"
    ];

    if (botAgents.some(bot => ua.includes(bot))) {
        res.status(403).json({
            success: false,
            message: "forbidden",
        });
        return;
    }

    next();
}
