// routes/config.js
import express from "express";
import { ConfigController } from "../controllers/config.controller.js";
import validateConfigSchema from "../middlewares/validateConfig.js";

const router = express.Router();

router.get("/countries", ConfigController.getCountriesList);
router.get("/prices", validateConfigSchema.getPrices, ConfigController.getPrices);
export default router;
