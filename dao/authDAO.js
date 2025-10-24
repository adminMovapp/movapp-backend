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
      const result = await query("SELECT * FROM Usuarios WHERE email = $1", [email]);
      return result.rows[0];
   },

   findUserByPhone: async (telefono) => {
      const result = await query("SELECT * FROM Usuarios WHERE telefono = $1", [telefono]);
      return result.rows[0];
   },

   findUserBasicByEmail: async (email) => {
      const result = await query("SELECT id, nombre, email FROM Usuarios WHERE email = $1", [email]);
      return result.rows[0];
   },

   insertUser: async ({ nombre, email, telefono, pais_id, cp, password }) => {
      const result = await query(
         `INSERT INTO Usuarios (nombre, email, telefono, pais_id, cp, password)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, user_uuid, nombre, email, telefono, pais_id, cp, created_at`,
         [nombre, email, telefono, pais_id, cp, password],
      );
      return result.rows[0];
   },

   upsertDevice: async ({ deviceId, platform, model, appVersion, userId, refresh_hash = null }) => {
      const result = await query(
         `INSERT INTO Dispositivos (device_id, platform, model, app_version, user_id, refresh_hash)
             VALUES ($1,$2,$3,$4,$5,$6)
                ON CONFLICT (device_id) DO UPDATE SET
                    platform = EXCLUDED.platform,
                    model = EXCLUDED.model,
                    app_version = EXCLUDED.app_version,
         user_id = EXCLUDED.user_id,
         refresh_hash = COALESCE(EXCLUDED.refresh_hash, Dispositivos.refresh_hash),
         last_seen_at = CURRENT_TIMESTAMP
       RETURNING id, device_id, user_id, refresh_hash`,
         [deviceId, platform, model, appVersion, userId, refresh_hash],
      );
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

   deleteRefreshTokensByDevice: async (deviceIdentifier) => {
      const internalId = await resolveDeviceInternalId(deviceIdentifier);
      if (internalId == null) {
         await query(
            `DELETE FROM Refresh_Tokens WHERE device_id IN (SELECT id FROM Dispositivos WHERE device_id = $1)`,
            [deviceIdentifier],
         );
         return;
      }
      await query(`DELETE FROM Refresh_Tokens WHERE device_id = $1`, [internalId]);
   },

   insertPasswordReset: async ({ userId, tokenHash, expiresAt }) => {
      await query(
         `INSERT INTO Password_Reset_Tokens (user_id, token_hash, expires_at)
            VALUES ($1,$2,$3)`,
         [userId, tokenHash, expiresAt],
      );
   },

   findPasswordReset: async (tokenHash) => {
      const result = await query(
         `SELECT id, user_id FROM Password_Reset_Tokens
                WHERE token_hash = $1
                AND expires_at > NOW()
                AND used = FALSE
            LIMIT 1`,
         [tokenHash],
      );
      return result.rows[0];
   },

   updateUserPassword: async ({ userId, password }) => {
      await query(`UPDATE Usuarios SET password = $1 WHERE id = $2`, [password, userId]);
   },

   deletePasswordResetsByUser: async (userId) => {
      await query(`DELETE FROM Password_Reset_Tokens WHERE user_id = $1`, [userId]);
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
};
