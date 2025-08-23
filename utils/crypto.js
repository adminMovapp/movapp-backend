import CryptoJS from "crypto-js";

const SECRET_KEY = "movapp"; // Misma clave que en frontend

export const decryptData = (cipherText) => {
   try {
      const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedText) {
         throw new Error("Datos cifrados inválidos o clave incorrecta");
      }

      return JSON.parse(decryptedText);
   } catch (error) {
      console.error("Error al descifrar:", error);
      throw new Error("Error en el descifrado: " + error.message);
   }
};

export const encryptData = (data) => {
   try {
      const stringData = typeof data === "string" ? data : JSON.stringify(data);
      return CryptoJS.AES.encrypt(stringData, SECRET_KEY).toString();
   } catch (error) {
      console.error("Error al cifrar:", error);
      throw new Error("Error en el cifrado: " + error.message);
   }
};
