// ============================================
// controllers/notification.controller.js
// Controlador para gestión de notificaciones push
// ============================================
import { NotificationService } from "../services/notificationService.js";

const ERROR_MESSAGES = {
   INVALID_PUSH_TOKEN: "Push token inválido",
   DEVICE_NOT_FOUND: "Dispositivo no encontrado",
   FORBIDDEN_DEVICE: "El dispositivo no pertenece a este usuario",
   NO_PUSH_TOKEN: "No se encontró push token para este dispositivo",
   NO_ACTIVE_DEVICES: "No se encontraron dispositivos activos",
   MISSING_PARAMS: "Parámetros requeridos faltantes",
};

// Código HTTP para los errores de los endpoints de dispositivo (requieren sesión)
const DEVICE_ERROR_STATUS = {
   DEVICE_NOT_FOUND: 404,
   FORBIDDEN_DEVICE: 403,
   INVALID_PUSH_TOKEN: 400,
};

function sendDeviceError(res, err, fallbackMessage) {
   const message = ERROR_MESSAGES[err.message] || fallbackMessage;
   const status = DEVICE_ERROR_STATUS[err.message] || 500;
   res.status(status).json({ success: false, message });
}

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

         await NotificationService.assertDeviceOwner(deviceId, req.user.id);
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
         sendDeviceError(res, err, "Error registrando push token");
      }
   },

   /**
    * POST /notifications/toggle
    * Habilita o desactiva las notificaciones push de un dispositivo
    */
   async togglePushNotifications(req, res) {
      try {
         // console.log("📱 [Controller] togglePushNotifications - Petición recibida");
         const { deviceId, enabled } = req.body;
         // console.log("📋 [Controller] Datos recibidos:", { deviceId, enabled, enabledType: typeof enabled });

         if (!deviceId || enabled === undefined) {
            // console.log("⚠️ [Controller] Faltan parámetros requeridos");
            return res.status(400).json({
               success: false,
               message: "deviceId y enabled son requeridos",
            });
         }

         await NotificationService.assertDeviceOwner(deviceId, req.user.id);
         const device = await NotificationService.updatePushNotificationStatus(deviceId, enabled);
         // console.log("✅ [Controller] Dispositivo actualizado:", {
         //    device_id: device?.device_id,
         //    push_enabled: device?.push_enabled,
         // });

         const response = {
            success: true,
            message: enabled ? "Notificaciones activadas" : "Notificaciones desactivadas",
            device: {
               deviceId: device?.device_id,
               pushEnabled: device?.push_enabled,
            },
         };
         // console.log("📤 [Controller]  Enviando respuesta:", response);
         res.json(response);
      } catch (err) {
         console.error("❌ Error en togglePushNotifications:", err);
         sendDeviceError(res, err, "Error actualizando notificaciones");
      }
   },

   /**
    * POST /notifications/disable
    * Desactiva las notificaciones push de un dispositivo (backward compatibility)
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

         await NotificationService.assertDeviceOwner(deviceId, req.user.id);
         await NotificationService.disablePushNotifications(deviceId);

         res.json({
            success: true,
            message: "Notificaciones desactivadas",
         });
      } catch (err) {
         console.error("❌ Error en disablePushNotifications:", err);
         sendDeviceError(res, err, "Error desactivando notificaciones");
      }
   },

   /**
    * POST /notifications/send
    * Envía una notificación push a un dispositivo específico
    */
   async sendNotification(req, res) {
      try {
         const { deviceId, title, body, data } = req.body;

         // console.log("\x1b[33m", "sendNotification =>", deviceId, title, body, data);

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
            channelId: "default", // ⚠️⚠️⚠️ AGREGAR ESTO
            sound: "default",
            priority: "high",
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
            message: "Notificación de prueba enviada v1",
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

   /**
    * GET /notifications/device/:deviceId
    * Obtiene información del push token de un dispositivo
    */
   async getDevicePushInfo(req, res) {
      try {
         // console.log("📱 [Controller] getDevicePushInfo - Petición recibida");
         const { deviceId } = req.params;
         // console.log("📋 [Controller] Parámetros recibidos:", { deviceId });

         if (!deviceId) {
            // console.log("⚠️ [Controller] deviceId no proporcionado");
            return res.status(400).json({
               success: false,
               message: "deviceId es requerido",
            });
         }

         await NotificationService.assertDeviceOwner(deviceId, req.user.id);
         const device = await NotificationService.getDevicePushInfo(deviceId);
         // console.log("✅ [Controller] Información del dispositivo obtenida:", {
         //    device_id: device.device_id,
         //    has_push_token: !!device.push_token,
         //    push_token_preview: device.push_token?.substring(0, 30) + "...",
         //    push_enabled: device.push_enabled,
         //    device: device.device,
         //    platform: device.platform,
         //    model: device.model,
         // });

         const response = {
            success: true,
            device: {
               deviceId: device.device_id,
               pushToken: device.push_token,
               pushEnabled: device.push_enabled,
               device: device.device,
               platform: device.platform,
               model: device.model,
            },
         };
         // console.log("📤 [Controller] Enviando respuesta:", {
         //    ...response,
         //    device: { ...response.device, pushToken: device.push_token?.substring(0, 30) + "..." },
         // });
         res.json(response);
      } catch (err) {
         console.error("❌ Error en getDevicePushInfo:", err);
         sendDeviceError(res, err, "Error obteniendo información del dispositivo");
      }
   },
};
