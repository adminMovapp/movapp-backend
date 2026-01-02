// src/dao/authDAO.js
import { query } from "../db/index.js";

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
      console.log("🗄️ [DAO] findUserByEmail - Consultando email:", email);
      const result = await query("SELECT * FROM Usuarios WHERE email = $1", [email]);
      console.log("🗄️ [DAO] Resultado:", result.rows.length > 0 ? "Usuario encontrado" : "No encontrado");
      return result.rows[0];
   },

   insertUser: async ({ nombre, email, telefono, pais_id, cp, password }) => {
      console.log("🗄️ [DAO] insertUser - Insertando usuario:", { nombre, email, telefono, pais_id, cp });
      const result = await query(
         `INSERT INTO Usuarios (nombre, email, telefono, pais_id, cp, password)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, user_uuid, nombre, email, telefono, pais_id, cp, created_at`,
         [nombre, email, telefono, pais_id, cp, password],
      );
      console.log("✅ [DAO] Usuario insertado con ID:", result.rows[0]?.id);
      return result.rows[0];
   },

   upsertDevice: async ({ deviceId, device, platform, model, appVersion, userId, refresh_hash = null }) => {
      console.log("🗄️ [DAO] upsertDevice - deviceId:", deviceId, "userId:", userId);
      const result = await query(
         `INSERT INTO Dispositivos (device_id, device, platform, model, app_version, user_id, refresh_hash)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
                ON CONFLICT (device_id) DO UPDATE SET
                    platform = EXCLUDED.platform,
                    model = EXCLUDED.model,
                    app_version = EXCLUDED.app_version,
         user_id = EXCLUDED.user_id,
         refresh_hash = COALESCE(EXCLUDED.refresh_hash, Dispositivos.refresh_hash),
         last_seen_at = CURRENT_TIMESTAMP
       RETURNING id, device_id, user_id, refresh_hash`,
         [deviceId, device, platform, model, appVersion, userId, refresh_hash],
      );
      console.log("✅ [DAO] Dispositivo upserted con ID:", result.rows[0]?.id);
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
      const result = await query("SELECT * FROM Usuarios WHERE id = $1", [userId]);
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
};
