// db.js
import dotenv from "dotenv";
import pkg from "pg";

// Cargar las variables de entorno solo si no estamos en producción
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const { Pool } = pkg;

// Establecer la configuración de conexión con la base de datos
const pool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
//   ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false, // SSL en producción
   ssl: {
      rejectUnauthorized: false, // Desactivar la verificación del certificado SSL
   },
   max: 20, // Número máximo de conexiones en el pool
   idleTimeoutMillis: 30000, // Tiempo de espera para liberar conexiones inactivas
   connectionTimeoutMillis: 2000, // Tiempo de espera para establecer una conexión

});

// Función para manejar consultas con manejo de errores
export const query = async (text, params) => {
  try {
    // Realizar la consulta
    const result = await pool.query(text, params);
    return result; // Retornar el resultado de la consulta
  } catch (error) {
    // Manejar errores durante la ejecución de la consulta
    console.error('Error en la consulta a la base de datos:', error.message);
    throw new Error('Error en la consulta a la base de datos', { cause: error }); // Lanzamos el error para ser manejado externamente
  }
};

// Verificar la conexión inicial al inicio de la aplicación
const testConnection = async () => {
  try {
    await pool.connect();
    console.log("Conexión a la base de datos exitosa.");
  } catch (error) {
    console.error("Error al conectar a la base de datos:", error.message);
    process.exit(1); // Terminar la aplicación si no podemos conectar a la base de datos
  }
};

// Llamar a la función de prueba de conexión al iniciar
testConnection();

export { pool };
