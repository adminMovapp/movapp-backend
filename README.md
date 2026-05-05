# MovApp Backend

Backend del proyecto **MovApp**, construido con Node.js y Express, con PostgreSQL como base de datos y soporte de pagos vía **Mercado Pago** y **Stripe**, además de notificaciones push usando **Expo**.

## Tecnologías principales

- Node.js / Express 5
- PostgreSQL (pg / pool de conexiones)
- JSON Web Tokens (JWT) para autenticación
- Mercado Pago SDK
- Stripe SDK
- Expo Server SDK (notificaciones push)
- Nodemailer (envío de correos)
- dotenv para variables de entorno

## Estructura de carpetas

- `server.js`: Punto de entrada de la aplicación.
- `db/`: Conexión y utilidades de base de datos (PostgreSQL).
- `models/`: Definición y creación de tablas.
- `controllers/`: Lógica de controladores para cada módulo (auth, config, orders, notifications, payments...).
- `dao/`: Data Access Objects para acceso a BD (Auth, Config, Notifications, Orders, Pagos, etc.).
- `routes/`: Definición de rutas Express agrupadas por módulo.
- `services/`: Servicios de dominio (auth, orders, payments, notifications, password, token, etc.).
- `middlewares/`: Middlewares de autenticación y validación.
- `utils/`: Utilidades generales (auth, crypto, logger, mailer, stripe...).

## Requisitos previos

- Node.js >= 18.x
- npm (incluido con Node)
- PostgreSQL accesible (local o remoto)
- Cuenta de **Mercado Pago** con access token configurado
- Cuenta de **Stripe** con clave secreta y webhook configurado
- Servidor SMTP (por ejemplo Titan Email) para envío de correos

## Configuración de entorno

Crear un archivo `.env` en la raíz del proyecto (o usar `.env.production` en despliegue) con al menos las siguientes variables:

### Servidor

- `PORT` – Puerto HTTP del servidor (por defecto 3000).
- `NODE_ENV` – `development` o `production`.
- `TZ` – Zona horaria (por ejemplo `America/Mexico_City`).

### Base de datos PostgreSQL

Usadas en `db/index.js`:

- `PG_HOST` – Host de la base de datos.
- `PG_PORT` – Puerto de PostgreSQL (por defecto 5432).
- `PG_USER` – Usuario de base de datos.
- `PG_PASSWORD` – Contraseña de base de datos.
- `PG_DATABASE` – Nombre de la base de datos.

### Autenticación y seguridad

- `JWT_SECRET` – Clave secreta para firmar tokens JWT.
- `AES_SECRET` – Clave para cifrado/descifrado AES en utilidades de auth.

> Nota: En `utils/crypto.js` hay una clave interna `movapp` usada para cifrado compatible con el frontend.

### Pagos con Mercado Pago

Usadas en `services/mercadopago.js` y comentarios en `server.js`:

- `MERCADOPAGO_ACCESS_TOKEN` – Access token privado de Mercado Pago.
- `APP_BASE_URL` – URL base del frontend (por ejemplo `https://app.movapp.com/`).
- `MERCADOPAGO_URL_WEBHOOK` – URL pública del webhook de Mercado Pago (apunta a `/payments/webhook`).

### Pagos con Stripe

Usadas en `utils/stripe.js` y `server.js`:

- `STRIPE_SECRET` – Clave secreta de Stripe (debe empezar con `sk_`, no con `pk_`).
- `STRIPE_WEBHOOK_SECRET` – Clave secreta del endpoint de webhook de Stripe.

### Notificaciones y correo

Usadas en `utils/mailer.js` y `services/notificationService.js`:

- `SMTP_HOST` – Host SMTP.
- `SMTP_PORT` – Puerto SMTP.
- `SMTP_USER` – Usuario SMTP.
- `SMTP_PASS` – Contraseña SMTP.
- `LOGO_URL` – (Opcional) URL base donde se aloja el logo para los correos.

### Otros

- Cualquier otra variable específica de despliegue (por ejemplo credenciales de almacenamiento de imágenes) debe definirse según el entorno donde se ejecute el backend.

## Instalación

```bash
npm install
```

## Scripts disponibles

- `npm run dev` – Inicia el servidor en modo desarrollo con nodemon.
- `npm start` – Inicia el servidor en modo producción (node puro).

## Ejecución local

1. Clonar el repositorio y entrar a la carpeta `movapp-backend`.
2. Crear y configurar el archivo `.env` con las variables descritas arriba.
3. Instalar dependencias con `npm install`.
4. Asegurar que PostgreSQL esté corriendo y accesible con las credenciales de `PG_*`.
5. Ejecutar:

   ```bash
   npm run dev
   ```

6. Verificar el estado del backend accediendo a:
   - `GET /status-api`

   Esta ruta responde con un JSON indicando el estado del servidor y la conexión a BD.

## Endpoints principales

### Salud

- `GET /status-api` – Verifica que la API y la base de datos estén funcionando.

### Autenticación (`/auth`)

Rutas definidas en `routes/auth.js` y manejadas por `AuthController`:

