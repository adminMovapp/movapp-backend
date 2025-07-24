// db.js
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
   host: process.env.PG_HOST,
   port: Number(process.env.PG_PORT),
   user: process.env.PG_USER,
   password: process.env.PG_PASSWORD,
   database: process.env.PG_DATABASE,
});

export const query = (text, params) => pool.query(text, params);
export { pool };
