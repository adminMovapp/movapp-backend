import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { initTables } from "./models/tables.js";
import pagosRouter from "./routes/payments.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/payments", pagosRouter);

initTables();

const PORT = process.env.PORT || 3000;
const PG_HOST = process.env.PG_HOST || "localhost";
app.listen(PORT, () => {
   console.log(`Servidor corriendo en http://${PG_HOST}:${PORT}`);
});