- `POST /auth/register` – Registro de usuario.
- `POST /auth/login` – Inicio de sesión.
- `POST /auth/refresh-token` – Refrescar token de acceso.
- `POST /auth/recover` – Enviar correo con código de recuperación de contraseña.
- `POST /auth/reset-password` – Restablecer contraseña usando código enviado.
- `POST /auth/revoke-device` – Revocar sesión/dispositivo.
- `DELETE /auth/delete-account` – Eliminar cuenta (requiere autenticación via JWT).

### Configuración (`/config`)

Rutas definidas en `routes/config.js` y manejadas por `ConfigController`:

- `GET /config/countries` – Obtiene listado de países.
- `GET /config/prices` – Obtiene lista de precios (con validación de parámetros).

### Pagos con Mercado Pago (`/payments`)

Rutas definidas en `routes/payments.js`:

- `POST /payments/create-preference`  
  Crea una preferencia de pago en Mercado Pago. Se acepta tanto payload plano como payload cifrado (campo `data`) usando AES compatible con el frontend. Internamente se crea un pedido en BD y se devuelve el `id` e `init_point` de la preferencia.

- `POST /payments/webhook`  
  Webhook de Mercado Pago. Recibe notificaciones de pago, consulta detalles del pago y actualiza:
   - Tabla de pagos (`PagoDAO`).
   - Estado del pedido (`PedidoDAO`).

- `GET /payments/pagos` – Lista de pagos registrados.
- `GET /payments/pedidos` – Lista de pedidos.
- `GET /payments/pedidos-pagos` – Vista combinada de pedidos y pagos.

> Importante: Para producción, exponer públicamente la URL configurada en `MERCADOPAGO_URL_WEBHOOK` apuntando a este endpoint.

### Pagos con Stripe (`/payments/stripe`)

Rutas definidas en `routes/paymentsStripe.js` y controladas por `PaymentsStripeController`:

- `POST /payments/stripe/create-intent` – Crea un Payment Intent en Stripe usando `StripeService.createPaymentIntent`.
- `POST /payments/stripe/webhook` – Webhook oficial de Stripe, recibe eventos como `payment_intent.succeeded` y `payment_intent.payment_failed`. Usa `express.raw` para validar la firma (`STRIPE_WEBHOOK_SECRET`). Actualiza:
   - Registro de pagos en `PaymentsStripeDAO`.
   - Estado de la orden asociada en `OrdersService`.
- `POST /payments/stripe/webhook-test` – Endpoint alterno para pruebas con JSON sin `express.raw`.
- `GET /payments/stripe/intent/:id` – Obtiene detalle de un Payment Intent por id.

### Órdenes (`/orders`)

Rutas definidas en `routes/orders.js` y controladas por `OrdersController`:

- `GET /orders/number/:orderNumber` – Obtiene una orden por número.
- `GET /orders/paid/user/:userUuid` – Obtiene órdenes pagadas por usuario (requiere autenticación JWT).
- `GET /orders/:id` – Obtiene una orden por id.

### Notificaciones push (`/notifications`)

Rutas definidas en `routes/notifications.js` y controladas por `NotificationController` (usa `NotificationService` con Expo):

- `POST /notifications/register-token` – Registra el push token de un dispositivo.
- `POST /notifications/toggle` – Activa/desactiva notificaciones push para un dispositivo.
- `POST /notifications/disable` – Desactiva notificaciones (compatibilidad hacia atrás).
- `POST /notifications/send` – Envía una notificación a un dispositivo específico (uso interno).
- `POST /notifications/send-to-user` – Envía notificación a todos los dispositivos de un usuario.
- `POST /notifications/send-broadcast` – Envía notificación broadcast a todos los usuarios.
- `POST /notifications/test` – Envía una notificación de prueba.
- `POST /notifications/welcome` – Notificación de bienvenida.
- `POST /notifications/purchase` – Notificación asociada a compra.
- `POST /notifications/payment` – Notificación asociada a pago recibido.
- `GET /notifications/device/:deviceId` – Obtiene información del push token de un dispositivo.

Internamente, `NotificationService` ofrece:

- Envío a un token (`sendPushNotification`).
- Envío a múltiples tokens (`sendPushNotificationsToMultiple`).
- Broadcast (`sendBroadcast`).
- Utilidades de registro y consulta de dispositivos vía `NotificationDAO`.

## Notas sobre Stripe y webhooks

- El servidor usa un middleware especial en `server.js` para manejar el webhook de Stripe:
   - Para la ruta `/payments/stripe/webhook` se usa `express.raw({ type: 'application/json' })`.
   - Para el resto de rutas se usa `express.json()` con acceso a `req.rawBody`.
- Asegúrate de configurar el endpoint del webhook en el panel de Stripe apuntando a `/payments/stripe/webhook` y usar la clave `STRIPE_WEBHOOK_SECRET` correcta.

## Despliegue

- En producción se recomienda establecer `NODE_ENV=production` y configurar SSL en PostgreSQL (ya manejado en `db/index.js`).
- El proyecto incluye un `Dockerfile` y un `docker-compose.yml.old` que pueden servir como base para contenerizar el backend y la base de datos.

## Próximos pasos

- Añadir documentación más detallada de cada endpoint (parámetros, ejemplos de request/response).
- Documentar el modelo de datos (tablas y relaciones) a partir de `models/tables.js`.
- Añadir tests automatizados para controladores y servicios principales.
