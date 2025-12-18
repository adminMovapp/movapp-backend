import nodemailer from "nodemailer";

const logoUrl = process.env.LOGO_URL || "https://movapp-images.sfo3.cdn.digitaloceanspaces.com/";

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

export function recoveryEmailTemplate({ code, url }) {
   return `
      <html>
         <body style="font-family: Arial, sans-serif; background: #f6f8fa; margin:0; padding:0;">
            <div style="max-width: 400px; margin: 40px auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
               <div style="text-align: center; margin-bottom: 24px;">
                  <img src="${logoUrl}logo_movapp.png" alt="MovApp" style="width: 120px; margin-bottom: 20px;" />
               </div>
               <p style="font-size: 16px; color: #4a5568; margin-bottom: 24px;">
                  Usa el siguiente código para reestablecer tu contraseña:
               </p>
               <div style="font-size: 28px; font-weight: bold, color: #8149E2; letter-spacing: 4px; text-align: center; margin-bottom: 24px;">
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

/**
 * Plantilla de email para confirmación de pago exitoso
 */
export async function sendPaymentSuccessEmail({
   to,
   amount,
   currency,
   paymentReference,
   orderNumber = null,
   items = [],
}) {
   try {
      const formattedAmount = Number(amount).toFixed(2);
      const currencyUpper = String(currency).toUpperCase();
      const year = new Date().getFullYear();
      const paymentDate = new Date().toLocaleDateString("es-MX", {
         year: "numeric",
         month: "long",
         day: "numeric",
      });

      // Generar HTML de items si existen
      let itemsHTML = "";
      if (items && items.length > 0) {
         itemsHTML = `
            <tr>
               <td colspan="2" style="padding: 16px 0 8px; font-size: 14px; color: #4a5568; border-top: 1px solid #e5e7eb;">
                  <strong>Detalle de productos:</strong>
               </td>
            </tr>
         `;

         items.forEach((item) => {
            const itemPrecio = Number(item.precio_unitario || 0);
            const itemCantidad = Number(item.cantidad || 1);
            const itemMoneda = String(item.moneda || currency).toUpperCase();
            const itemTotal = (itemPrecio * itemCantidad).toFixed(2);

            itemsHTML += `
            <tr>
               <td style="padding: 4px 0; font-size: 13px; color: #6b7280;">
                  ${item.nombre || "Producto"} ${itemCantidad > 1 ? `(x${itemCantidad})` : ""}
               </td>
               <td style="padding: 4px 0; font-size: 13px; color: #374151; text-align: right;">
                  $${itemTotal} ${itemMoneda}
               </td>
            </tr>
            `;
         });
      }

      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
   <meta charset="UTF-8" />
   <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
   <title>Confirmación de compra - Movapp</title>
</head>

<body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
   <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
      <tr>
         <td align="center">

         <!-- Card -->
         <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.08); overflow:hidden;">

            <!-- Header -->
            <tr>
               <td align="center" style="padding:40px 32px 24px;">
                  <img
                     src="${logoUrl}logo_movapp.png"
                     alt="Movapp"
                     width="140"
                     style="display:block; margin-bottom:24px;"
                  />
                  <h1 style="margin:0; font-size:26px; color:#1f2937;">
                     ¡Confirmación de compra!
                  </h1>
                  <p style="margin:8px 0 0; font-size:14px; color:#6b7280;">
                     ${paymentDate}
                  </p>
               </td>
            </tr>

            <!-- Content -->
            <tr>
               <td style="padding:32px 40px; color:#374151;">
                  <p style="font-size:16px; line-height:1.6; margin:0 0 24px; text-align:center;">
                     Hemos recibido tu pago exitosamente. A continuación encontrarás los detalles de tu compra.
                  </p>

                  <!-- Remisión / Recibo -->
                  <div style="background:#f9fafb; border-radius:8px; padding:24px; margin-bottom:24px; border:1px solid #e5e7eb;">
                     <table width="100%" cellpadding="0" cellspacing="0">
                        ${
                           orderNumber
                              ? `
                        <tr>
                           <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">
                              <strong>Número de Orden:</strong>
                           </td>
                           <td style="padding: 8px 0; font-size: 14px; color: #8149E2; text-align: right; font-weight: bold;">
                              ${orderNumber}
                           </td>
                        </tr>
                        `
                              : ""
                        }
                        <tr>
                           <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">
                              <strong>Referencia de Pago:</strong>
                           </td>
                           <td style="padding: 8px 0; font-size: 12px; color: #374151; text-align: right; font-family: monospace;">
                              ${paymentReference}
                           </td>
                        </tr>
                        ${itemsHTML}
                        <tr>
                           <td colspan="2" style="padding: 16px 0 8px; border-top: 2px solid #e5e7eb;">
                              <table width="100%">
                                 <tr>
                                    <td style="font-size: 16px; color: #1f2937; font-weight: bold;">
                                       Total pagado:
                                    </td>
                                    <td style="font-size: 20px; color: #8149E2; text-align: right; font-weight: bold;">
                                       $${formattedAmount} ${currencyUpper}
                                    </td>
                                 </tr>
                              </table>
                           </td>
                        </tr>
                     </table>
                  </div>

                  <p style="font-size:14px; line-height:1.6; color:#6b7280; margin:0; text-align:center;">
                     Guarda este correo como comprobante de tu compra. Si tienes alguna duda, contáctanos.
                  </p>
               </td>
            </tr>

            <!-- Footer -->
            <tr>
               <td align="center" style="padding:24px 32px; background:#f9fafb; border-top:1px solid #e5e7eb;">
                  <p style="font-size:12px; color:#9ca3af; margin:0;">
                     Este es un correo automático, por favor no respondas a este mensaje.
                  </p>
                  <p style="font-size:12px; color:#9ca3af; margin:8px 0 0;">
                     © ${year} Movapp. Todos los derechos reservados.
                  </p>
               </td>
            </tr>

         </table>

         </td>
      </tr>
   </table>
</body>
</html>
      `.trim();

      await sendEmail({
         to,
         subject: `Confirmación de compra ${orderNumber ? `- ${orderNumber}` : ""} - Movapp`,
         html,
      });

      console.log(`✅ Email de confirmación de pago enviado a: ${to}`);
   } catch (err) {
      console.error("❌ Error al enviar email de pago exitoso:", err.message || err);
      throw err;
   }
}

