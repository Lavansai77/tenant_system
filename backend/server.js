const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Master pool for general master_user management
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

async function startServer() {
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_user (
          id SERIAL PRIMARY KEY,
          org_id VARCHAR(50) UNIQUE NOT NULL,
          org_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          subscription_plan VARCHAR(50) DEFAULT 'Free Trial',
          active_access_code VARCHAR(6),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    client.release();
    console.log('✅ Master database initialized & connected successfully.');
  } catch (err) {
    console.error('❌ Master table initialization error details:', err);
  }
}

app.use('/api', authRoutes(pool));

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Backend server running on port ${PORT}`);
  await startServer();
});