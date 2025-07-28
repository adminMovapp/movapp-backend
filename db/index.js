// db.js
import dotenv from "dotenv";
import pkg from "pg";

const isProduction = process.env.NODE_ENV === 'production';


// if (process.env.NODE_ENV !== "production") {
   dotenv.config();
// }

const { Pool } = pkg;

const pool = new Pool({
   host: process.env.PG_HOST,
   port: Number(process.env.PG_PORT),
   user: process.env.PG_USER,
   password: process.env.PG_PASSWORD,
   database: process.env.PG_DATABASE,
   ssl: isProduction ? { rejectUnauthorized: false } : false,

});

export const query = (text, params) => pool.query(text, params);
export { pool };
