import nodemailer from "nodemailer";

// Configuración para Titan Email usando variables de entorno
const transporter = nodemailer.createTransport({
   host: process.env.SMTP_HOST,
   port: parseInt(process.env.SMTP_PORT, 10),
   secure: false,
   auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
   },
});

transporter.verify((error, success) => {
   if (error) {
      console.error("\x1b[31m%s\x1b[0m", "❌ Error en configuración SMTP:", error.message);
   } else {
      console.log("\x1b[35m%s\x1b[0m", "✅ Servidor SMTP listo para enviar correos");
   }
});

export async function sendEmail({ to, subject, html, text }) {
   try {
      const plainText = text || (html ? html.replace(/<[^>]*>/g, "") : "");
      const info = await transporter.sendMail({
         from: `"MovApp" <${process.env.SMTP_USER}>`,
         to,
         subject,
         html: html || plainText,
         text: plainText,
      });

      // console.log("\x1b[32m%s\x1b[0m", `✅ Correo enviado a ${to}`);
      // console.log("\x1b[36m%s\x1b[0m", `   Message ID: ${info.messageId}`);

      return info;
   } catch (err) {
      console.error("\x1b[31m%s\x1b[0m", "❌ Error al enviar correo:", err.message);
      console.error("\x1b[31m%s\x1b[0m", "   Código:", err.code);

      if (err.code === "EAUTH") {
         throw new Error("Error de autenticación. Verifica usuario y contraseña.");
      } else if (err.code === "ESOCKET") {
         throw new Error("Error de conexión con email");
      } else if (err.code === "ETIMEDOUT") {
         throw new Error("Tiempo de espera agotado conectando a email.");
      }

      throw new Error(`Error al enviar correo: ${err.message}`);
   }
}

export function recoveryEmailTemplate({ code, url, logoUrl }) {
   return `
      <html>
         <body style="font-family: Arial, sans-serif; background: #f6f8fa; margin:0; padding:0;">
            <div style="max-width: 400px; margin: 40px auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
               <div style="text-align: center; margin-bottom: 24px;">
                  <img src="${logoUrl}" alt="MovApp" style="width: 120px; margin-bottom: 20px;" />
               </div>
               <p style="font-size: 16px; color: #4a5568; margin-bottom: 24px;">
                  Usa el siguiente código para reestablecer tu contraseña:
               </p>
               <div style="font-size: 28px; font-weight: bold; color: #8149E2; letter-spacing: 4px; text-align: center; margin-bottom: 24px;">
                  ${code}
               </div>
              
               <p style="font-size: 13px; color: #a0aec0; text-align: center; margin-top: 32px;">
                  Si no solicitaste este cambio, ignora este correo.
               </p>
            </div>
         </body>
      </html>
   `;
}
