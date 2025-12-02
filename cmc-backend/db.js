import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Verificación de conexión
pool.connect()
  .then(() => console.log("✅ Connected to Neon PostgreSQL"))
  .catch(err => console.error("❌ DB connection error:", err));

export default pool;
