import express from "express";
import { PaymentsStripeWebController } from "../controllers/paymentsStripeWeb.controller.js";

const router = express.Router();

router.post("/create-intent", PaymentsStripeWebController.createIntent);

router.post("/webhook", express.raw({ type: "application/json" }), PaymentsStripeWebController.webhook);

router.get("/intent/:id", PaymentsStripeWebController.getByIntent);

export default router;
