// routes/config.js
import express from "express";
import { ConfigController } from "../controllers/config.controller.js";

const router = express.Router();

router.get("/paises", ConfigController.getPaisesList);

export default router;
