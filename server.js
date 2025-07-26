import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { initTables } from "./models/tables.js";
import pagosRouter from "./routes/payments.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/status-api", (req, res) => {
   res.status(200).json({
      status: "ok",
      updatedAt: new Date().toISOString(),
   });
});

app.use("/payments", pagosRouter);

initTables();

const PORT = process.env.PORT || 3000;

const PG_HOST = process.env.PG_HOST || "localhost";
app.listen(PORT, () => {
   console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
});
