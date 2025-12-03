// ============================================
// services/tokenService.js
// Manejo de tokens JWT y refresh tokens
// ============================================
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXP = "5m";
const REFRESH_EXP_DAYS = 30;

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
         return jwt.verify(token, JWT_SECRET);
      } catch (err) {
         throw new Error("INVALID_TOKEN");
      }
   },
};
