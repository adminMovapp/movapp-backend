import { AuthDAO } from "../dao/authDAO.js";

export async function logAction({ userId = null, deviceId = null, action, message = "", success = true }) {
   try {
      await AuthDAO.insertAuditLog({ userId, deviceId, action, message, success });
   } catch (err) {
      console.error("Error logging action", err);
   }
}
