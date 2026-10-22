const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Neon PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_u2Nk0HQBrRbZ@ep-lingering-rice-b515def2-pooler.c-7.us-east-2.aws.neon.tech/master_db?sslmode=require&channel_binding=require',
});

// Initialize Master Database Table and auto-patch missing columns
pool.query(`
  CREATE TABLE IF NOT EXISTS master_user (
      id SERIAL PRIMARY KEY,
      org_id VARCHAR(50) UNIQUE NOT NULL,
      org_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      subscription_plan VARCHAR(100) DEFAULT 'Free Trial',
      active_access_code VARCHAR(6),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  ALTER TABLE master_user ADD COLUMN IF NOT EXISTS active_access_code VARCHAR(6);
`)
.then(() => console.log('Master database initialized & checked successfully.'))
.catch(err => console.error('Error initializing master database:', err));

// Mount Authentication & Tenant Routes
app.use('/api', authRoutes(pool));

// Root Health Check Endpoint
app.get('/', (req, res) => {
  res.send('Multi-Tenant Backend Server is running successfully.');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});