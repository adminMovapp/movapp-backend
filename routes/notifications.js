import express from "express";
import { NotificationController } from "../controllers/notification.controller.js";

const router = express.Router();

// Registrar push token (requiere autenticación)
router.post("/register-token", NotificationController.registerPushToken);

// Habilitar/Desactivar notificaciones (nuevo endpoint)
router.post("/toggle", NotificationController.togglePushNotifications);

// Desactivar notificaciones (backward compatibility)
router.post("/disable", NotificationController.disablePushNotifications);

// Enviar notificación a un dispositivo específico (USO INTERNO)
router.post("/send", NotificationController.sendNotification);

// Enviar notificación a todos los dispositivos de un usuario (USO INTERNO)
router.post("/send-to-user", NotificationController.sendNotificationToUser);

// Enviar notificación broadcast a todos los usuarios (USO INTERNO/ADMIN)
router.post("/send-broadcast", NotificationController.sendBroadcastNotification);

// Enviar notificación de prueba
router.post("/test", NotificationController.sendTestNotification);

// Endpoints para notificaciones predefinidas
router.post("/welcome", NotificationController.sendWelcome);
router.post("/purchase", NotificationController.sendPurchase);
router.post("/payment", NotificationController.sendPayment);

// Obtener información de push tokens
router.get("/device/:deviceId", NotificationController.getDevicePushInfo);

export default router;
