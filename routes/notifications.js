import express from "express";
import { NotificationController } from "../controllers/notification.controller.js";
import { authenticateToken, requireInternalKey } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ---- Endpoints del dispositivo (requieren sesión; el dispositivo debe ser del usuario) ----

// Registrar push token
router.post("/register-token", authenticateToken, NotificationController.registerPushToken);

// Habilitar/Desactivar notificaciones
router.post("/toggle", authenticateToken, NotificationController.togglePushNotifications);

// Desactivar notificaciones (backward compatibility)
router.post("/disable", authenticateToken, NotificationController.disablePushNotifications);

// Obtener información de push tokens
router.get("/device/:deviceId", authenticateToken, NotificationController.getDevicePushInfo);

// ---- Endpoints de envío (USO INTERNO: header x-internal-key = NOTIFICATIONS_API_KEY) ----

// Enviar notificación a un dispositivo específico
router.post("/send", requireInternalKey, NotificationController.sendNotification);

// Enviar notificación a todos los dispositivos de un usuario
router.post("/send-to-user", requireInternalKey, NotificationController.sendNotificationToUser);

// Enviar notificación broadcast a todos los usuarios
router.post("/send-broadcast", requireInternalKey, NotificationController.sendBroadcastNotification);

// Enviar notificación de prueba
router.post("/test", requireInternalKey, NotificationController.sendTestNotification);

// Endpoints para notificaciones predefinidas
router.post("/welcome", requireInternalKey, NotificationController.sendWelcome);
router.post("/purchase", requireInternalKey, NotificationController.sendPurchase);
router.post("/payment", requireInternalKey, NotificationController.sendPayment);

export default router;
