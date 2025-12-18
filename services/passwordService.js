// ============================================
// services/passwordService.js
// Recuperación y reseteo de contraseñas
// ============================================
import { AuthDAO } from "../dao/authDAO.js";
import { sendEmail, recoveryEmailTemplate } from "../utils/mailer.js";
import { generateResetCode, hashPassword } from "../utils/authUtils.js";
import { AuthService } from "./authService.js";

const RESET_CODE_EXP_MINUTES = 5;
const MAX_ATTEMPTS = 3;
const WINDOW_MINUTES = 60;

export const PasswordService = {
   /**
    * Envía código de recuperación por email
    */
   async sendRecoveryCode(email) {
      const user = await AuthDAO.findUserByEmail(email);
      if (!user) {
         throw new Error("USER_NOT_FOUND");
      }

      const attempts = await AuthDAO.countRecentPasswordResetAttempts(user.id, WINDOW_MINUTES);
      if (attempts >= MAX_ATTEMPTS) {
         throw new Error("TOO_MANY_ATTEMPTS");
      }

      const code = generateResetCode();
      //   console.log("\x1b[32m%s\x1b[0m", "code:", code);

      await AuthDAO.insertPasswordReset({
         userId: user.id,
         tokenHash: code,
         expiresAt: new Date(Date.now() + RESET_CODE_EXP_MINUTES * 60 * 1000),
      });

      const appLink = `movapp://reset-pass?email=${encodeURIComponent(email)}&code=${code}`;

      const html = recoveryEmailTemplate({
         code,
         url: appLink,
      });

      await sendEmail({
         to: email,
         subject: "Recuperar contraseña",
         html,
      });

      return { success: true };
   },

   /**
    * Resetea la contraseña con el código de recuperación
    */
   async resetPassword(email, code, newPassword, deviceInfo, requestInfo) {
      const user = await AuthDAO.findUserByEmail(email);
      if (!user) {
         throw new Error("USER_NOT_FOUND");
      }

      const tokenRow = await AuthDAO.findPasswordResetByCode(user.id, code);
      if (!tokenRow) {
         throw new Error("INVALID_OR_EXPIRED_CODE");
      }

      const hashedPassword = await hashPassword(newPassword);

      await AuthDAO.updateUserPassword({
         userId: user.id,
         password: hashedPassword,
      });

      await AuthDAO.updatePasswordResetsByUser(user.id, code);

      // Crear nueva sesión
      const { accessToken, device } = await AuthService.createSession(user, deviceInfo, requestInfo);

      return { user, accessToken, device };
   },
};
