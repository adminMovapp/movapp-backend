import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { initTables } from "./models/tables.js";
import pagosRouter from "./routes/payments.js";
import dotenv from 'dotenv';

dotenv.config();
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();  // Carga las variables de .env solo en desarrollo
}


const app = express();


app.use(cors({
    origin: '*',  
}));

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


console.log('DB Host:', process.env.DB_HOST);  // Esto debería mostrar la IP correcta de tu base de datos
console.log('DB Port:', process.env.DB_PORT);

app.listen(PORT, () => {
   console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
});
