import { query } from "../db/index.js";

export async function getPaises() {
   const result = await query(` SELECT id,codigo_pais,pais,moneda,simbolo,codigo_telefono
                                FROM    Paises
                                WHERE   activo = TRUE  
                                ORDER   BY id ASC`);
   return result.rows;
}
