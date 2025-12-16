import express from "express";
import { OrdersController } from "../controllers/orders.controller.js";

const router = express.Router();

// Solo rutas de consulta
router.get("/:id", OrdersController.getById);
router.get("/number/:orderNumber", OrdersController.getByNumber);

export default router;
