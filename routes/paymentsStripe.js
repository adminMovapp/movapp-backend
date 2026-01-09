import express from "express";
import { PaymentsStripeController } from "../controllers/paymentsStripe.controller.js";

const router = express.Router();

router.post("/create-intent", PaymentsStripeController.createIntent);

router.post("/webhook", express.raw({ type: "application/json" }), PaymentsStripeController.webhook);

router.post("/webhook-test", express.json(), PaymentsStripeController.webhookTest);

router.get("/intent/:id", PaymentsStripeController.getByIntent);

export default router;
