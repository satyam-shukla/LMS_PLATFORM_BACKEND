import nodemailer, { Transporter } from "nodemailer";
import path from "path";
import ejs from "ejs";

interface EmailOptions {
    email: string;
    subject: string;
    template: string;
    data: { [key: string]: any };
}

const sendEmail = async (options: EmailOptions): Promise<void> => {

    // Create transporter
    const transporter: Transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || '587'),
        service: process.env.SMTP_SERVICE,
        auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const { email, subject, template, data } = options;

    // Get the path of the template file
    const templatePath = path.join(__dirname, '../mails', template);

    // Render the template with EJS
    try {
        const html: string = await ejs.renderFile(templatePath, data);

        const mailOptions = {
            from: process.env.SMTP_USERNAME,
            to: email,
            subject,
            html,
        };

        // Send email
        await transporter.sendMail(mailOptions);
    } catch (error: any) {
        console.error("Error occurred while sending email:", error);
        throw new Error("Failed to send email");
    }
};

export default sendEmail;
