// src/middlewares/validateAuth.js
import { body, validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
   }
   next();
};

const validateAuthSchema = {
   register: [
      body("nombre").notEmpty().withMessage("El nombre es requerido"),
      body("email").isEmail().withMessage("Correo electrónico inválido"),
      body("telefono").isString().withMessage("Teléfono inválido"),
      body("pais_id").isInt({ min: 1 }).withMessage("El país es requerido y debe ser válido"),
      body("cp").optional().isString().isLength({ min: 3, max: 20 }).withMessage("Código postal inválido"),
      body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),

      body("deviceId").optional().isString().withMessage("deviceId debe ser string"),
      body("platform").optional().isString().withMessage("platform debe ser string"),
      body("model").optional().isString().withMessage("model debe ser string"),
      body("appVersion").optional().isString().withMessage("appVersion debe ser string"),

      handleValidationErrors,
   ],

   login: [
      body("email").isEmail().withMessage("Correo inválido"),
      body("password").notEmpty().withMessage("La contraseña es requerida"),

      body("deviceId").optional().isString().withMessage("deviceId debe ser string"),
      body("platform").optional().isString().withMessage("platform debe ser string"),
      body("model").optional().isString().withMessage("model debe ser string"),
      body("appVersion").optional().isString().withMessage("appVersion debe ser string"),

      handleValidationErrors,
   ],

   registerDevice: [
      body("deviceId").notEmpty().withMessage("deviceId requerido"),
      body("platform").optional().isString(),
      body("model").optional().isString(),
      body("appVersion").optional().isString(),
      body("userId").optional().isInt(),
      handleValidationErrors,
   ],

   refreshToken: [
      body("refreshToken").notEmpty().withMessage("refreshToken requerido"),
      body("deviceId").optional().isString(),
      handleValidationErrors,
   ],

   revokeDevice: [
      body("deviceId").notEmpty().withMessage("deviceId requerido"),
      body("userId").optional().isInt(),
      handleValidationErrors,
   ],

   sendRecoveryEmail: [body("email").isEmail().withMessage("Correo inválido"), handleValidationErrors],

   resetPassword: [
      body("token").notEmpty().withMessage("Token requerido"),
      body("password").isLength({ min: 6 }).withMessage("La nueva contraseña debe tener al menos 6 caracteres"),
      handleValidationErrors,
   ],
};

export default validateAuthSchema;
