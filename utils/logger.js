import { AuthDAO } from "../dao/authDAO.js";

export async function logAction({
   userId = null,
   deviceId = null,
   action,
   message = "",
   success = true,
   ip = null,
   userAgent = null,
}) {
   try {
      await AuthDAO.insertAuditLog({
         userId,
         deviceId,
         action,
         message,
         success,
         ip,
         userAgent,
      });
   } catch (err) {
      console.log("\x1b[31m", "Error", err);
   }
}
