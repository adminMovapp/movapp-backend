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
      if (!deviceInfo?.deviceId) return null;

      const { deviceId, device, platform, model, appVersion } = deviceInfo;
      const refreshHash = TokenService.generateRefreshToken();

      const deviceResp = await AuthDAO.upsertDevice({
         deviceId,
         device,

         platform,
         model,
         appVersion,
         userId,
         refresh_hash: refreshHash,
      });

      // console.log("\x1b[34m", "deviceResp:", deviceResp);

      await AuthDAO.insertRefreshToken({
         userId,
         deviceId: deviceResp.device_id,
         tokenHash: refreshHash,
         expiresAt: TokenService.getRefreshTokenExpiration(),
      });

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
