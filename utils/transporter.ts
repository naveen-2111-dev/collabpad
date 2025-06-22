import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function MyTransporter() {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: "dev.naveen.rajan.m@gmail.com",
            pass: process.env.MAIL_PASSWORD,
        },
    });

    return transporter;
}

export default MyTransporter;
