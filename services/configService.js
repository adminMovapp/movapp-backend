// ============================================
// services/configService.js
// obtener datos de configuración como países, monedas, etc.
// ============================================
import { ConfigDAO } from "../dao/configDAO.js";

export const ConfigService = {
   /**
    * Lista todos los paises activos
    */
   async getCountries() {
      return await ConfigDAO.getCountries();
   },
   /**
    * Lista todos los precios activos para un país dado
    */
   async getPrices(idcountry) {
      return await ConfigDAO.getPrices(idcountry);
   },
};
