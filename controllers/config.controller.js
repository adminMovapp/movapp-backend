// controllers/config.controller.js

import { ConfigService } from "../services/configService.js";

export const ConfigController = {
   getCountriesList: async (req, res) => {
      try {
         console.error("\x1b[35m", "getCountriesList =>");
         const countries = await ConfigService.getCountries();
         console.log("[getCountriesList] countries:", countries);
         res.json({ success: true, countries });
      } catch (err) {
         console.error("\x1b[31m", "Error en getCountriesList", err);
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
         console.log("[getPrices] idcountry:", idcountry, "prices:", prices);
         if (!prices || (Array.isArray(prices) && prices.length === 0)) {
            console.error("\x1b[31m", "No se encontraron precios para el país ID:", idcountry);
            return res.json({ success: false, message: "No se encontraron precios" });
         }

         res.json({ success: true, prices });
      } catch (err) {
         console.error("\x1b[31m", "Error en getPrices", err);
         res.status(500).json({
            success: false,
            message: "Error al consultar países",
         });
      }
   },
};
