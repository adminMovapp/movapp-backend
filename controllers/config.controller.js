// controllers/config.controller.js
import { getPaises } from "../dao/configDAO.js";

export const ConfigController = {
   getPaisesList: async (req, res) => {
      try {
         const paises = await getPaises();
         res.json({ success: true, paises });
      } catch (err) {
         console.log("\x1b[31m", "Error", err);
         res.status(500).json({
            success: false,
            message: "Error al consultar países",
         });
      }
   },
};
