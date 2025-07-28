import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { initTables } from "./models/tables.js";
import pagosRouter from "./routes/payments.js";


const app = express();

// if (process.env.NODE_ENV !== "production") {
   dotenv.config();
// }

app.use(cors({
   origin: '*',  
}));

app.use(express.json());


const PORT = process.env.PORT || 3000;
const DB_PORT = process.env.PG_PORT || 5432;

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
});
