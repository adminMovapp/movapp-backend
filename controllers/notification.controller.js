// ============================================
// controllers/notification.controller.js
// Controlador para gestión de notificaciones push
// ============================================
import { NotificationService } from "../services/notificationService.js";

const ERROR_MESSAGES = {
   INVALID_PUSH_TOKEN: "Push token inválido",
   DEVICE_NOT_FOUND: "Dispositivo no encontrado",
   NO_PUSH_TOKEN: "No se encontró push token para este dispositivo",
   NO_ACTIVE_DEVICES: "No se encontraron dispositivos activos",
   MISSING_PARAMS: "Parámetros requeridos faltantes",
};

export const NotificationController = {
   /**
    * POST /notifications/register-token
    * Registra o actualiza el push token de un dispositivo
    */
   async registerPushToken(req, res) {
      try {
         const { deviceId, pushToken } = req.body;

         if (!deviceId || !pushToken) {
            return res.status(400).json({
               success: false,
               message: "deviceId y pushToken son requeridos",
            });
         }

         const device = await NotificationService.registerPushToken(deviceId, pushToken);

         res.json({
            success: true,
            message: "Push token registrado correctamente",
            device: {
               deviceId: device.device_id,
               pushEnabled: device.push_enabled,
            },
         });
      } catch (err) {
         console.error("❌ Error en registerPushToken:", err);
         const message = ERROR_MESSAGES[err.message] || "Error registrando push token";
         const status = err.message === "DEVICE_NOT_FOUND" ? 404 : err.message === "INVALID_PUSH_TOKEN" ? 400 : 500;
         res.status(status).json({ success: false, message });
      }
   },

   /**
    * POST /notifications/disable
    * Desactiva las notificaciones push de un dispositivo
    */
   async disablePushNotifications(req, res) {
      try {
         const { deviceId } = req.body;

         if (!deviceId) {
            return res.status(400).json({
               success: false,
               message: "deviceId es requerido",
            });
         }

         await NotificationService.disablePushNotifications(deviceId);

         res.json({
            success: true,
            message: "Notificaciones desactivadas",
         });
      } catch (err) {
         console.error("❌ Error en disablePushNotifications:", err);
         res.status(500).json({
            success: false,
            message: "Error desactivando notificaciones",
         });
      }
   },

   /**
    * POST /notifications/send
    * Envía una notificación push a un dispositivo específico
    */
   async sendNotification(req, res) {
      try {
         const { deviceId, title, body, data } = req.body;

         if (!deviceId || !title || !body) {
            return res.status(400).json({
               success: false,
               message: "deviceId, title y body son requeridos",
            });
         }

         const result = await NotificationService.sendToDevice(deviceId, title, body, data || {});

         res.json({
            success: true,
            message: "Notificación enviada",
            tickets: result.tickets,
         });
      } catch (err) {
         console.error("❌ Error en sendNotification:", err);
         const message = ERROR_MESSAGES[err.message] || "Error enviando notificación";
         const status = err.message === "NO_PUSH_TOKEN" ? 404 : 500;
         res.status(status).json({ success: false, message });
      }
   },

   /**
    * POST /notifications/send-to-user
    * Envía una notificación a todos los dispositivos de un usuario
    */
   async sendNotificationToUser(req, res) {
      try {
         const { userUuid, title, body, data } = req.body;

         if (!userUuid || !title || !body) {
            return res.status(400).json({
               success: false,
               message: "userUuid, title y body son requeridos",
            });
         }

         const result = await NotificationService.sendToUser(userUuid, title, body, data || {});

         res.json({
            success: true,
            message: `Notificación enviada a ${result.sentCount} dispositivo(s)`,
            sentCount: result.sentCount,
            tickets: result.tickets,
         });
      } catch (err) {
         console.error("❌ Error en sendNotificationToUser:", err);
         const message = ERROR_MESSAGES[err.message] || "Error enviando notificaciones";
         const status = err.message === "NO_ACTIVE_DEVICES" ? 404 : 500;
         res.status(status).json({ success: false, message });
      }
   },

   /**
    * POST /notifications/send-broadcast
    * Envía una notificación a todos los usuarios activos
    */
   async sendBroadcastNotification(req, res) {
      try {
         const { title, body, data } = req.body;

         if (!title || !body) {
            return res.status(400).json({
               success: false,
               message: "title y body son requeridos",
            });
         }

         const result = await NotificationService.sendBroadcast(title, body, data || {});

         res.json({
            success: true,
            message: `Notificación broadcast enviada a ${result.sentCount} dispositivo(s)`,
            sentCount: result.sentCount,
         });
      } catch (err) {
         console.error("❌ Error en sendBroadcastNotification:", err);
         const message = ERROR_MESSAGES[err.message] || "Error enviando notificaciones broadcast";
         const status = err.message === "NO_ACTIVE_DEVICES" ? 404 : 500;
         res.status(status).json({ success: false, message });
      }
   },

   /**
    * POST /notifications/test
    * Envía una notificación de prueba
    */
   async sendTestNotification(req, res) {
      try {
         const { pushToken } = req.body;

         if (!pushToken) {
            return res.status(400).json({
               success: false,
               message: "pushToken es requerido",
            });
         }

         const result = await NotificationService.sendPushNotification({
            pushToken,
            title: "Notificación de prueba 🔔",
            body: "Esta es una notificación de prueba desde MovApp",
            data: { type: "test" },
         });

         if (!result.success) {
            return res.status(500).json({
               success: false,
               message: "Error enviando notificación de prueba",
               error: result.error,
            });
         }

         res.json({
            success: true,
            message: "Notificación de prueba enviada",
            tickets: result.tickets,
         });
      } catch (err) {
         console.error("❌ Error en sendTestNotification:", err);
         res.status(500).json({
            success: false,
            message: "Error enviando notificación de prueba",
         });
      }
   },

   /**
    * POST /notifications/welcome
    * Envía notificación de bienvenida a un dispositivo
    */
   async sendWelcome(req, res) {
      try {
         const { deviceId, userName } = req.body;

         if (!deviceId || !userName) {
            return res.status(400).json({
               success: false,
               message: "deviceId y userName son requeridos",
            });
         }

         const result = await NotificationService.sendWelcomeByDevice(deviceId, userName);

         res.json({
            success: true,
            message: "Notificación de bienvenida enviada",
            tickets: result.tickets,
         });
      } catch (err) {
         console.error("❌ Error en sendWelcome:", err);
         const message = ERROR_MESSAGES[err.message] || "Error enviando notificación de bienvenida";
         const status = err.message === "NO_PUSH_TOKEN" ? 404 : 500;
         res.status(status).json({ success: false, message });
      }
   },

   /**
    * POST /notifications/purchase
    * Envía notificación de compra exitosa a un usuario
    */
   async sendPurchase(req, res) {
      try {
         const { userUuid, orderNumber } = req.body;

         if (!userUuid || !orderNumber) {
            return res.status(400).json({
               success: false,
               message: "userUuid y orderNumber son requeridos",
            });
         }

         const result = await NotificationService.sendPurchaseByUser(userUuid, orderNumber);

         res.json({
            success: true,
            message: "Notificación de compra enviada",
            sentCount: result.sentCount,
         });
      } catch (err) {
         console.error("❌ Error en sendPurchase:", err);
         const message = ERROR_MESSAGES[err.message] || "Error enviando notificación de compra";
         const status = err.message === "NO_ACTIVE_DEVICES" ? 404 : 500;
         res.status(status).json({ success: false, message });
      }
   },

   /**
    * POST /notifications/payment
    * Envía notificación de pago confirmado a un usuario
    */
   async sendPayment(req, res) {
      try {
         const { userUuid, amount, currency } = req.body;

         if (!userUuid || !amount || !currency) {
            return res.status(400).json({
               success: false,
               message: "userUuid, amount y currency son requeridos",
            });
         }

         const result = await NotificationService.sendPaymentByUser(userUuid, amount, currency);

         res.json({
            success: true,
            message: "Notificación de pago enviada",
            sentCount: result.sentCount,
         });
      } catch (err) {
         console.error("❌ Error en sendPayment:", err);
         const message = ERROR_MESSAGES[err.message] || "Error enviando notificación de pago";
         const status = err.message === "NO_ACTIVE_DEVICES" ? 404 : 500;
         res.status(status).json({ success: false, message });
      }
   },
};
