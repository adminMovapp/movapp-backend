// ============================================
// services/notificationService.js
// Servicio para enviar notificaciones push con Expo
// ============================================
import { Expo } from "expo-server-sdk";
import { NotificationDAO } from "../dao/notificationDAO.js";

const expo = new Expo();

export const NotificationService = {
   /**
    * Valida si un token push es válido de Expo
    */
   isValidPushToken(token) {
      return Expo.isExpoPushToken(token);
   },

   /**
    * Envía una notificación push a un solo dispositivo
    */
   async sendPushNotification({ pushToken, title, body, data = {} }) {
      try {
         if (!this.isValidPushToken(pushToken)) {
            console.error("❌ Token push inválido:", pushToken);
            return { success: false, error: "Token push inválido" };
         }

         const message = {
            to: pushToken,
            sound: "default",
            title,
            body,
            data,
            priority: "high",
         };

         const chunks = expo.chunkPushNotifications([message]);
         const tickets = [];

         for (const chunk of chunks) {
            try {
               const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
               tickets.push(...ticketChunk);
            } catch (error) {
               console.error("❌ Error enviando chunk:", error);
            }
         }

         console.log("✅ Notificación enviada:", { title, body, tickets });
         return { success: true, tickets };
      } catch (error) {
         console.error("❌ Error en sendPushNotification:", error);
         return { success: false, error: error.message };
      }
   },

   /**
    * Envía notificaciones push a múltiples dispositivos
    */
   async sendPushNotificationsToMultiple({ pushTokens, title, body, data = {} }) {
      try {
         const messages = [];

         for (const pushToken of pushTokens) {
            if (!this.isValidPushToken(pushToken)) {
               console.warn("⚠️ Token push inválido omitido:", pushToken);
               continue;
            }

            messages.push({
               to: pushToken,
               sound: "default",
               title,
               body,
               data,
               priority: "high",
            });
         }

         if (messages.length === 0) {
            return { success: false, error: "No hay tokens válidos" };
         }

         const chunks = expo.chunkPushNotifications(messages);
         const tickets = [];

         for (const chunk of chunks) {
            try {
               const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
               tickets.push(...ticketChunk);
            } catch (error) {
               console.error("❌ Error enviando chunk:", error);
            }
         }

         console.log(`✅ ${messages.length} notificaciones enviadas`);
         return { success: true, tickets, sentCount: messages.length };
      } catch (error) {
         console.error("❌ Error en sendPushNotificationsToMultiple:", error);
         return { success: false, error: error.message };
      }
   },

   /**
    * Verifica los recibos de notificaciones enviadas
    */
   async checkPushReceipts(receiptIds) {
      try {
         const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
         const receipts = [];

         for (const chunk of receiptIdChunks) {
            try {
               const receiptsChunk = await expo.getPushNotificationReceiptsAsync(chunk);
               receipts.push(receiptsChunk);
            } catch (error) {
               console.error("❌ Error obteniendo recibos:", error);
            }
         }

         return { success: true, receipts };
      } catch (error) {
         console.error("❌ Error en checkPushReceipts:", error);
         return { success: false, error: error.message };
      }
   },

   /**
    * Envía notificación de bienvenida
    */
   async sendWelcomeNotification(pushToken, userName) {
      return await this.sendPushNotification({
         pushToken,
         title: "¡Bienvenido a MovApp! ",
         body: `Hola ${userName}, gracias por registrarte.`,
         data: { type: "welcome" },
      });
   },

   /**
    * Envía notificación de compra exitosa
    */
   async sendPurchaseNotification(pushToken, orderNumber) {
      return await this.sendPushNotification({
         pushToken,
         title: "Compra exitosa ✅",
         body: `Tu orden ${orderNumber} ha sido procesada exitosamente.`,
         data: { type: "purchase", orderNumber },
      });
   },

   /**
    * Envía notificación de pago recibido
    */
   async sendPaymentConfirmation(pushToken, amount, currency) {
      return await this.sendPushNotification({
         pushToken,
         title: "Pago recibido 💳",
         body: `Se ha recibido tu pago de ${currency} ${amount}.`,
         data: { type: "payment", amount, currency },
      });
   },

   /**
    * Registra un push token para un dispositivo
    */
   async registerPushToken(deviceId, pushToken) {
      if (!this.isValidPushToken(pushToken)) {
         throw new Error("INVALID_PUSH_TOKEN");
      }

      const device = await NotificationDAO.updatePushToken(deviceId, pushToken);

      if (!device) {
         throw new Error("DEVICE_NOT_FOUND");
      }

      console.log("✅ Push token registrado:", { deviceId, pushToken: pushToken.substring(0, 20) + "..." });
      return device;
   },

   /**
    * Envía notificación a un dispositivo específico
    */
   async sendToDevice(deviceId, title, body, data = {}) {
      const pushToken = await NotificationDAO.getPushTokenByDeviceId(deviceId);

      if (!pushToken) {
         throw new Error("NO_PUSH_TOKEN");
      }

      return await this.sendPushNotification({ pushToken, title, body, data });
   },

   /**
    * Envía notificación a todos los dispositivos de un usuario
    */
   async sendToUser(userUuid, title, body, data = {}) {
      const pushTokens = await NotificationDAO.getPushTokensByUserUuid(userUuid);

      if (!pushTokens || pushTokens.length === 0) {
         throw new Error("NO_ACTIVE_DEVICES");
      }

      return await this.sendPushNotificationsToMultiple({ pushTokens, title, body, data });
   },

   /**
    * Envía notificación broadcast a todos los usuarios
    */
   async sendBroadcast(title, body, data = {}) {
      const pushTokens = await NotificationDAO.getAllActivePushTokens();

      if (!pushTokens || pushTokens.length === 0) {
         throw new Error("NO_ACTIVE_DEVICES");
      }

      return await this.sendPushNotificationsToMultiple({ pushTokens, title, body, data });
   },

   /**
    * Actualiza el estado de las notificaciones de un dispositivo
    */
   async updatePushNotificationStatus(deviceId, enabled) {
      return await NotificationDAO.updatePushNotificationStatus(deviceId, enabled);
   },

   /**
    * Desactiva notificaciones de un dispositivo (backward compatibility)
    */
   async disablePushNotifications(deviceId) {
      return await NotificationDAO.disablePushNotifications(deviceId);
   },

   /**
    * Obtiene información del push token de un dispositivo
    */
   async getDevicePushInfo(deviceId) {
      const device = await NotificationDAO.getDevicePushInfo(deviceId);
      if (!device) {
         throw new Error("DEVICE_NOT_FOUND");
      }
      return device;
   },

   /**
    * Envía notificación de bienvenida por deviceId
    */
   async sendWelcomeByDevice(deviceId, userName) {
      const pushToken = await NotificationDAO.getPushTokenByDeviceId(deviceId);

      if (!pushToken) {
         throw new Error("NO_PUSH_TOKEN");
      }

      return await this.sendWelcomeNotification(pushToken, userName);
   },

   /**
    * Envía notificación de compra por userUuid
    */
   async sendPurchaseByUser(userUuid, orderNumber) {
      const pushTokens = await NotificationDAO.getPushTokensByUserUuid(userUuid);

      if (!pushTokens || pushTokens.length === 0) {
         throw new Error("NO_ACTIVE_DEVICES");
      }

      return await this.sendPushNotificationsToMultiple({
         pushTokens,
         title: "Compra exitosa ✅",
         body: `Tu orden ${orderNumber} ha sido procesada exitosamente.`,
         data: { type: "purchase", orderNumber },
      });
   },

   /**
    * Envía notificación de pago por userUuid
    */
   async sendPaymentByUser(userUuid, amount, currency) {
      const pushTokens = await NotificationDAO.getPushTokensByUserUuid(userUuid);

      if (!pushTokens || pushTokens.length === 0) {
         throw new Error("NO_ACTIVE_DEVICES");
      }

      return await this.sendPushNotificationsToMultiple({
         pushTokens,
         title: "Pago recibido 💳",
         body: `Se ha recibido tu pago de ${currency} ${amount}.`,
         data: { type: "payment", amount, currency },
      });
   },
};
