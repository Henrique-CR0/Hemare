// Hemare - Conexao com o banco PostgreSQL (na nuvem, Neon)
require('dotenv').config();
const { Pool } = require('pg');

// O "Pool" gerencia as conexoes com o banco. A URL vem do arquivo .env.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

module.exports = pool;