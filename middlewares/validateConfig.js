// src/middlewares/validateConfig.js
import { query, validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
   }
   next();
};

const validateConfigSchema = {
   getPrices: [
      query("idcountry").notEmpty().withMessage("El parámetro idcountry es requerido"),
      handleValidationErrors,
   ],
};

export default validateConfigSchema;
