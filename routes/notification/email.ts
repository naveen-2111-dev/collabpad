import express, { Request, Response } from "express";
import { blockBots } from "../../middleware/user-agent";
import MyTransporter from "../../utils/transporter";
import generateRoomInvitationEmail from "../../templates/Invite";

const INTERNAL_SECRET = process.env.INTERNAL_SECRET;
const router = express.Router();

router.post("/mail", blockBots, async (req: Request, res: Response): Promise<void> => {
    try {
        const internalSecret = req.headers["x-internal-secret"];

        if (internalSecret !== INTERNAL_SECRET) {
            res.status(403).json({
                success: false,
                message: "Forbidden. This route is restricted to internal services.",
            });
            return;
        }
        const transporter = await MyTransporter();

        const { toMail, subject, roomname, from, link } = req.body;

        if (!toMail || !subject || !roomname || !from || !link) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }

        const htmlContent = generateRoomInvitationEmail(roomname, from, link);

        const info = await transporter.sendMail({
            from: '"CollabPad" <noreply@gmail.com>',
            to: toMail,
            subject: subject,
            html: htmlContent,
        });

        res.status(200).json({
            success: true,
            messageId: info.messageId,
            message: "Invitation email sent successfully",
        });
    } catch (error) {
        console.error("Email send error:", error);
        res.status(500).json({ success: false, error: "Failed to send email" });
    }
});

export default router;
