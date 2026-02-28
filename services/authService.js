// ============================================
// services/authService.js
// Lógica de negocio de autenticación
// ============================================

import { AuthDAO } from "../dao/authDAO.js";
import { TokenService } from "./tokenService.js";
import { DeviceService } from "./deviceService.js";
import { hashPassword, validatePassword, decryptAES } from "../utils/authUtils.js";
import { logAction } from "../utils/logger.js";
import { sendWelcomeEmail } from "../utils/mailer.js";

export const AuthService = {
   async register(userData, deviceInfo, requestInfo) {
      //console.log("🔧 [Service] register - Iniciando registro");
      //console.log("📋 [Service] userData:", { ...userData, password: "***" });
      //console.log("📋 [Service] deviceInfo:", deviceInfo);

      //console.log("🔍 [Service] Verificando si el email ya existe...");
      const existing = await AuthDAO.findUserByEmailIncludingInactive(userData.email);
      //console.log("🔍 [Service] Usuario existente:", existing ? "SÍ" : "NO");

      // if (existing && existing.activo) {
      if (existing) {
         // Usuario activo ya existe
         throw new Error("USER_ALREADY_EXISTS");
      }

      //console.log("🔐 [Service] Hasheando contraseña...");
      const hashedPassword = await this.preparePassword(userData.password);
      //console.log("✅ [Service] Contraseña hasheada");

      let user;
      if (existing && !existing.activo) {
         // Reactivar cuenta inactiva
         console.log("🔄 [Service] Reactivando cuenta inactiva para:", userData.email);
         user = await AuthDAO.reactivateUser({
            userId: existing.id,
            nombre: userData.nombre,
            telefono: userData.telefono,
            pais_id: userData.pais_id,
            cp: userData.cp,
            password: hashedPassword,
         });
         console.log("✅ [Service] Cuenta reactivada exitosamente");
      } else {
         // Insertar nuevo usuario
         //console.log("💾 [Service] Insertando usuario en BD...");
         user = await AuthDAO.insertUser({
            ...userData,
            password: hashedPassword,
         });
         //console.log("✅ [Service] Usuario insertado:", { id: user.id, email: user.email });
      }

      // Enviar email de bienvenida (no fatal)
      try {
         await sendWelcomeEmail({
            to: user.email,
            nombre: user.nombre,
         });
      } catch (mailErr) {
         console.error("❌ Error al enviar email de bienvenida (no fatal):", mailErr.message || mailErr);
      }

      const { accessToken, device } = await this.createSession(user, deviceInfo, requestInfo);

      await logAction({
         userId: user.id,
         deviceId: deviceInfo?.deviceId,
         action: existing && !existing.activo ? "reactivateAccount" : "registerUser",
         success: true,
         ...requestInfo,
      });

      return { user, accessToken, device };
   },

   /**
    * Autentica un usuario
    */
   async login(credentials, deviceInfo, requestInfo) {
      //console.log("🔧 [Service] login - Iniciando login");
      //console.log("📋 [Service] email:", credentials.email);
      //console.log("📋 [Service] deviceInfo:", deviceInfo);

      //console.log("🔍 [Service] Buscando usuario por email...");
      const user = await AuthDAO.findUserByEmail(credentials.email);
      //console.log("🔍 [Service] Usuario encontrado:", user ? "SÍ" : "NO");
      if (!user) {
         throw new Error("INVALID_CREDENTIALS");
      }

      //console.log("🔐 [Service] Validando contraseña...");
      const plainPassword = this.decryptIfNeeded(credentials.password);
      const valid = await validatePassword(plainPassword, user.password);
      //console.log("🔐 [Service] Contraseña válida:", valid ? "SÍ" : "NO");

      if (!valid) {
         await logAction({
            userId: user.id,
            deviceId: deviceInfo?.deviceId,
            action: "loginUser",
            success: false,
            ...requestInfo,
         });
         throw new Error("INVALID_CREDENTIALS");
      }

      const { accessToken, device } = await this.createSession(user, deviceInfo, requestInfo);

      await logAction({
         userId: user.id,
         deviceId: deviceInfo?.deviceId,
         action: "loginUser",
         success: true,
         ...requestInfo,
      });

      return { user, accessToken, device };
   },

   /**
    * Crea una sesión completa (access token + refresh token + dispositivo)
    */
   async createSession(user, deviceInfo, requestInfo) {
      //console.log("🎫 [Service] createSession - Generando access token...");
      const accessToken = TokenService.generateAccessToken(user);
      //console.log("✅ [Service] Access token generado");

      //console.log("📱 [Service] Registrando dispositivo...");
      const device = deviceInfo?.deviceId
         ? await DeviceService.registerDeviceWithRefreshToken(user.id, deviceInfo)
         : null;
      //console.log("✅ [Service] Dispositivo registrado:", device?.device_id || "sin dispositivo");

      return { accessToken, device };
   },

   /**
    * Prepara y hashea una contraseña
    */
   async preparePassword(password) {
      const plainPassword = this.decryptIfNeeded(password);
      return await hashPassword(plainPassword);
   },

   /**
    * Desencripta la contraseña si está cifrada
    */
   decryptIfNeeded(password) {
      return password && password.startsWith("U2F") ? decryptAES(password) : password;
   },

   /**
    * Refresca un access token
    */
   async refreshAccessToken(refreshToken, deviceId) {
      const tokenRow = await AuthDAO.findRefreshToken({
         tokenHash: refreshToken,
         deviceId,
      });

      //console.log("\x1b[35m", "tokenRow =>", tokenRow);

      if (!tokenRow) {
         throw new Error("INVALID_REFRESH_TOKEN");
      }

      const user = await AuthDAO.findUserById(tokenRow.user_id);
      if (!user) {
         throw new Error("USER_NOT_FOUND");
      }
      //console.log("\x1b[34m", "user =>", user);

      const accessToken = TokenService.generateAccessToken(user);
      return { accessToken };
   },

   /**
    * Revoca un dispositivo
    */
   async revokeDevice(deviceId, requestInfo) {
      await AuthDAO.revokeDeviceById(deviceId);

      // await AuthDAO.insertAuditLog({
      //    deviceId,
      //    action: "revokeDevice",
      //    success: true,
      //    ...requestInfo,
      // });
      const device = await AuthDAO.findDeviceById(deviceId);
      if (!device) {
         throw new Error("DEVICE_NOT_FOUND");
      }
      await logAction({
         userId: user.id,
         deviceId: deviceInfo?.deviceId,
         action: "revokeDevice",
         success: true,
         ...requestInfo,
      });

      return { success: true };
   },

   /**
    * Desactiva una cuenta de usuario (borrado lógico)
    * Mantiene los registros para auditoría
    */
   async deleteAccount(userUuid, requestInfo) {
      console.log("🔧 [Service] deleteAccount - Iniciando desactivación de cuenta (borrado lógico)");
      console.log("📋 [Service] userUuid:", userUuid);

      // Verificar que el usuario existe y está activo
      const user = await AuthDAO.findUserByUuid(userUuid);
      if (!user) {
         throw new Error("USER_NOT_FOUND");
      }

      console.log("🗑️ [Service] Usuario encontrado, procediendo a desactivar...");

      // Obtener dispositivos del usuario antes de revocarlos
      const devices = await AuthDAO.getUserDevices(user.id);
      console.log("📱 [Service] Dispositivos encontrados:", devices.length);

      // Registrar acción antes de desactivar (usando el ID interno del usuario y primer dispositivo si existe)
      await logAction({
         userId: user.id,
         deviceId: devices[0]?.device_id || null,
         action: "deleteAccount",
         success: true,
         ...requestInfo,
      });

      // Marcar cuenta como inactiva (borrado lógico)
      const deletedUser = await AuthDAO.deleteUserAccount(userUuid);
      console.log("✅ [Service] Cuenta desactivada exitosamente (borrado lógico)");

      return { success: true, deletedUser, message: "Cuenta desactivada. Los registros se mantienen para auditoría." };
   },
};
