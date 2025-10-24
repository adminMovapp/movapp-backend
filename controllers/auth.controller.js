import jwt from "jsonwebtoken";
import crypto from "crypto";
import { AuthDAO } from "../dao/authDAO.js";
import { sendEmail } from "../utils/mailer.js";
import { logAction } from "../utils/logger.js";

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_EXP_DAYS = 30;
const RESET_EXP_HOURS = 1;

function generateAccessToken(user) {
   console.log("\x1b[35m", "generateAccessToken", user);

   return jwt.sign({ id: user.user_uuid, email: user.email }, JWT_SECRET, { expiresIn: "15m" });
}
function generateRefreshToken() {
   return crypto.randomBytes(64).toString("hex");
}

export const AuthController = {
   registerUser: async (req, res) => {
      const { nombre, email, telefono, pais_id, cp, password, deviceId, platform, model, appVersion } = req.body;

      try {
         const existing = await AuthDAO.findUserByEmail(email);
         if (existing) {
            return res.status(400).json({ success: false, message: "Usuario ya registrado" });
         }

         const user = await AuthDAO.insertUser({ nombre, email, telefono, pais_id, cp, password });

         let device = null;
         if (deviceId) {
            const refreshHash = crypto.randomBytes(64).toString("hex");
            device = await AuthDAO.upsertDevice({
               deviceId,
               platform,
               model,
               appVersion,
               userId: user.id,
               refresh_hash: refreshHash,
            });

            await AuthDAO.insertRefreshToken({
               userId: user.id,
               deviceId: device.id,
               tokenHash: refreshHash,
               expiresAt: new Date(Date.now() + REFRESH_EXP_DAYS * 24 * 60 * 60 * 1000),
            });
         }

         const accessToken = generateAccessToken(user);

         await logAction({
            userId: user.id,
            deviceId,
            action: "registerUser",
            success: true,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
         });

         res.status(201).json({ success: true, user, accessToken, device });
      } catch (err) {
         console.error(err);
         await AuthDAO.insertAuditLog({ deviceId, action: "registerUser", success: false, ip: req.ip });
         res.status(500).json({ success: false, message: "Error al registrar usuario" });
      }
   },

   loginUser: async (req, res) => {
      const { email, password, deviceId, platform, model, appVersion } = req.body;

      try {
         const user = await AuthDAO.findUserByEmail(email);
         if (!user || user.password !== password) {
            await logAction({
               userId: user ? user.id : null,
               deviceId,
               action: "loginUser",
               success: false,
               ip: req.ip,
               userAgent: req.headers["user-agent"],
            });
            return res.status(401).json({ success: false, message: "Credenciales inválidas" });
         }

         let device = null;
         if (deviceId) {
            const refreshHash = crypto.randomBytes(64).toString("hex");
            device = await AuthDAO.upsertDevice({
               deviceId,
               platform,
               model,
               appVersion,
               userId: user.id,
               refresh_hash: refreshHash,
            });

            await AuthDAO.insertRefreshToken({
               userId: user.id,
               deviceId: device.id,
               tokenHash: refreshHash,
               expiresAt: new Date(Date.now() + REFRESH_EXP_DAYS * 24 * 60 * 60 * 1000),
            });
         }

         const accessToken = generateAccessToken(user);

         await logAction({
            userId: user.id,
            deviceId,
            action: "loginUser",
            success: true,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
         });

         res.json({ success: true, user, accessToken, device });
      } catch (err) {
         console.error(err);
         await logAction({ action: "loginUser", success: false, ip: req.ip });
         res.status(500).json({ success: false, message: "Error al iniciar sesión" });
      }
   },

   refreshToken: async (req, res) => {
      const { refreshToken, deviceId } = req.body;
      try {
         const tokenRow = await AuthDAO.findRefreshToken({ tokenHash: refreshToken, deviceId });
         if (!tokenRow) return res.status(401).json({ message: "Refresh token inválido o expirado" });

         const user = await AuthDAO.findUserById(tokenRow.user_id);
         if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

         const accessToken = generateAccessToken(user);
         res.json({ success: true, accessToken });
      } catch (err) {
         console.error(err);
         res.status(500).json({ success: false, message: "Error al refrescar token" });
      }
   },

   revokeDevice: async (req, res) => {
      const { deviceId } = req.body;
      try {
         await AuthDAO.revokeDeviceById(deviceId);

         await AuthDAO.insertAuditLog({
            deviceId,
            action: "revokeDevice",
            success: true,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
         });

         res.json({ success: true, message: "Dispositivo revocado" });
      } catch (err) {
         console.error(err);
         await AuthDAO.insertAuditLog({ action: "revokeDevice", success: false, ip: req.ip });
         res.status(500).json({ success: false, message: "Error al revocar dispositivo" });
      }
   },

   sendRecoveryEmail: async (req, res) => {
      const { email } = req.body;
      try {
         const user = await AuthDAO.findUserByEmail(email);
         if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado" });

         const token = generateRefreshToken(); // token aleatorio
         await AuthDAO.insertPasswordReset({
            userId: user.id,
            tokenHash: token,
            expiresAt: new Date(Date.now() + RESET_EXP_HOURS * 60 * 60 * 1000),
         });

         await sendEmail(email, "Recuperar contraseña", `Usa este token para restablecer: ${token}`);

         res.json({ success: true, message: "Correo de recuperación enviado" });
      } catch (err) {
         console.error(err);
         res.status(500).json({ success: false, message: "Error al enviar correo" });
      }
   },

   resetPassword: async (req, res) => {
      const { token, password } = req.body;
      try {
         const tokenRow = await AuthDAO.findPasswordReset(token);
         if (!tokenRow) return res.status(400).json({ success: false, message: "Token inválido o expirado" });

         await AuthDAO.updateUserPassword({ userId: tokenRow.user_id, password });
         await AuthDAO.deletePasswordResetsByUser(tokenRow.user_id);

         res.json({ success: true, message: "Contraseña restablecida" });
      } catch (err) {
         console.error(err);
         res.status(500).json({ success: false, message: "Error al restablecer contraseña" });
      }
   },
};