/**
 * Plantilla de email para fallo de pago
 */
export async function sendPaymentFailedEmail({ to, amount, currency, paymentReference, reason = "No especificada" }) {
   try {
      const formattedAmount = Number(amount).toFixed(2);
      const currencyUpper = String(currency).toUpperCase();

      const html = `
         <!DOCTYPE html>
         <html>
         <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pago No Procesado - MovApp</title>
         </head>
         <body style="font-family: Arial, sans-serif; background: #f6f8fa; margin:0; padding:0;">
            <div style="max-width: 400px; margin: 40px auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
               <div style="text-align: center; margin-bottom: 24px;">
                  <img src="${logoUrl}" alt="MovApp" style="width: 120px; margin-bottom: 20px;" />
               </div>
               
               <h2 style="font-size: 20px; color: #e53e3e; text-align: center; margin-bottom: 16px;">Pago No Procesado</h2>
               
               <p style="font-size: 14px; color: #4a5568; margin-bottom: 24px; text-align: center;">
                  Lamentablemente, no pudimos procesar tu pago.
               </p>
               
               <div style="background: #fff5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e53e3e;">
                  <table style="width: 100%; border-collapse: collapse;">
                     <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #4a5568;"><strong>Monto:</strong></td>
                        <td style="padding: 8px 0; font-size: 14px; color: #2d3748; text-align: right;">${formattedAmount} ${currencyUpper}</td>
                     </tr>
                     <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #4a5568;"><strong>Razón:</strong></td>
                        <td style="padding: 8px 0; font-size: 14px; color: #e53e3e; text-align: right;">${reason}</td>
                     </tr>
                     <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #4a5568;"><strong>Referencia:</strong></td>
                        <td style="padding: 8px 0; font-size: 12px; color: #718096; text-align: right; font-family: monospace;">${paymentReference}</td>
                     </tr>
                  </table>
               </div>
               
               <p style="font-size: 13px; color: #a0aec0; text-align: center; margin-top: 32px;">
                  Por favor, verifica tu método de pago e intenta nuevamente. Si el problema persiste, contacta a tu banco o a nuestro soporte.
               </p>
               
               <p style="font-size: 12px; color: #cbd5e0; text-align: center; margin-top: 16px; margin-bottom: 0;">
                  MovApp © ${new Date().getFullYear()}
               </p>
            </div>
         </body>
         </html>
      `.trim();

      await sendEmail({
         to,
         subject: "Pago No Procesado - MovApp",
         html,
      });

      console.log(`✅ Email de pago fallido enviado a: ${to}`);
   } catch (err) {
      console.error("❌ Error al enviar email de pago fallido:", err.message || err);
      throw err;
   }
}

