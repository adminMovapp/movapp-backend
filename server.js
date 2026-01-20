import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { initTables } from "./models/tables.js";

import configRouter from "./routes/config.js";
import authRouter from "./routes/auth.js";
import pagosRouter from "./routes/payments.js";
import paymentsStripeRouter from "./routes/paymentsStripe.js";
import ordersRouter from "./routes/orders.js";
import notificationsRouter from "./routes/notifications.js";

process.env.TZ = "America/Mexico_City";
const app = express();

if (process.env.NODE_ENV !== "production") {
   dotenv.config();
}

app.use(
   cors({
      origin: "*",
   }),
);

app.use((req, res, next) => {
   // Si es el webhook de Stripe, usar express.raw()
   if (req.originalUrl === "/payments/stripe/webhook") {
      express.raw({ type: "application/json" })(req, res, next);
   }
   // Para todo lo demás, usar express.json()
   else {
      express.json({
         verify: (req, res, buf) => {
            req.rawBody = buf;
         },
      })(req, res, next);
   }
});

app.use(express.urlencoded({ extended: true }));

// Constantes para puertos y configuración
const PORT = process.env.PORT || 3000;
const DB_PORT = process.env.PG_PORT || 5432;

// Constantes para MercadoPago y URLs
// const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
// const APP_BASE_URL = process.env.APP_BASE_URL;
// const MERCADOPAGO_URL_WEBHOOK = process.env.MERCADOPAGO_URL_WEBHOOK;

const SMTP_HOST = process.env.SMTP_HOST;
const STRIPE_SECRET = process.env.STRIPE_SECRET;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

app.get("/status-api", (req, res) => {
   res.status(200).json({
      status: "ok",
      message: `Servidor backend corriendo en puerto:${PORT} Conectado a la base de datos en puerto:${DB_PORT}`,
      updatedAt: new Date().toISOString(),
   });
});

app.use("/payments", pagosRouter);
app.use("/auth", authRouter);
app.use("/config", configRouter);
app.use("/payments/stripe", paymentsStripeRouter);
app.use("/orders", ordersRouter);
app.use("/notifications", notificationsRouter);

//initTables();

app.listen(PORT, () => {
   console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
   console.log(`✅  Conectado a la base de datos en puerto:${DB_PORT}`);
   console.log(`---------------------------`);

   // Logs con constantes
   // console.log("accessToken:", ACCESS_TOKEN);
   // console.log("APP_BASE_URL:", APP_BASE_URL);
   // console.log("MERCADOPAGO_URL_WEBHOOK:", MERCADOPAGO_URL_WEBHOOK);
   console.log(`---------------------------`);
   console.log("NODE_ENV actual:", process.env.NODE_ENV);
   console.log(`---------------------------`);

   console.log("Zona horaria:", process.env.TZ);
   console.log("Fecha/hora:", new Date().toLocaleString());

   console.log(`---------------------------`);

   console.log("SMTP_HOST:", SMTP_HOST);
   console.log("STRIPE_SECRET:", STRIPE_SECRET ? STRIPE_SECRET.substring(0, 15) + "..." : "No definido");
   console.log(
      "STRIPE_WEBHOOK_SECRET:",
      STRIPE_WEBHOOK_SECRET ? STRIPE_WEBHOOK_SECRET.substring(0, 15) + "..." : "No definido",
   );

   console.log("JWT_SECRET:", JWT_SECRET ? JWT_SECRET.substring(0, 6) + "..." : "No definido");

   console.log(`---------------------------`);
});
