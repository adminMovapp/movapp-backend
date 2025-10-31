import { AuthDAO } from "../dao/authDAO.js";

export async function logAction({ userId = null, deviceId = null, action, message = "", success = true }) {
   try {
      await AuthDAO.insertAuditLog({ userId, deviceId, action, message, success });
   } catch (err) {
      console.log("\x1b[31m", "Error", err);
   }
}
