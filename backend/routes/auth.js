const express = require('express');
const bcrypt = require('bcrypt');

function authRoutes(pool) {
  const router = express.Router();

  // Helper function to safely extract and lowercase org_id
  const getCleanOrgId = (id) => (id ? String(id).trim().toLowerCase() : null);

  // 1. Organization Signup
  router.post('/signup', async (req, res) => {
    const { org_id, org_name, email, password, subscription_plan } = req.body || {};
    const cleanOrgId = getCleanOrgId(org_id);

    if (!cleanOrgId || !org_name || !email || !password) {
      return res.status(400).json({ error: 'All required fields must be provided.' });
    }

    try {
      const client = await pool.connect();

      // Check if organization exists in master table
      const existingOrg = await client.query(
        'SELECT * FROM master_user WHERE org_id = $1 OR email = $2',
        [cleanOrgId, email]
      );

      if (existingOrg.rows.length > 0) {
        client.release();
        return res.status(400).json({ error: 'Organization ID or Email is already registered.' });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert into master table
      await client.query(
        `INSERT INTO master_user (org_id, org_name, email, password_hash, subscription_plan) 
         VALUES ($1, $2, $3, $4, $5)`,
        [cleanOrgId, org_name, email, passwordHash, subscription_plan || 'Free Trial']
      );

      // Create isolated schema
      const schemaName = `org_${cleanOrgId}`;
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);

      // Create tables inside schema
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schemaName}.amenities (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            location VARCHAR(100),
            rate_per_hour NUMERIC(10, 2)
        );

        CREATE TABLE IF NOT EXISTS ${schemaName}.booking_history (
            id SERIAL PRIMARY KEY,
            user_name VARCHAR(100) NOT NULL,
            user_email VARCHAR(255) NOT NULL,
            location VARCHAR(100),
            amenity_id INT,
            slot_time TIMESTAMP NOT NULL,
            status VARCHAR(50) DEFAULT 'Confirmed',
            access_code VARCHAR(6) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ${schemaName}.employees (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            role VARCHAR(50) NOT NULL, 
            phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed amenities
      const defaultAmenities = [
        ['Executive Conference Room', 'Fully equipped boardroom with 4K display.', 'Floor 3, Wing A', 45.00],
        ['Private Interview Cabin', 'Quiet acoustic cabin ideal for candidate screening.', 'Floor 2, Wing B', 20.00],
        ['Hot Desk Space', 'Dedicated ergonomic workstation with high-speed fiber internet.', 'Ground Floor Open Bay', 15.00],
        ['Collaboration Lounge', 'Spacious breakout zone designed for team brainstorming.', 'Floor 4, Penthouse', 60.00]
      ];

      for (const amenity of defaultAmenities) {
        await client.query(
          `INSERT INTO ${schemaName}.amenities (name, description, location, rate_per_hour) 
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          amenity
        );
      }

      client.release();
      res.status(201).json({ message: 'Organization and isolated schema successfully created!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error during organization registration.' });
    }
  });

  // 2. Organization Login
  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM master_user WHERE email = $1', [email]);
      client.release();

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const orgUser = result.rows[0];
      const isMatch = await bcrypt.compare(password, orgUser.password_hash);

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      res.json({
        message: 'Login successful!',
        user: {
          org_id: orgUser.org_id,
          org_name: orgUser.org_name,
          email: orgUser.email,
          subscription_plan: orgUser.subscription_plan,
          active_access_code: orgUser.active_access_code
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error during login.' });
    }
  });

  // 3. Fetch Tenant Amenities
  router.post('/tenant-amenities', async (req, res) => {
    const cleanOrgId = getCleanOrgId(req.body?.org_id);
    if (!cleanOrgId) return res.status(400).json({ error: 'Missing organization ID.' });

    try {
      const client = await pool.connect();
      const schemaName = `org_${cleanOrgId}`;
      const amenities = await client.query(`SELECT * FROM ${schemaName}.amenities ORDER BY id ASC;`);
      client.release();

      res.json({ amenities: amenities.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch tenant amenities.' });
    }
  });

  // 4. Fetch Active Access Code
  router.post('/get-access-code', async (req, res) => {
    const cleanOrgId = getCleanOrgId(req.body?.org_id);
    if (!cleanOrgId) return res.status(400).json({ error: 'Missing organization ID.' });

    try {
      const client = await pool.connect();
      const result = await client.query(
        'SELECT active_access_code FROM master_user WHERE org_id = $1',
        [cleanOrgId]
      );
      client.release();

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Organization not found.' });
      }

      res.json({ active_access_code: result.rows[0].active_access_code || null });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch access code.' });
    }
  });

  // 5. Publish & Save Permanent Organization Access Code
  router.post('/publish-access-code', async (req, res) => {
    const { access_code } = req.body || {};
    const cleanOrgId = getCleanOrgId(req.body?.org_id);

    if (!cleanOrgId || !access_code) {
      return res.status(400).json({ error: 'Missing organization ID or access code.' });
    }

    try {
      const client = await pool.connect();
      const result = await client.query(
        'UPDATE master_user SET active_access_code = $1 WHERE org_id = $2 RETURNING *',
        [access_code, cleanOrgId]
      );
      client.release();

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Organization not found in database.' });
      }

      res.json({ message: 'Access code successfully saved!' });
    } catch (err) {
      console.error("DATABASE ERROR IN PUBLISH CODE:", err);
      res.status(500).json({ error: err.message || 'Failed to publish access code.' });
    }
  });

  // 6. Fetch Booking History
  router.post('/tenant-bookings', async (req, res) => {
    const cleanOrgId = getCleanOrgId(req.body?.org_id);
    if (!cleanOrgId) return res.status(400).json({ error: 'Missing organization ID.' });

    try {
      const client = await pool.connect();
      const schemaName = `org_${cleanOrgId}`;

      const bookings = await client.query(`
        SELECT DISTINCT ON (b.id) b.id, b.user_name, b.user_email, b.location, b.amenity_id, b.slot_time, b.status, b.access_code, a.name AS amenity_name 
        FROM ${schemaName}.booking_history b
        LEFT JOIN ${schemaName}.amenities a ON b.amenity_id = a.id
        ORDER BY b.id DESC, b.slot_time DESC;
      `);
      client.release();

      res.json({ bookings: bookings.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch booking history.' });
    }
  });

  // 7. Handle Slot Booking
  router.post('/book-slot', async (req, res) => {
    const { user_name, user_email, amenity_id, slot_time, access_code } = req.body || {};
    const cleanOrgId = getCleanOrgId(req.body?.org_id);

    if (!cleanOrgId) return res.status(400).json({ error: 'Missing organization ID.' });

    try {
      const client = await pool.connect();

      const orgRes = await client.query(
        'SELECT active_access_code FROM master_user WHERE org_id = $1',
        [cleanOrgId]
      );

      if (orgRes.rows.length === 0) {
        client.release();
        return res.status(404).json({ error: 'Organization not found.' });
      }

      const storedCode = orgRes.rows[0].active_access_code;

      if (!storedCode) {
        client.release();
        return res.status(400).json({ error: 'This organization has not set an active access code yet.' });
      }

      if (storedCode !== access_code) {
        client.release();
        return res.status(400).json({ error: 'Invalid access code. Please check the organization passcode.' });
      }

      const schemaName = `org_${cleanOrgId}`;
      const result = await client.query(
        `INSERT INTO ${schemaName}.booking_history (user_name, user_email, location, amenity_id, slot_time, access_code) 
         VALUES ($1, $2, (SELECT location FROM ${schemaName}.amenities WHERE id = $3), $3, $4, $5) RETURNING id`,
        [user_name, user_email, amenity_id, slot_time, access_code]
      );
      client.release();

      res.status(201).json({ message: 'Slot successfully booked!', booking_id: result.rows[0].id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to book slot.' });
    }
  });

  // 8. Update Organization Details
  router.put('/update-organization', async (req, res) => {
    const { org_name, email } = req.body || {};
    const cleanOrgId = getCleanOrgId(req.body?.org_id);

    if (!cleanOrgId) return res.status(400).json({ error: 'Missing organization ID.' });

    try {
      const client = await pool.connect();

      const emailCheck = await client.query(
        'SELECT * FROM master_user WHERE email = $1 AND org_id != $2',
        [email, cleanOrgId]
      );

      if (emailCheck.rows.length > 0) {
        client.release();
        return res.status(400).json({ error: 'Email address is already in use by another organization.' });
      }

      const result = await client.query(
        'UPDATE master_user SET org_name = $1, email = $2 WHERE org_id = $3 RETURNING org_id, org_name, email, subscription_plan, active_access_code',
        [org_name, email, cleanOrgId]
      );

      client.release();

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Organization not found.' });
      }

      res.json({
        message: 'Organization details successfully updated!',
        user: result.rows[0]
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update organization details.' });
    }
  });

  // 9. Fetch Employees
  router.post('/tenant-employees', async (req, res) => {
    const cleanOrgId = getCleanOrgId(req.body?.org_id);
    if (!cleanOrgId) return res.status(400).json({ error: 'Missing organization ID.' });

    try {
      const client = await pool.connect();
      const schemaName = `org_${cleanOrgId}`;

      const result = await client.query(`SELECT * FROM ${schemaName}.employees ORDER BY id DESC;`);
      client.release();

      res.json({ employees: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch employees.' });
    }
  });

  // 10. Add New Employee
  router.post('/add-employee', async (req, res) => {
    const { name, email, role, phone } = req.body || {};
    const cleanOrgId = getCleanOrgId(req.body?.org_id);

    if (!cleanOrgId) return res.status(400).json({ error: 'Missing organization ID.' });

    try {
      const client = await pool.connect();
      const schemaName = `org_${cleanOrgId}`;

      const result = await client.query(
        `INSERT INTO ${schemaName}.employees (name, email, role, phone) VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, email, role, phone]
      );
      client.release();

      res.status(201).json({ message: 'Employee added successfully!', employee: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add employee. Email might already exist in this organization.' });
    }
  });

  return router;
}

module.exports = authRoutes;