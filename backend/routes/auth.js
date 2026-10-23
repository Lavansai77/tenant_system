const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const tenantPools = {};

function authRoutes(masterPool) {
  const router = express.Router();

  const getCleanOrgId = (id) => (id ? String(id).trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : null);

  // Helper to get or create a connection pool for a specific tenant database
  const getCachedTenantPool = (cleanOrgId) => {
    if (!tenantPools[cleanOrgId]) {
      const baseUri = process.env.DATABASE_URL;
      const urlObj = new URL(baseUri);
      urlObj.pathname = `/org_${cleanOrgId}`;
      
      tenantPools[cleanOrgId] = new Pool({
        connectionString: urlObj.toString(),
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 8000
      });
    }
    return tenantPools[cleanOrgId];
  };

  // Helper to ensure physical tenant database & tables exist with seeding
  async function ensureTenantDbReady(cleanOrgId) {
    const dbName = `org_${cleanOrgId}`;

    // 1. Create physical database using a non-pooled un-transactional client connected to default 'postgres' db
    const urlObj = new URL(process.env.DATABASE_URL);
    urlObj.pathname = '/postgres'; // Connect to default admin db
    const adminPool = new Pool({ connectionString: urlObj.toString(), ssl: { rejectUnauthorized: false } });
    
    let adminClient;
    try {
      adminClient = await adminPool.connect();
      // Check if database exists
      const dbCheck = await adminClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
      if (dbCheck.rows.length === 0) {
        await adminClient.query(`CREATE DATABASE ${dbName};`);
      }
    } catch (e) {
      console.log(`Note on DB creation (${dbName}):`, e.message);
    } finally {
      if (adminClient) adminClient.release();
      await adminPool.end();
    }

    // 2. Connect to the tenant's physical database and create tables
    const tenantPool = getCachedTenantPool(cleanOrgId);
    let client;
    try {
      client = await tenantPool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS amenities (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            location VARCHAR(100),
            rate_per_hour NUMERIC(10, 2)
        );

        CREATE TABLE IF NOT EXISTS booking_history (
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

        CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            role VARCHAR(50) NOT NULL, 
            phone VARCHAR(20),
            password_hash VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            role_name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS permissions (
            id SERIAL PRIMARY KEY,
            role_id INT REFERENCES roles(id) ON DELETE CASCADE,
            permission_key VARCHAR(100) NOT NULL,
            allowed BOOLEAN DEFAULT TRUE,
            CONSTRAINT unique_role_perm UNIQUE (role_id, permission_key)
        );
      `);

      await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`).catch(() => {});

      // Seed default roles if empty
      const checkRoles = await client.query('SELECT COUNT(*) FROM roles;');
      if (parseInt(checkRoles.rows[0].count) === 0) {
        await client.query(`
          INSERT INTO roles (role_name, description) VALUES 
          ('Operations Manager', 'Full CRUD management access to workspace, amenities, and bookings'),
          ('Receptionist', 'Front desk visitor management with read-only amenity access'),
          ('Facility Admin', 'Maintenance and asset coordination')
          ON CONFLICT (role_name) DO NOTHING;
        `);

        const rolesRes = await client.query('SELECT id, role_name FROM roles;');
        for (const r of rolesRes.rows) {
          let defaults = {};
          if (r.role_name === 'Operations Manager') {
            defaults = { manage_amenities: true, publish_access_code: true, view_bookings: true, manage_staff: true };
          } else if (r.role_name === 'Receptionist') {
            defaults = { manage_amenities: false, publish_access_code: false, view_bookings: true, manage_staff: false };
          } else {
            defaults = { manage_amenities: true, publish_access_code: false, view_bookings: true, manage_staff: false };
          }

          for (const [pKey, pVal] of Object.entries(defaults)) {
            await client.query(
              `INSERT INTO permissions (role_id, permission_key, allowed) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
              [r.id, pKey, pVal]
            );
          }
        }

        const defaultAmenities = [
          ['Executive Conference Room', 'Fully equipped boardroom with 4K display.', 'Floor 3, Wing A', 45.00],
          ['Private Interview Cabin', 'Quiet acoustic cabin ideal for candidate screening.', 'Floor 2, Wing B', 20.00],
          ['Hot Desk Space', 'Ergonomic workstation with high-speed fiber internet.', 'Ground Floor Open Bay', 15.00]
        ];
        for (const amenity of defaultAmenities) {
          await client.query(
            `INSERT INTO amenities (name, description, location, rate_per_hour) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
            amenity
          );
        }
      }
    } finally {
      if (client) client.release();
    }
  }

  // RBAC Permission verification middleware helper
  async function verifyPermission(cleanOrgId, actorEmail, permissionKey) {
    if (!actorEmail) return true;
    try {
      const tenantPool = getCachedTenantPool(cleanOrgId);
      const client = await tenantPool.connect();
      try {
        const empRes = await client.query('SELECT role FROM employees WHERE email = $1', [actorEmail]);
        if (empRes.rows.length === 0) return true;
        const roleName = empRes.rows[0].role;

        const permRes = await client.query(`
          SELECT p.allowed 
          FROM permissions p 
          JOIN roles r ON p.role_id = r.id 
          WHERE r.role_name = $1 AND p.permission_key = $2
        `, [roleName, permissionKey]);

        if (permRes.rows.length > 0) {
          return permRes.rows[0].allowed;
        }
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      return true;
    }
  }

  // 1. SIGNUP ROUTE
  router.post('/signup', async (req, res) => {
    const { org_id, org_name, email, password, confirm_password, subscription_plan } = req.body || {};
    const cleanOrgId = getCleanOrgId(org_id);

    if (!cleanOrgId || !org_name || !email || !password || !confirm_password) {
      return res.status(400).json({ error: 'All required fields must be provided.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Password and Confirm Password do not match.' });
    }

    let client;
    try {
      client = await masterPool.connect();
      const existingOrg = await client.query(
        'SELECT * FROM master_user WHERE org_id = $1 OR email = $2',
        [cleanOrgId, email]
      );

      if (existingOrg.rows.length > 0) {
        client.release();
        return res.status(400).json({ error: 'Organization ID or Email is already registered.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await client.query(
        `INSERT INTO master_user (org_id, org_name, email, password_hash, subscription_plan) 
         VALUES ($1, $2, $3, $4, $5)`,
        [cleanOrgId, org_name, email, passwordHash, subscription_plan || 'Free Trial']
      );
      client.release();

      await ensureTenantDbReady(cleanOrgId);
      res.status(201).json({ message: 'Super Admin & Separate Organization Database successfully created!' });
    } catch (err) {
      if (client) client.release();
      console.error('Signup error:', err);
      res.status(500).json({ error: `Server error during organization registration: ${err.message}` });
    }
  });

  // 2. LOGIN ROUTE
  router.post('/login', async (req, res) => {
    const { org_id, email, password } = req.body || {};
    const cleanOrgId = getCleanOrgId(org_id);

    if (!cleanOrgId || !email || !password) {
      return res.status(400).json({ error: 'Organization ID, Email, and Password are all required.' });
    }

    try {
      const client = await masterPool.connect();
      const result = await client.query('SELECT * FROM master_user WHERE org_id = $1 AND email = $2', [cleanOrgId, email]);
      client.release();

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid Organization ID or Email.' });
      }

      const orgUser = result.rows[0];
      const isMatch = await bcrypt.compare(password, orgUser.password_hash);

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password.' });
      }

      await ensureTenantDbReady(cleanOrgId);

      res.json({
        message: 'Super Admin login successful!',
        user: {
          org_id: orgUser.org_id,
          org_name: orgUser.org_name,
          email: orgUser.email,
          subscription_plan: orgUser.subscription_plan,
          active_access_code: orgUser.active_access_code,
          is_employee: false
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: `Server error during login: ${err.message}` });
    }
  });

  // 3. EMPLOYEE LOGIN
  router.post('/employee-login', async (req, res) => {
    const { org_id, email, password } = req.body || {};
    const cleanOrgId = getCleanOrgId(org_id);

    if (!cleanOrgId || !email || !password) {
      return res.status(400).json({ error: 'Organization ID, Email, and Password are all required.' });
    }

    try {
      await ensureTenantDbReady(cleanOrgId);
      const tenantPool = getCachedTenantPool(cleanOrgId);
      const client = await tenantPool.connect();
      
      const empRes = await client.query('SELECT * FROM employees WHERE email = $1', [email]);
      client.release();

      if (empRes.rows.length === 0) {
        return res.status(401).json({ error: 'Employee not found in this organization.' });
      }

      const employee = empRes.rows[0];
      let isMatch = false;

      if (!employee.password_hash) {
        const defaultHash = await bcrypt.hash('welcome123', 10);
        const clientUpdate = await tenantPool.connect();
        await clientUpdate.query('UPDATE employees SET password_hash = $1 WHERE id = $2', [defaultHash, employee.id]);
        clientUpdate.release();
        isMatch = await bcrypt.compare(password, defaultHash);
      } else {
        isMatch = await bcrypt.compare(password, employee.password_hash);
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password. (Default staff password is: welcome123)' });
      }

      const client2 = await tenantPool.connect();
      const permRes = await client2.query(`
        SELECT p.permission_key, p.allowed 
        FROM permissions p 
        JOIN roles r ON p.role_id = r.id 
        WHERE r.role_name = $1
      `, [employee.role]);
      client2.release();

      const permissions = {};
      permRes.rows.forEach(row => {
        permissions[row.permission_key] = row.allowed;
      });

      res.json({
        message: 'Employee login successful!',
        user: {
          org_id: cleanOrgId,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          is_employee: true,
          permissions: permissions
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error during employee login.' });
    }
  });

  // 4. AMENITIES CRUD
  router.post('/tenant-amenities', async (req, res) => {
    const cleanOrgId = getCleanOrgId(req.body?.org_id);
    if (!cleanOrgId) return res.status(400).json({ error: 'Missing organization ID.' });

    try {
      await ensureTenantDbReady(cleanOrgId);
      const tenantPool = getCachedTenantPool(cleanOrgId);
      const client = await tenantPool.connect();
      const result = await client.query('SELECT * FROM amenities ORDER BY id DESC;');
      client.release();
      res.json({ amenities: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch amenities.' });
    }
  });

  router.post('/add-amenity', async (req, res) => {
    const { name, description, location, rate_per_hour, actor_email } = req.body || {};
    const cleanOrgId = getCleanOrgId(req.body?.org_id);

    if (!cleanOrgId || !name) return res.status(400).json({ error: 'Missing amenity details.' });

    const allowed = await verifyPermission(cleanOrgId, actor_email, 'manage_amenities');
    if (!allowed) return res.status(403).json({ error: 'Permission denied.' });

    try {
      await ensureTenantDbReady(cleanOrgId);
      const tenantPool = getCachedTenantPool(cleanOrgId);
      const client = await tenantPool.connect();
      const result = await client.query(
        'INSERT INTO amenities (name, description, location, rate_per_hour) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, description, location, rate_per_hour || 0.00]
      );
      client.release();
      res.status(201).json({ message: 'Amenity created successfully!', amenity: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create amenity.' });
    }
  });

  // 5. BOOKINGS & SLOTS
  router.post('/tenant-bookings', async (req, res) => {
    const { org_id, actor_email } = req.body || {};
    const cleanOrgId = getCleanOrgId(org_id);
    if (!cleanOrgId) return res.status(400).json({ error: 'Missing organization ID.' });

    const allowed = await verifyPermission(cleanOrgId, actor_email, 'view_bookings');
    if (!allowed) return res.status(403).json({ error: 'Permission denied.' });

    try {
      await ensureTenantDbReady(cleanOrgId);
      const tenantPool = getCachedTenantPool(cleanOrgId);
      const client = await tenantPool.connect();
      const bookings = await client.query(`
        SELECT b.*, a.name AS amenity_name 
        FROM booking_history b
        LEFT JOIN amenities a ON b.amenity_id = a.id
        ORDER BY b.id DESC;
      `);
      client.release();
      res.json({ bookings: bookings.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch bookings.' });
    }
  });

  router.post('/book-slot', async (req, res) => {
    const { org_id, user_name, user_email, location, amenity_id, slot_time } = req.body || {};
    const cleanOrgId = getCleanOrgId(org_id);

    if (!cleanOrgId || !user_name || !user_email || !amenity_id || !slot_time) {
      return res.status(400).json({ error: 'All booking fields are required.' });
    }

    try {
      await ensureTenantDbReady(cleanOrgId);
      const tenantPool = getCachedTenantPool(cleanOrgId);
      const client = await tenantPool.connect();

      const masterClient = await masterPool.connect();
      let accessCode = '123456';
      try {
        const masterRes = await masterClient.query('SELECT active_access_code FROM master_user WHERE org_id = $1', [cleanOrgId]);
        if (masterRes.rows.length > 0 && masterRes.rows[0].active_access_code) {
          accessCode = masterRes.rows[0].active_access_code;
        }
      } finally {
        masterClient.release();
      }

      const result = await client.query(
        `INSERT INTO booking_history (user_name, user_email, location, amenity_id, slot_time, access_code, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'Confirmed') RETURNING *`,
        [user_name, user_email, location || 'Main Facility', amenity_id, slot_time, accessCode]
      );
      client.release();

      res.status(201).json({ message: 'Slot booked successfully!', booking: result.rows[0] });
    } catch (err) {
      console.error('Booking error:', err);
      res.status(500).json({ error: 'Failed to book slot.' });
    }
  });

  // 6. EMPLOYEES
  router.post('/tenant-employees', async (req, res) => {
    const cleanOrgId = getCleanOrgId(req.body?.org_id);
    if (!cleanOrgId) return res.status(400).json({ error: 'Missing organization ID.' });

    try {
      await ensureTenantDbReady(cleanOrgId);
      const tenantPool = getCachedTenantPool(cleanOrgId);
      const client = await tenantPool.connect();
      const result = await client.query('SELECT id, name, email, role, phone, created_at FROM employees ORDER BY id DESC;');
      client.release();
      res.json({ employees: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch employees.' });
    }
  });

  router.post('/add-employee', async (req, res) => {
    const { name, email, role, phone, password, actor_email } = req.body || {};
    const cleanOrgId = getCleanOrgId(req.body?.org_id);

    if (!cleanOrgId || !name || !email || !role) {
      return res.status(400).json({ error: 'Missing required employee details.' });
    }

    const allowed = await verifyPermission(cleanOrgId, actor_email, 'manage_staff');
    if (!allowed) return res.status(403).json({ error: 'Permission denied.' });

    try {
      await ensureTenantDbReady(cleanOrgId);
      const tenantPool = getCachedTenantPool(cleanOrgId);
      const client = await tenantPool.connect();
      
      const passwordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('welcome123', 10);

      const result = await client.query(
        'INSERT INTO employees (name, email, role, phone, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, phone',
        [name, email, role, phone, passwordHash]
      );
      client.release();
      res.status(201).json({ message: 'Employee added successfully!', employee: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add employee. Email may already exist.' });
    }
  });

  // 7. ACCESS CODES
  router.post('/get-access-code', async (req, res) => {
    const cleanOrgId = getCleanOrgId(req.body?.org_id);
    if (!cleanOrgId) return res.status(400).json({ error: 'Missing organization ID.' });

    try {
      const client = await masterPool.connect();
      const result = await client.query('SELECT active_access_code FROM master_user WHERE org_id = $1', [cleanOrgId]);
      client.release();
      res.json({ active_access_code: result.rows[0]?.active_access_code || null });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch access code.' });
    }
  });

  router.post('/publish-access-code', async (req, res) => {
    const { access_code, actor_email } = req.body || {};
    const cleanOrgId = getCleanOrgId(req.body?.org_id);

    if (!cleanOrgId || !access_code) return res.status(400).json({ error: 'Missing details.' });

    const allowed = await verifyPermission(cleanOrgId, actor_email, 'publish_access_code');
    if (!allowed) return res.status(403).json({ error: 'Permission denied.' });

    try {
      const client = await masterPool.connect();
      await client.query('UPDATE master_user SET active_access_code = $1 WHERE org_id = $2', [access_code, cleanOrgId]);
      client.release();
      res.json({ message: 'Access code saved!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to publish access code.' });
    }
  });

  // 8. ROLES & PERMISSIONS
  router.post('/tenant-roles', async (req, res) => {
    const cleanOrgId = getCleanOrgId(req.body?.org_id);
    if (!cleanOrgId) return res.status(400).json({ error: 'Missing organization ID.' });

    try {
      await ensureTenantDbReady(cleanOrgId);
      const tenantPool = getCachedTenantPool(cleanOrgId);
      const client = await tenantPool.connect();
      const roles = await client.query('SELECT * FROM roles ORDER BY id ASC;');
      const permissions = await client.query('SELECT * FROM permissions;');
      client.release();
      res.json({ roles: roles.rows, permissions: permissions.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch roles & permissions.' });
    }
  });

  router.post('/update-permission', async (req, res) => {
    const { role_id, permission_key, allowed } = req.body || {};
    const cleanOrgId = getCleanOrgId(req.body?.org_id);

    if (!cleanOrgId || !role_id || !permission_key) {
      return res.status(400).json({ error: 'Missing details.' });
    }

    try {
      await ensureTenantDbReady(cleanOrgId);
      const tenantPool = getCachedTenantPool(cleanOrgId);
      const client = await tenantPool.connect();

      const updateRes = await client.query(
        `UPDATE permissions SET allowed = $3 WHERE role_id = $1 AND permission_key = $2 RETURNING *`,
        [role_id, permission_key, allowed]
      );

      if (updateRes.rows.length ===0) {
        await client.query(
          `INSERT INTO permissions (role_id, permission_key, allowed) VALUES ($1, $2, $3)`,
          [role_id, permission_key, allowed]
        );
      }

      client.release();
      res.json({ message: 'Permission updated successfully!' });
    } catch (err) {
      console.error("Update permission error:", err);
      res.status(500).json({ error: `Failed to update permission: ${err.message}` });
    }
  });

  return router;
}

module.exports = authRoutes;