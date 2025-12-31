import express from "express";
import { OrdersController } from "../controllers/orders.controller.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Solo rutas de consulta
router.get("/number/:orderNumber", OrdersController.getByNumber);
router.get("/paid/user/:userUuid", authenticateToken, OrdersController.getPaidByUserUuid);
router.get("/:id", OrdersController.getById);

export default router;
