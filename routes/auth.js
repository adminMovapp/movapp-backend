// src/routes/auth.routes.js
import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import validateAuthSchema from "../middlewares/validateAuth.js";

const router = express.Router();

router.post("/register", validateAuthSchema.register, AuthController.registerUser);
router.post("/login", validateAuthSchema.login, AuthController.loginUser);
router.post("/refresh-token", validateAuthSchema.refreshToken, AuthController.refreshToken);
router.post("/recover", validateAuthSchema.sendRecoveryPassword, AuthController.sendRecoveryPassword);
router.post("/reset-password", validateAuthSchema.resetPassword, AuthController.resetPassword);
router.post("/revoke-device", validateAuthSchema.revokeDevice, AuthController.revokeDevice);

export default router;
