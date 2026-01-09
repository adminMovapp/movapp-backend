// controllers/config.controller.js

import { ConfigService } from "../services/configService.js";

export const ConfigController = {
   getCountriesList: async (req, res) => {
      try {
         console.error("\x1b[35m", "getCountriesList =>");

         const countries = await ConfigService.getCountries();
         res.json({ success: true, countries });
      } catch (err) {
         console.error("\x1b[31m", "Error", err);
         res.status(500).json({
            success: false,
            message: "Error al consultar países",
         });
      }
   },
   getPrices: async (req, res) => {
      try {
         const idcountry = parseInt(req.query.idcountry, 10);
         console.error("\x1b[35m", "getPrices =>", idcountry);
         const prices = await ConfigService.getPrices(idcountry);
         if (!prices || (Array.isArray(prices) && prices.length === 0)) {
            return res.json({ success: false, message: "No se encontraron precios" });
         }
         res.json({ success: true, prices });
      } catch (err) {
         console.error("\x1b[31m", "Error", err);
         res.status(500).json({
            success: false,
            message: "Error al consultar países",
         });
      }
   },
};
