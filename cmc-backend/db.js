import pkg from "pg";
const { Pool } = pkg;
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Probar conexión
pool.connect()
  .then(() => console.log("✅ Conectado a Neon PostgreSQL"))
  .catch((err) => console.error("❌ Error conectando a PostgreSQL:", err));

export default pool;
