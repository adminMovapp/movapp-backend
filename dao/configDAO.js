import { query } from "../db/index.js";

export const ConfigDAO = {
   getCountries: async () => {
      const result = await query(` SELECT id,codigo_pais,pais,moneda,simbolo,codigo_telefono
                                FROM    Paises
                                WHERE   activo = TRUE  
                                ORDER   BY id ASC`);
      return result.rows;
   },

   getPrices: async (idcountry) => {
      const result = await query(
         `SELECT A.producto_id,B.sku,B.nombre,B.descripcion,A.precio,A.precio_mx,C.moneda,C.simbolo
                     FROM precios A
                     INNER JOIN productos B ON (A.producto_id = B.id)
                     INNER JOIN paises C ON (A.pais_id = C.id)  
                     WHERE A.pais_id = $1
                     ;`,
         [idcountry],
      );
      return result.rows;
   },
};
