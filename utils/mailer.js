import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
   service: "gmail",
   auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
   },
});

export async function sendEmail({ to, subject, html }) {
   try {
      await transporter.sendMail({
         from: `"MovApp" <${process.env.SMTP_USER}>`,
         to,
         subject,
         html,
      });
      console.log(`Correo enviado a ${to}`);
   } catch (err) {
      console.error("Error al enviar correo:", err);
      throw new Error("Error al enviar correo");
   }
}
