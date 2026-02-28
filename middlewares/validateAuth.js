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
      body("pais_id")
         .isIn([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
         .withMessage("La región seleccionada no se encuentra disponible por el momento"),
      body("cp").optional().isString().isLength({ min: 1, max: 8 }).withMessage("Código postal inválido"),
      body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),

      body("deviceId").notEmpty().isString().withMessage("deviceId debe ser string"),
      body("device").notEmpty().isString().withMessage("device debe ser string"),
      body("platform").notEmpty().isString().withMessage("platform debe ser string"),
      body("model").notEmpty().isString().withMessage("model debe ser string"),
      body("appVersion").notEmpty().isString().withMessage("appVersion debe ser string"),

      handleValidationErrors,
   ],

   login: [
      body("email").isEmail().withMessage("Correo inválido"),
      body("password").notEmpty().withMessage("La contraseña es requerida"),

      body("deviceId").notEmpty().isString().withMessage("deviceId debe ser string"),

      body("device").notEmpty().isString().withMessage("device debe ser string"),
      body("platform").notEmpty().isString().withMessage("platform debe ser string"),
      body("model").notEmpty().isString().withMessage("model debe ser string"),
      body("appVersion").notEmpty().isString().withMessage("appVersion debe ser string"),

      handleValidationErrors,
   ],

   registerDevice: [
      body("deviceId").notEmpty().withMessage("deviceId requerido"),
      body("device").optional().isString(),
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

   sendRecoveryPassword: [body("email").isEmail().withMessage("Correo inválido"), handleValidationErrors],

   resetPassword: [
      body("email").isEmail().withMessage("Correo electrónico inválido"),
      body("code").notEmpty().isString().withMessage("El código de recuperación es requerido"),
      body("password").isLength({ min: 6 }).withMessage("La nueva contraseña debe tener al menos 6 caracteres"),
      handleValidationErrors,
   ],
};

export default validateAuthSchema;
