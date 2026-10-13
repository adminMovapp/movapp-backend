import { timingSafeEqual } from "node:crypto";
import { TokenService } from "../services/tokenService.js";

const ERROR_MESSAGES = {
   TOKEN_NOT_PROVIDED: "Token de autorización no proporcionado",
   INVALID_TOKEN: "Token inválido o expirado",
   UNAUTHORIZED: "No autorizado",
};

/**
 * Middleware para verificar el token JWT en las peticiones
 */
export const authenticateToken = (req, res, next) => {
   try {
      const authHeader = req.headers["authorization"];
      //   console.log("📨 Header completo:", JSON.stringify(authHeader));
      //   console.log("📨 Longitud header:", authHeader?.length);
      //   console.log("📨 Primeros 20 caracteres:", authHeader?.substring(0, 20));

      if (!authHeader) {
         return res.status(401).json({
            success: false,
            message: ERROR_MESSAGES.TOKEN_NOT_PROVIDED,
         });
      }
      const token = authHeader.trim().replace(/^Bearer\s+/i, "");
      if (!token || token.length < 10) {
         return res.status(401).json({
            success: false,
            message: ERROR_MESSAGES.TOKEN_NOT_PROVIDED,
         });
      }

      const decoded = TokenService.verifyAccessToken(token);
      req.user = decoded; // Agrega los datos del usuario al request
      next();
   } catch (err) {
      console.error("authenticateToken error:", err.message);

      const message = err.message === "INVALID_TOKEN" ? ERROR_MESSAGES.INVALID_TOKEN : ERROR_MESSAGES.UNAUTHORIZED;

      return res.status(403).json({
         success: false,
         message,
      });
   }
};

/**
 * Middleware para endpoints internos (envío de notificaciones push).
 * Exige el header `x-internal-key` igual a NOTIFICATIONS_API_KEY. Si la
 * variable no está configurada, el endpoint queda cerrado (503) en lugar de
 * abierto: antes cualquiera podía hacer broadcast a todos los usuarios.
 */
export const requireInternalKey = (req, res, next) => {
   const expected = process.env.NOTIFICATIONS_API_KEY;
   if (!expected) {
      console.error("requireInternalKey: NOTIFICATIONS_API_KEY no está configurada; endpoint bloqueado");
      return res.status(503).json({
         success: false,
         message: "Envío de notificaciones no configurado en el servidor",
      });
   }

   const provided = req.headers["x-internal-key"];
   const a = Buffer.from(String(provided ?? ""));
   const b = Buffer.from(expected);
   const valid = a.length === b.length && timingSafeEqual(a, b);

   if (!valid) {
      return res.status(401).json({ success: false, message: ERROR_MESSAGES.UNAUTHORIZED });
   }
   next();
};
