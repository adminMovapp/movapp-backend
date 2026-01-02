// ============================================
// services/deviceService.js
// Manejo de dispositivos y sus refresh tokens
// ============================================
import { AuthDAO } from "../dao/authDAO.js";
import { TokenService } from "./tokenService.js";

export const DeviceService = {
   /**
    * Registra/actualiza un dispositivo y genera su refresh token
    */
   async registerDeviceWithRefreshToken(userId, deviceInfo) {
      console.log("📱 [DeviceService] Registrando dispositivo para userId:", userId);
      if (!deviceInfo?.deviceId) {
         console.log("⚠️ [DeviceService] No deviceId, retornando null");
         return null;
      }

      const { deviceId, device, platform, model, appVersion } = deviceInfo;
      console.log("🔑 [DeviceService] Generando refresh token...");
      const refreshHash = TokenService.generateRefreshToken();
      console.log("✅ [DeviceService] Refresh token generado");

      console.log("💾 [DeviceService] Haciendo upsert del dispositivo...");
      const deviceResp = await AuthDAO.upsertDevice({
         deviceId,
         device,
         platform,
         model,
         appVersion,
         userId,
         refresh_hash: refreshHash,
      });
      console.log("✅ [DeviceService] Dispositivo upserted");

      console.log("💾 [DeviceService] Insertando refresh token...");
      await AuthDAO.insertRefreshToken({
         userId,
         deviceId: deviceResp.device_id,
         tokenHash: refreshHash,
         expiresAt: TokenService.getRefreshTokenExpiration(),
      });
      console.log("✅ [DeviceService] Refresh token insertado");

      return deviceResp;
   },

   /**
    * Lista todos los dispositivos de un usuario
    */
   async getUserDevices(userId) {
      return await AuthDAO.findDevicesByUserId(userId);
   },

   /**
    * Revoca un dispositivo específico
    */
   async revokeDevice(deviceId) {
      return await AuthDAO.revokeDeviceById(deviceId);
   },

   /**
    * Revoca todos los dispositivos de un usuario
    */
   async revokeAllUserDevices(userId) {
      return await AuthDAO.revokeDevicesByUserId(userId);
   },
};
