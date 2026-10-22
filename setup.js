const fs = require('fs');
const path = require('path');

const structure = {
  'backend': {
    'routes': {
      'auth.js': `const express = require('express');
const bcrypt = require('bcrypt');

const router = express.Router();
const isAlphanumeric = (str) => /^[a-zA-Z0-9]+$/.test(str);

module.exports = (pool) => {
  router.post('/signup', async (req, res) => {
    const { org_id, org_name, email, password, confirmPassword, termsAccepted } = req.body;

    if (!termsAccepted) {
      return res.status(400).json({ error: 'You must agree to the terms and conditions.' });
    }
    if (!isAlphanumeric(org_id)) {
      return res.status(400).json({ error: 'Organization ID must be alphanumeric only.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT * FROM master_user WHERE org_id = $1 OR email = $2',
        [org_id.toLowerCase(), email]
      );
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Organization ID or Email already registered.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await client.query(
        \`INSERT INTO master_user (org_id, org_name, email, password_hash, subscription_plan) 
         VALUES ($1, $2, $3, $4, $5)\`,
        [org_id.toLowerCase(), org_name, email, hashedPassword, 'Free Trial Plan (14 Days)']
      );

      const schemaName = \`org_\${org_id.toLowerCase()}\`;
      await client.query(\`CREATE SCHEMA IF NOT EXISTS \${schemaName};\`);

      await client.query(\`
        CREATE TABLE IF NOT EXISTS \${schemaName}.roles (
            id SERIAL PRIMARY KEY,
            role_name VARCHAR(50) UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS \${schemaName}.permissions (
            id SERIAL PRIMARY KEY,
            role_id INT REFERENCES \${schemaName}.roles(id) ON DELETE CASCADE,
            module VARCHAR(50) NOT NULL,
            can_create BOOLEAN DEFAULT FALSE,
            can_read BOOLEAN DEFAULT FALSE,
            can_update BOOLEAN DEFAULT FALSE,
            can_delete BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS \${schemaName}.employees (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            role_id INT REFERENCES \${schemaName}.roles(id)
        );

        CREATE TABLE IF NOT EXISTS \${schemaName}.amenities (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            rate_per_hour DECIMAL(10,2) NOT NULL,
            location VARCHAR(100) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS \${schemaName}.booking_history (
            id SERIAL PRIMARY KEY,
            user_name VARCHAR(100) NOT NULL,
            user_email VARCHAR(255) NOT NULL,
            location VARCHAR(100) NOT NULL,
            amenity_id INT REFERENCES \${schemaName}.amenities(id),
            slot_time TIMESTAMP NOT NULL,
            status VARCHAR(50) DEFAULT 'Confirmed',
            access_code VARCHAR(6)
        );
      \`);

      await client.query(\`
        INSERT INTO \${schemaName}.roles (role_name) VALUES 
        ('superadmin'), ('operations manager'), ('receptionist')
        ON CONFLICT (role_name) DO NOTHING;

        INSERT INTO \${schemaName}.amenities (name, description, rate_per_hour, location) VALUES 
        ('Executive Boardroom', 'Large conference room with A/V setup', 50.00, 'Floor 3, Wing A'),
        ('Conference Pod B', 'Small huddle room for team syncs', 25.00, 'Floor 2, Wing B'),
        ('Event Hall', 'Spacious auditorium for townhalls', 150.00, 'Ground Floor')
        ON CONFLICT DO NOTHING;
      \`);

      await client.query('COMMIT');
      res.status(201).json({ message: 'Organization successfully registered & provisioned!' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Server error during signup.' });
    } finally {
      client.release();
    }
  });

  router.post('/login', async (req, res) => {
    const { org_id, email, password } = req.body;
    try {
      const client = await pool.connect();
      const result = await client.query(
        'SELECT * FROM master_user WHERE org_id = $1 AND email = $2',
        [org_id.toLowerCase(), email]
      );
      client.release();

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Invalid Organization ID or Email.' });
      }

      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Incorrect password.' });
      }

      res.json({
        message: 'Login successful',
        org_id: user.org_id,
        org_name: user.org_name,
        email: user.email,
        subscription_plan: user.subscription_plan,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error during login.' });
    }
  });

  router.post('/verify-org', async (req, res) => {
    const { org_id } = req.body;
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT org_id, org_name FROM master_user WHERE org_id = $1', [org_id.toLowerCase()]);
      client.release();

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Invalid Organization ID. Please check and try again.' });
      }
      res.json({ success: true, org_name: result.rows[0].org_name });
    } catch (err) {
      res.status(500).json({ error: 'Server error verifying organization.' });
    }
  });

  return router;
};
`
    },
    'server.js': `const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initMasterDB = async () => {
  try {
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS master_user (
          id SERIAL PRIMARY KEY,
          org_id VARCHAR(50) UNIQUE NOT NULL,
          org_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          subscription_plan VARCHAR(50) DEFAULT 'Trial Plan',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    \`);
    console.log('Master database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize master database:', err);
  }
};

initMasterDB();

const authRoutes = require('./routes/auth')(pool);
app.use('/api', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(\`Backend server running on port \${PORT}\`);
});
`,
    '.env': `PORT=5000
DATABASE_URL=postgresql://neondb_owner:your_password@your-neon-host.neon.tech/master_db?sslmode=require
`,
    'package.json': JSON.stringify({
      name: "backend",
      version: "1.0.0",
      main: "server.js",
      scripts: { start: "node server.js" },
      dependencies: { bcrypt: "^5.1.1", cors: "^2.8.5", dotenv: "^16.4.5", express: "^4.19.2", pg: "^8.11.3" }
    }, null, 2)
  },
  'frontend': {
    'src': {
      'components': {
        'Signup.jsx': `import React, { useState } from 'react';

export default function Signup({ switchToLogin }) {
  const [formData, setFormData] = useState({
    org_id: '', org_name: '', email: '', password: '', confirmPassword: '', termsAccepted: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!/^[a-zA-Z0-9]+$/.test(formData.org_id)) {
      return setError('Organization ID must contain letters and numbers only.');
    }

    try {
      const res = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Organization registered successfully! You can now log in.');
      setTimeout(switchToLogin, 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow border mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center text-indigo-600">Organization Signup</h2>
      {error && <p className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</p>}
      {success && <p className="bg-green-100 text-green-700 p-2 rounded mb-4 text-sm">{success}</p>}
      
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Organization ID (Alphanumeric)</label>
          <input type="text" name="org_id" value={formData.org_id} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Organization Name</label>
          <input type="text" name="org_name" value={formData.org_name} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Admin Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirm Password</label>
          <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} id="terms" required />
          <label htmlFor="terms" className="text-sm">I agree to the terms and conditions</label>
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition">Register Organization</button>
      </form>
    </div>
  );
}
`,
        'Login.jsx': `import React, { useState } from 'react';

export default function Login({ setSession, goToDashboard }) {
  const [formData, setFormData] = useState({ org_id: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSession(data);
      goToDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow border mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center text-indigo-600">Organization Login</h2>
      {error && <p className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</p>}
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Organization ID</label>
          <input type="text" name="org_id" value={formData.org_id} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Email Address</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition">Login</button>
      </form>
    </div>
  );
}
`,
        'Dashboard.jsx': `import React, { useState } from 'react';

export default function Dashboard({ session }) {
  const [role, setRole] = useState('operations manager');
  const [accessCode, setAccessCode] = useState('');

  const generateAccessCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setAccessCode(code);
    alert(\`Access Code Published successfully: \${code}\`);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow border mt-10">
      <div className="border-b pb-4 mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{session.org_name}</h2>
          <p className="text-sm text-slate-500">Org ID: {session.org_id} | Plan: <span className="font-semibold text-indigo-600">{session.subscription_plan}</span></p>
        </div>
        <div>
          <label className="text-sm font-medium mr-2">Simulate Role View:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="border p-1 rounded text-sm">
            <option value="superadmin">Superadmin</option>
            <option value="operations manager">Operations Manager</option>
            <option value="receptionist">Receptionist</option>
          </select>
        </div>
      </div>

      {role === 'operations manager' && (
        <div className="space-y-6">
          <div className="bg-amber-50 p-4 rounded border border-amber-200">
            <h3 className="font-bold text-amber-800 mb-2">Operations Manager Control Panel</h3>
            <p className="text-sm text-amber-700 mb-4">You have full CRUD access over Amenities and read-only access to Booking History. You can publish access codes.</p>
            <button onClick={generateAccessCode} className="bg-amber-600 text-white px-4 py-2 rounded text-sm hover:bg-amber-700">
              Publish 6-Digit Access Code
            </button>
            {accessCode && <p className="mt-2 text-sm font-mono text-green-700">Active Published Code: {accessCode}</p>}
          </div>
        </div>
      )}

      {role === 'receptionist' && (
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <h3 className="font-bold text-blue-800 mb-2">Receptionist Control Panel</h3>
          <p className="text-sm text-blue-700">You have read-only access to amenities and read/update privileges for booking history and guest check-ins.</p>
        </div>
      )}

      {role === 'superadmin' && (
        <div className="bg-purple-50 p-4 rounded border border-purple-200">
          <h3 className="font-bold text-purple-800 mb-2">Superadmin Master View</h3>
          <p className="text-sm text-purple-700">Manage subscription plans, trial plan expiration, employee assignments, and system configurations.</p>
        </div>
      )}
    </div>
  );
}
`,
        'BookingPortal.jsx': `import React, { useState } from 'react';

export default function BookingPortal() {
  const [orgId, setOrgId] = useState('');
  const [verifiedOrg, setVerifiedOrg] = useState(null);
  const [error, setError] = useState('');
  const [bookingForm, setBookingForm] = useState({ name: '', email: '', location: '', slot_time: '' });

  const verifyOrg = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/verify-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVerifiedOrg(data.org_name);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    alert(\`Slot booked successfully for \${verifiedOrg}! Confirmation sent to \${bookingForm.email}.\`);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow border mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center text-indigo-600">Client Slot Booking</h2>
      {error && <p className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</p>}

      {!verifiedOrg ? (
        <form onSubmit={verifyOrg} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Enter Organization ID to Proceed</label>
            <input type="text" value={orgId} onChange={(e) => setOrgId(e.target.value)} required className="w-full border p-2 rounded mt-1" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition">Verify Organization</button>
        </form>
      ) : (
        <form onSubmit={handleBookingSubmit} className="space-y-4">
          <p className="text-sm bg-green-50 text-green-800 p-2 rounded mb-2">Booking for: <b>{verifiedOrg}</b></p>
          <div>
            <label className="block text-sm font-medium">Your Full Name</label>
            <input type="text" value={bookingForm.name} onChange={(e) => setBookingForm({...bookingForm, name: e.target.value})} required className="w-full border p-2 rounded mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium">Your Email</label>
            <input type="email" value={bookingForm.email} onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})} required className="w-full border p-2 rounded mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium">Preferred Location / Room</label>
            <input type="text" value={bookingForm.location} onChange={(e) => setBookingForm({...bookingForm, location: e.target.value})} required placeholder="e.g. Floor 3, Boardroom" className="w-full border p-2 rounded mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium">Slot Date & Time</label>
            <input type="datetime-local" value={bookingForm.slot_time} onChange={(e) => setBookingForm({...bookingForm, slot_time: e.target.value})} required className="w-full border p-2 rounded mt-1" />
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 transition">Confirm Booking</button>
        </form>
      )}
    </div>
  );
}
`
      },
      'App.jsx': `import React, { useState } from 'react';
import Signup from './components/Signup';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import BookingPortal from './components/BookingPortal';

export default function App() {
  const [view, setView] = useState('login');
  const [session, setSession] = useState(null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <nav className="bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Multi-Tenant Workplace System</h1>
        <div className="space-x-4">
          {!session ? (
            <>
              <button onClick={() => setView('login')} className="hover:underline">Login</button>
              <button onClick={() => setView('signup')} className="hover:underline">Signup</button>
              <button onClick={() => setView('booking')} className="bg-indigo-700 px-3 py-1 rounded">Book Slot (Public)</button>
            </>
          ) : (
            <button onClick={() => { setSession(null); setView('login'); }} className="bg-red-500 px-3 py-1 rounded">Logout</button>
          )}
        </div>
      </nav>

      <div className="p-6">
        {view === 'signup' && <Signup switchToLogin={() => setView('login')} />}
        {view === 'login' && <Login setSession={setSession} goToDashboard={() => setView('dashboard')} />}
        {view === 'dashboard' && <Dashboard session={session} />}
        {view === 'booking' && <BookingPortal />}
      </div>
    </div>
  );
}
`,
      'main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,
      'index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;
`
    },
    'package.json': JSON.stringify({
      name: "frontend",
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
      devDependencies: { "@types/react": "^18.3.3", "@types/react-dom": "^18.3.0", "@vitejs/plugin-react": "^4.3.0", autoprefixer: "^10.4.19", postcss: "^8.4.38", tailwindcss: "^3.4.3", vite: "^5.2.11" }
    }, null, 2),
    'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default function() {
  return defineConfig({
    plugins: [react()],
  })
}
`
  }
};

function createFiles(baseDir, obj) {
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path.join(baseDir, key);
    if (typeof value === 'object' && value !== null) {
      fs.mkdirSync(fullPath, { recursive: true });
      createFiles(fullPath, value);
    } else {
      fs.writeFileSync(fullPath, value, 'utf8');
      console.log('Created: ' + fullPath);
    }
  }
}

console.log('Generating multi-tenant project structure...');
createFiles('.', structure);
console.log('Project structure generated successfully!');
