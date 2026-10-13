// ============================================
// dao/notificationDAO.js
// Data Access Object para notificaciones y tokens push
// ============================================
import { query } from "../db/index.js";

export const NotificationDAO = {
   /**
    * Registra o actualiza el push token de un dispositivo.
    * Un token identifica una instalación física, así que primero se retira de
    * cualquier otra fila que lo tuviera (reinstalaciones generan deviceId
    * nuevo): sin esto, send-to-user y broadcast mandan la misma push varias
    * veces al mismo teléfono.
    */
   async updatePushToken(deviceId, pushToken) {
      try {
         const result = await query(
            `WITH limpiadas AS (
                UPDATE Dispositivos
                SET push_token = NULL, updated_at = NOW()
                WHERE push_token = $1 AND device_id <> $2
             )
             UPDATE Dispositivos
             SET push_token = $1, push_enabled = TRUE, updated_at = NOW()
             WHERE device_id = $2
             RETURNING *`,
            [pushToken, deviceId],
         );
         return result.rows[0];
      } catch (err) {
         console.error("NotificationDAO.updatePushToken error", err);
         throw err;
      }
   },

   /**
    * Indica si el dispositivo pertenece al usuario (user_uuid del JWT).
    * Devuelve null si el dispositivo no existe.
    */
   async deviceBelongsToUser(deviceId, userUuid) {
      try {
         const result = await query(
            `SELECT u.user_uuid = $2 AS es_dueno
             FROM Dispositivos d
             INNER JOIN Usuarios u ON d.user_id = u.id
             WHERE d.device_id = $1`,
            [deviceId, userUuid],
         );
         if (result.rows.length === 0) return null;
         return result.rows[0].es_dueno === true;
      } catch (err) {
         console.error("NotificationDAO.deviceBelongsToUser error", err);
         throw err;
      }
   },

   /**
    * Habilita o desactiva las notificaciones push de un dispositivo
    */
   async updatePushNotificationStatus(deviceId, enabled) {
      try {
         const result = await query(
            `UPDATE Dispositivos 
             SET push_enabled = $1, updated_at = NOW()
             WHERE device_id = $2
             RETURNING *`,
            [enabled, deviceId],
         );
         return result.rows[0];
      } catch (err) {
         console.error("NotificationDAO.updatePushNotificationStatus error", err);
         throw err;
      }
   },

   /**
    * Desactiva las notificaciones push de un dispositivo (backward compatibility)
    */
   async disablePushNotifications(deviceId) {
      return this.updatePushNotificationStatus(deviceId, false);
   },

   /**
    * Obtiene el push token de un dispositivo específico
    */
   async getPushTokenByDeviceId(deviceId) {
      try {
         const result = await query(
            `SELECT push_token, push_enabled 
             FROM Dispositivos 
             WHERE device_id = $1 AND push_enabled = TRUE AND revoked = FALSE`,
            [deviceId],
         );
         return result.rows[0]?.push_token;
      } catch (err) {
         console.error("NotificationDAO.getPushTokenByDeviceId error", err);
         throw err;
      }
   },

   /**
    * Obtiene todos los push tokens de un usuario
    */
   async getPushTokensByUserId(userId) {
      try {
         const result = await query(
            `SELECT push_token 
             FROM Dispositivos 
             WHERE user_id = $1 
               AND push_token IS NOT NULL 
               AND push_enabled = TRUE 
               AND revoked = FALSE`,
            [userId],
         );
         return result.rows.map((row) => row.push_token).filter(Boolean);
      } catch (err) {
         console.error("NotificationDAO.getPushTokensByUserId error", err);
         throw err;
      }
   },

   /**
    * Obtiene todos los push tokens de usuarios por user_uuid
    */
   async getPushTokensByUserUuid(userUuid) {
      try {
         const result = await query(
            `SELECT d.push_token 
             FROM Dispositivos d
             INNER JOIN Usuarios u ON d.user_id = u.id
             WHERE u.user_uuid = $1 
               AND d.push_token IS NOT NULL 
               AND d.push_enabled = TRUE 
               AND d.revoked = FALSE`,
            [userUuid],
         );
         return result.rows.map((row) => row.push_token).filter(Boolean);
      } catch (err) {
         console.error("NotificationDAO.getPushTokensByUserUuid error", err);
         throw err;
      }
   },

   /**
    * Obtiene información del dispositivo por push token
    */
   async getDeviceByPushToken(pushToken) {
      try {
         const result = await query(
            `SELECT d.*, u.user_uuid, u.nombre, u.email
             FROM Dispositivos d
             INNER JOIN Usuarios u ON d.user_id = u.id
             WHERE d.push_token = $1`,
            [pushToken],
         );
         return result.rows[0];
      } catch (err) {
         console.error("NotificationDAO.getDeviceByPushToken error", err);
         throw err;
      }
   },

   /**
    * Obtiene todos los tokens push activos (para envíos masivos)
    */
   async getAllActivePushTokens() {
      try {
         const result = await query(
            `SELECT push_token 
             FROM Dispositivos 
             WHERE push_token IS NOT NULL 
               AND push_enabled = TRUE 
               AND revoked = FALSE`,
         );
         return result.rows.map((row) => row.push_token).filter(Boolean);
      } catch (err) {
         console.error("NotificationDAO.getAllActivePushTokens error", err);
         throw err;
      }
   },

   /**
    * Elimina el push token de un dispositivo
    */
   async removePushToken(deviceId) {
      try {
         const result = await query(
            `UPDATE Dispositivos 
             SET push_token = NULL, push_enabled = FALSE, updated_at = NOW()
             WHERE device_id = $1
             RETURNING *`,
            [deviceId],
         );
         return result.rows[0];
      } catch (err) {
         console.error("NotificationDAO.removePushToken error", err);
         throw err;
      }
   },

   /**
    * Obtiene el push_token y push_enabled de un dispositivo
    */
   async getDevicePushInfo(deviceId) {
      try {
         const result = await query(
            `SELECT device_id, push_token, push_enabled, device, platform, model 
             FROM Dispositivos 
             WHERE device_id = $1`,
            [deviceId],
         );
         return result.rows[0];
      } catch (err) {
         console.error("NotificationDAO.getDevicePushInfo error", err);
         throw err;
      }
   },
};