/**
 * Plantilla de email para confirmación de registro
 */
export async function sendWelcomeEmail({ to, nombre }) {
   try {
      const year = new Date().getFullYear();

      const html = `
         <!DOCTYPE html>
         <html lang="es">
         <head>
         <meta charset="UTF-8" />
         <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
         <title>Bienvenido a Movapp</title>
         </head>

         <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
         <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
            <tr>
               <td align="center">

               <!-- Card -->
               <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.08); overflow:hidden;">

                  <!-- Header -->
                  <tr>
                     <td align="center" style="padding:40px 32px 24px;">
                     <img
                        src="${logoUrl}logo_movapp.png"
                        alt="Movapp"
                        width="140"
                        style="display:block; margin-bottom:24px;"
                     />
                     <h1 style="margin:0; font-size:26px; color:#1f2937;">
                        ¡Bienvenido a Movapp!
                     </h1>                    
                     </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                     <td style="padding:32px 40px; color:#374151;">
                     <p style="font-size:16px; line-height:1.6; margin:0 0 16px;">
                        Hola <strong>${nombre}</strong>,
                     </p>

                     <p style="font-size:15px; line-height:1.6; margin:0 0 24px;">
                        Gracias por registrarte en <strong>Movapp</strong>. 
                      </p>
                      <p style="font-size:15px; line-height:1.6; margin:0 0 24px;"> 
                        Ya puedes ingresar a nuestra aplicación y comenzar a disfrutar de todas sus funcionalidades y contenido exclusivo diseñado para ti.              
                        </p>    

               

                     <p style="font-size:14px; line-height:1.6; color:#6b7280; margin:24px 0 0;">
                        Si tienes alguna duda o necesitas ayuda, nuestro equipo de soporte está disponible para ti.
                     </p>
                     </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                     <td align="center" style="padding:24px 32px; background:#f9fafb; border-top:1px solid #e5e7eb;">
                     <p style="font-size:12px; color:#9ca3af; margin:0;">
                        Este correo fue enviado porque creaste una cuenta en Movapp.
                     </p>
                     <p style="font-size:12px; color:#9ca3af; margin:8px 0 0;">
                        © ${year} Movapp. Todos los derechos reservados.
                     </p>
                     </td>
                  </tr>

               </table>

               </td>
            </tr>
         </table>
         </body>
         </html>
    `.trim();

      await sendEmail({
         to,
         subject: "¡Bienvenido a Movapp!",
         html,
      });

      console.log(`✅ Email de bienvenida enviado a: ${to}`);
   } catch (err) {
      console.error("❌ Error al enviar email de bienvenida:", err.message || err);
      throw err;
   }
}
