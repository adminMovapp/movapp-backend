// utils/authUtils.js
import crypto from "crypto";
import CryptoJS from "crypto-js";

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
