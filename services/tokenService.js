// ============================================
// services/tokenService.js
// Manejo de tokens JWT y refresh tokens
// ============================================
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXP = "30m";
const REFRESH_EXP_DAYS = 30;
// const ACCESS_TOKEN_EXP = "30s"; // 30 segundos para pruebas
// const REFRESH_EXP_DAYS = 0.001; // 1.44 minutos para pruebas

export const TokenService = {
   /**
    * Genera un access token JWT
    */
   generateAccessToken(user) {
      return jwt.sign(
         {
            id: user.user_uuid,
            // email: user.email,
            // telefono: user.telefono,
            // nombre: user.nombre,
         },
         JWT_SECRET,
         { expiresIn: ACCESS_TOKEN_EXP },
      );
   },

   /**
    * Genera un refresh token aleatorio
    */
   generateRefreshToken() {
      return crypto.randomBytes(64).toString("hex");
   },

   /**
    * Calcula la fecha de expiración del refresh token
    */
   getRefreshTokenExpiration() {
      return new Date(Date.now() + REFRESH_EXP_DAYS * 24 * 60 * 60 * 1000);
   },

   /**
    * Verifica y decodifica un JWT
    */
   verifyAccessToken(token) {
      try {
         // console.log("🔐 Verificando token...");
         // console.log("JWT_SECRET definido:", !!JWT_SECRET);
         // console.log("JWT_SECRET length:", JWT_SECRET?.length);

         const decoded = jwt.verify(token, JWT_SECRET);

         // Calcular tiempo restante
         const now = Math.floor(Date.now() / 1000);
         const timeLeft = decoded.exp - now;

         if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);
            const seconds = timeLeft % 60;
            // console.log("\x1b[32m", `✅ Token válido - Tiempo restante: ${hours}h ${minutes}m ${seconds}s`);
         } else {
            console.log("\x1b[31m", "⚠️ Token expirado");
         }

         return decoded;
      } catch (err) {
         console.error("\x1b[31m", "❌ Error verificando token:", err.message);
         console.error("\x1b[31m", "Tipo de error:", err.name);
         throw new Error("INVALID_TOKEN");
      }
   },
};
