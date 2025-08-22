import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { initTables } from "./models/tables.js";
import pagosRouter from "./routes/payments.js";

const app = express();

if (process.env.NODE_ENV !== "production") {
   dotenv.config();
}

app.use(
   cors({
      origin: "*",
   }),
);

app.use(express.json());

// Constantes para puertos y configuración
const PORT = process.env.PORT || 3000;
const DB_PORT = process.env.PG_PORT || 5432;

// Constantes para MercadoPago y URLs
const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const APP_BASE_URL = process.env.APP_BASE_URL;
const MERCADOPAGO_URL_WEBHOOK = process.env.MERCADOPAGO_URL_WEBHOOK;

app.get("/status-api", (req, res) => {
   res.status(200).json({
      status: "ok",
      message: `Servidor backend corriendo en puerto:${PORT} Conectado a la base de datos en puerto:${DB_PORT}`,
      updatedAt: new Date().toISOString(),
   });
});

app.use("/payments", pagosRouter);

initTables();

app.listen(PORT, () => {
   console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
   console.log(`✅  Conectado a la base de datos en puerto:${DB_PORT}`);
   console.log(`---------------------------`);

   // Logs con constantes
   console.log("accessToken:", ACCESS_TOKEN);
   console.log("APP_BASE_URL:", APP_BASE_URL);
   console.log("MERCADOPAGO_URL_WEBHOOK:", MERCADOPAGO_URL_WEBHOOK);
});
