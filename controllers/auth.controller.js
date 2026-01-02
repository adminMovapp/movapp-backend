// ============================================
// controllers/authController.js
// ============================================
import { AuthService } from "../services/authService.js";
import { PasswordService } from "../services/passwordService.js";
import { sendSessionResponse } from "../utils/authUtils.js";

const ERROR_MESSAGES = {
   USER_ALREADY_EXISTS: "Usuario ya registrado",
   INVALID_CREDENTIALS: "Credenciales inválidas",
   USER_NOT_FOUND: "Usuario no encontrado",
   INVALID_REFRESH_TOKEN: "Refresh token inválido o expirado",
   INVALID_OR_EXPIRED_CODE: "Código inválido o expirado",
   INVALID_CURRENT_PASSWORD: "Contraseña actual incorrecta",
   TOO_MANY_ATTEMPTS:
      "Has solicitado demasiados códigos de recuperación. Por favor, espera antes de volver a intentarlo.",
};

function getRequestInfo(req) {
   return {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
   };
}

function handleError(res, error) {
   console.error("\x1b[31m", "Error:", error);
   const message = ERROR_MESSAGES[error.message] || "Error en el servidor";

   // Determinar status code apropiado
   let status = 500;
   if (error.message === "INVALID_CREDENTIALS") {
      status = 401;
   } else if (error.message === "INVALID_REFRESH_TOKEN") {
      status = 401;
   } else if (error.message === "USER_ALREADY_EXISTS") {
      status = 409; // Conflict
   } else if (error.message === "USER_NOT_FOUND") {
      status = 404;
   } else if (error.message === "INVALID_OR_EXPIRED_CODE") {
      status = 400;
   } else if (error.message === "TOO_MANY_ATTEMPTS") {
      status = 429; // Too Many Requests
   }

   res.status(status).json({ success: false, message });
}

export const AuthController = {
   async registerUser(req, res) {
      try {
         const { nombre, email, telefono, pais_id, cp, password } = req.body;
         const { deviceId, device, platform, model, appVersion } = req.body;

         const result = await AuthService.register(
            { nombre, email, telefono, pais_id, cp, password },
            { deviceId, device, platform, model, appVersion },
            getRequestInfo(req),
         );

         sendSessionResponse(res, result);
      } catch (error) {
         console.error("❌ Error en registerUser:", error);
         handleError(res, error);
      }
   },

   async loginUser(req, res) {
      try {
         const { email, password } = req.body;
         const { deviceId, device, platform, model, appVersion } = req.body;

         const result = await AuthService.login(
            { email, password },
            { deviceId, device, platform, model, appVersion },
            getRequestInfo(req),
         );

         sendSessionResponse(res, result);
      } catch (error) {
         console.error("❌ Error en loginUser:", error);
         handleError(res, error);
      }
   },

   async refreshToken(req, res) {
      try {
         const { refreshToken, deviceId } = req.body;

         console.log("🔄 Refresh Token - Datos recibidos:", {
            refreshToken: refreshToken?.substring(0, 20) + "...",
            deviceId,
            body: req.body,
         });

         const result = await AuthService.refreshAccessToken(refreshToken, deviceId);

         console.log("✅ Refresh Token - Respuesta:", {
            accessToken: result.accessToken?.substring(0, 30) + "...",
            hasRefreshToken: !!result.refreshToken,
            ...result,
         });

         res.json({ success: true, ...result });
      } catch (error) {
         console.error("❌ Refresh Token - Error:", error.message);
         // Siempre devolver 401 si falla el refresh token
         res.status(401).json({
            success: false,
            message: "No autorizado. Por favor, inicia sesión nuevamente.",
         });
      }
   },

   async revokeDevice(req, res) {
      try {
         const { deviceId } = req.body;
         await AuthService.revokeDevice(deviceId, getRequestInfo(req));
         res.json({ success: true, message: "Dispositivo revocado" });
      } catch (error) {
         console.error("❌ Error en revokeDevice:", error);
         handleError(res, error);
      }
   },

   async sendRecoveryPassword(req, res) {
      try {
         const { email } = req.body;

         // console.log("\x1b[37m", "sendRecoveryPassword:", email);
         await PasswordService.sendRecoveryCode(email);
         res.json({ success: true, message: "Correo de recuperación enviado" });
      } catch (error) {
         console.error("❌ Error en sendRecoveryPassword:", error);
         handleError(res, error);
      }
   },

   async resetPassword(req, res) {
      try {
         const { email, code, password } = req.body;
         const { deviceId, device, platform, model, appVersion } = req.body;

         const result = await PasswordService.resetPassword(
            email,

            code,
            password,
            { deviceId, device, platform, model, appVersion },
            getRequestInfo(req),
         );

         sendSessionResponse(res, result);
      } catch (error) {
         console.error("❌ Error en resetPassword:", error);
         handleError(res, error);
      }
   },
};
