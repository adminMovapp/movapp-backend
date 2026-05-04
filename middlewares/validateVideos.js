// src/middlewares/validateVideos.js
import { param, validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
   }
   next();
};

const validateVideosSchema = {
   getByModule: [
      param("slug")
         .isString()
         .withMessage("slug debe ser string")
         .isLength({ min: 1, max: 50 })
         .withMessage("slug fuera de rango")
         .matches(/^[a-z0-9-]+$/)
         .withMessage("slug debe ser kebab-case (a-z 0-9 -)"),
      handleValidationErrors,
   ],
};

export default validateVideosSchema;
