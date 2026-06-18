import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool1 = new Pool({
    connectionString: process.env.NEON1_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool1.on('connect', () => {
    console.log('✅ Conectado a Neon #1 (App Mobile)');
});

pool1.on('error', (err) => {
    console.error('❌ Error en Neon #1:', err.message);
});

export default pool1;