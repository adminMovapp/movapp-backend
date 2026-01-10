// src/dao/authDAO.js
import { query, pool } from "../db/index.js";

/**
 * AuthDAO - operaciones sobre Usuarios, Dispositivos, Tokens y Logs.
 *  */

async function resolveDeviceInternalId(deviceIdentifier) {
   if (deviceIdentifier == null) return null;
   if (Number.isInteger(deviceIdentifier) || /^\d+$/.test(String(deviceIdentifier))) {
      const maybeId = parseInt(deviceIdentifier, 10);
      const r = await query("SELECT id FROM Dispositivos WHERE id = $1", [maybeId]);
      if (r.rows.length) return maybeId;
   }
   const r2 = await query("SELECT id FROM Dispositivos WHERE device_id = $1", [deviceIdentifier]);
   return r2.rows[0]?.id ?? null;
}

export const AuthDAO = {
   findUserByEmail: async (email) => {
      // console.log("🗄️ [DAO] findUserByEmail - Consultando email:", email);
      const result = await query("SELECT * FROM Usuarios WHERE email = $1 AND activo = TRUE", [email]);
      // console.log("🗄️ [DAO] Resultado:", result.rows.length > 0 ? "Usuario encontrado" : "No encontrado");
      return result.rows[0];
   },

   findUserByEmailIncludingInactive: async (email) => {
      // console.log("🗄️ [DAO] findUserByEmailIncludingInactive - Consultando email:", email);
      const result = await query("SELECT * FROM Usuarios WHERE email = $1", [email]);
      // console.log(
      //    "🗄️ [DAO] Resultado:",
      //    result.rows.length > 0 ? `Usuario encontrado (activo: ${result.rows[0]?.activo})` : "No encontrado",
      // );
      return result.rows[0];
   },

   insertUser: async ({ nombre, email, telefono, pais_id, cp, password }) => {
      // console.log("🗄️ [DAO] insertUser - Insertando usuario:", { nombre, email, telefono, pais_id, cp });
      const result = await query(
         `INSERT INTO Usuarios (nombre, email, telefono, pais_id, cp, password)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, user_uuid, nombre, email, telefono, pais_id, cp, created_at`,
         [nombre, email, telefono, pais_id, cp, password],
      );
      // console.log("✅ [DAO] Usuario insertado con ID:", result.rows[0]?.id);
      return result.rows[0];
   },

   reactivateUser: async ({ userId, nombre, telefono, pais_id, cp, password }) => {
      // console.log("🔄 [DAO] reactivateUser - Reactivando usuario ID:", userId);
      const result = await query(
         `UPDATE Usuarios 
          SET nombre = $1, telefono = $2, pais_id = $3, cp = $4, password = $5, 
              activo = TRUE, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $6 
          RETURNING id, user_uuid, nombre, email, telefono, pais_id, cp, created_at`,
         [nombre, telefono, pais_id, cp, password, userId],
      );
      // console.log("✅ [DAO] Usuario reactivado con ID:", result.rows[0]?.id);
      return result.rows[0];
   },

   upsertDevice: async ({ deviceId, device, platform, model, appVersion, userId, refresh_hash = null }) => {
      // console.log("🗄️ [DAO] upsertDevice - deviceId:", deviceId, "userId:", userId);
      const result = await query(
         `INSERT INTO Dispositivos (device_id, device, platform, model, app_version, user_id, refresh_hash, revoked)
             VALUES ($1,$2,$3,$4,$5,$6,$7, FALSE)
                ON CONFLICT (device_id) DO UPDATE SET
                    platform = EXCLUDED.platform,
                    model = EXCLUDED.model,
                    app_version = EXCLUDED.app_version,
         user_id = EXCLUDED.user_id,
         refresh_hash = COALESCE(EXCLUDED.refresh_hash, Dispositivos.refresh_hash),
         revoked = FALSE,
         last_seen_at = CURRENT_TIMESTAMP
       RETURNING id, device_id, user_id, refresh_hash, revoked`,
         [deviceId, device, platform, model, appVersion, userId, refresh_hash],
      );
      // console.log("✅ [DAO] Dispositivo upserted con ID:", result.rows[0]?.id);
      return result.rows[0];
   },

   insertRefreshToken: async ({ userId, deviceId, tokenHash, expiresAt }) => {
      const internalId = await resolveDeviceInternalId(deviceId);
      await query(
         `INSERT INTO Refresh_Tokens (user_id, device_id, token_hash, expires_at)
       VALUES ($1,$2,$3,$4)`,
         [userId, internalId, tokenHash, expiresAt],
      );
   },

   findRefreshToken: async ({ tokenHash, deviceId }) => {
      const internalId = await resolveDeviceInternalId(deviceId);
      let result;
      if (internalId == null) {
         result = await query(
            `SELECT * FROM refresh_tokens
            WHERE token_hash = $1
             AND expires_at > NOW()`,
            [tokenHash],
         );
      } else {
         result = await query(
            `SELECT * FROM refresh_tokens
            WHERE token_hash = $1
             AND device_id = $2
             AND expires_at > NOW()`,
            [tokenHash, internalId],
         );
      }
      return result.rows[0];
   },

   insertPasswordReset: async ({ userId, tokenHash, expiresAt }) => {
      await query(
         `INSERT INTO Password_Reset_Tokens (user_id, token_hash, expires_at)
            VALUES ($1,$2,$3)`,
         [userId, tokenHash, expiresAt],
      );
   },

   updateUserPassword: async ({ userId, password }) => {
      await query(`UPDATE Usuarios SET password = $1 WHERE id = $2`, [password, userId]);
   },

   updatePasswordResetsByUser: async (userId, code) => {
      await query(
         `UPDATE Password_Reset_Tokens
       SET used = TRUE, updated_at = NOW()
       WHERE user_id = $1 AND token_hash = $2 AND used = FALSE`,
         [userId, code],
      );
   },

   revokeDeviceById: async (deviceIdentifier) => {
      const internalId = await resolveDeviceInternalId(deviceIdentifier);
      if (internalId == null) {
         await query(`UPDATE Dispositivos SET revoked = true WHERE device_id = $1`, [deviceIdentifier]);
         return;
      }
      await query(`UPDATE Dispositivos SET revoked = true WHERE id = $1`, [internalId]);
   },

   getUserDevices: async (userId) => {
      const result = await query(
         "SELECT device_id, device, platform, model, revoked FROM Dispositivos WHERE user_id = $1",
         [userId],
      );
      return result.rows;
   },

   insertAuditLog: async ({
      userId = null,
      deviceId = null,
      action = "",
      success = false,
      ip = null,
      userAgent = null,
   }) => {
      let deviceStr = null;
      if (deviceId != null) {
         if (Number.isInteger(deviceId) || /^\d+$/.test(String(deviceId))) {
            const r = await query("SELECT device_id FROM Dispositivos WHERE id = $1", [deviceId]);
            deviceStr = r.rows[0]?.device_id ?? String(deviceId);
         } else {
            deviceStr = String(deviceId);
         }
      }
      await query(
         `INSERT INTO Audit_Logs (user_id, device_id, action, success, ip_address, user_agent)
          VALUES ($1,$2,$3,$4,$5,$6)`,
         [userId, deviceStr, action, success, ip, userAgent],
      );
   },

   findUserById: async (userId) => {
      const result = await query("SELECT * FROM Usuarios WHERE id = $1 AND activo = TRUE", [userId]);
      return result.rows[0];
   },

   findUserByUuid: async (userUuid) => {
      const result = await query("SELECT * FROM Usuarios WHERE user_uuid = $1 AND activo = TRUE", [userUuid]);
      return result.rows[0];
   },

   findPasswordResetByCode: async (userId, code) => {
      const result = await query(
         `SELECT * FROM Password_Reset_Tokens
       WHERE user_id = $1
         AND token_hash = $2
         AND expires_at > NOW()
         AND used = FALSE
       LIMIT 1`,
         [userId, code],
      );
      return result.rows[0];
   },

   countRecentPasswordResetAttempts: async (userId, windowMinutes = 60) => {
      const result = await query(
         `SELECT COUNT(*) FROM password_reset_tokens
       WHERE user_id = $1
         AND used = FALSE
         AND expires_at > NOW()
         AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
         [userId],
      );
      return parseInt(result.rows[0].count, 10);
   },

   /**
    * Elimina lógicamente una cuenta de usuario (marca como inactivo)
    * Mantiene todos los registros relacionados para auditoría
    */
   deleteUserAccount: async (userUuid) => {
      // console.log("🗑️ [DAO] deleteUserAccount - Borrado lógico de usuario UUID:", userUuid);

      // Iniciar transacción para marcar usuario como inactivo
      const client = await pool.connect();
      try {
         await client.query("BEGIN");

         // Obtener el ID interno del usuario primero
         const userResult = await client.query("SELECT id FROM Usuarios WHERE user_uuid = $1 AND activo = TRUE", [
            userUuid,
         ]);

         if (!userResult.rows.length) {
            await client.query("ROLLBACK");
            // console.log("⚠️ [DAO] Usuario no encontrado o ya inactivo");
            return null;
         }

         const userId = userResult.rows[0].id;

         // Marcar usuario como inactivo (borrado lógico)
         const result = await client.query(
            "UPDATE Usuarios SET activo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_uuid = $1 RETURNING user_uuid, email, activo",
            [userUuid],
         );
         // console.log("✅ [DAO] Usuario marcado como inactivo:", result.rows[0]);

         // Revocar todos los dispositivos asociados
         await client.query(
            "UPDATE Dispositivos SET revoked = TRUE, push_enabled = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
            [userId],
         );
         // console.log("✅ [DAO] Dispositivos revocados");

         // Eliminar tokens de refresh activos (por seguridad)
         await client.query("DELETE FROM Refresh_Tokens WHERE user_id = $1", [userId]);
         // console.log("✅ [DAO] Refresh tokens eliminados");

         // Eliminar tokens de recuperación de contraseña pendientes
         await client.query("DELETE FROM Password_Reset_Tokens WHERE user_id = $1", [userId]);
         // console.log("✅ [DAO] Password reset tokens eliminados");

         // Los Audit_Logs se mantienen para historial completo

         await client.query("COMMIT");
         return result.rows[0];
      } catch (error) {
         await client.query("ROLLBACK");
         console.error("❌ [DAO] Error en borrado lógico:", error);
         throw error;
      } finally {
         client.release();
      }
   },
};
