// utils/authUtils.js
import crypto from "crypto";
import CryptoJS from "crypto-js";
import bcrypt from "bcrypt";

const AES_SECRET = process.env.AES_SECRET || "";

/**
 * Hash de token con SHA256
 */
export function hashToken(token) {
   return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Desencripta un texto con AES
 */
export function decryptAES(ciphertext) {
   if (!ciphertext || !AES_SECRET) return ciphertext;
   try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, AES_SECRET);
      return bytes.toString(CryptoJS.enc.Utf8);
   } catch (err) {
      return ciphertext;
   }
}

/**
 * Cifra una contraseña con bcrypt
 */
export async function hashPassword(password) {
   return await bcrypt.hash(password, 12);
}

export async function validatePassword(plain, hashed) {
   return await bcrypt.compare(plain, hashed);
}

export function generateResetCode(length = 5) {
   const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
   let code = "";
   for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
   }
   return code;
}

export function sendSessionResponse(res, { user, accessToken, device }) {
   res.json({
      success: true,
      user,
      accessToken,
      device,
   });
}
