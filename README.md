# Enterprise Multi-Tenant Workplace Management System

An advanced, enterprise-grade cloud application engineered to streamline hybrid workplace operations, facility scheduling, and multi-organization tenant isolation. Built for modern businesses, this platform allows multiple independent companies to manage their own workspaces, internal staff directories, amenities, and visitor access securely under a single unified application.

---

## 🌟 Project Overview & Vision

Managing physical workspaces across multiple branches or organizations requires strict data isolation, scalable database structures, and granular access control. This project solves these challenges by implementing an automated **Database-per-Tenant** architecture. 

When a new organization registers on the platform, the system dynamically provisions a dedicated, physically isolated database on Neon PostgreSQL (`org_<org_id>`), completely separating their operational data, booking history, staff credentials, and custom roles from any other tenant.

---

## 🏗️ Architectural Highlights

### 1. Physical Multi-Tenant Provisioning
Unlike shared-table multi-tenancy, this application provisions a distinct PostgreSQL database (`org_<org_id>`) for every registered organization on the fly. 
* **Master Registry (`master_user`):** Stores global organization accounts, subscription plans, super-admin credentials, and live visitor access codes.
* **Tenant Databases (`org_<org_id>`):** Each tenant database automatically seeds its own isolated schema containing tables for `amenities`, `booking_history`, `employees`, `roles`, and `permissions`.

### 2. Granular Role-Based Access Control (RBAC)
The platform enforces strict security and operational boundaries across four distinct user tiers:
* **Master Super Admin:** Has absolute control over organization creation, global subscription settings, and master access code publishing.
* **Operations Manager:** Handles full CRUD management of workspaces, conference rooms, amenities, staff assignments, and booking analytics.
* **Facility Admin:** Coordinates facility maintenance, asset tracking, and operational upkeep.
* **Receptionist:** Manages the front desk visitor check-ins, view-only amenity tracking, and visitor scheduling.

---

## 🧩 Core Functional Modules

* **Dynamic Organization Onboarding & Auth:** Secure registration with password hashing via `bcrypt`, automated database creation, and separate login portals for Super Admins and Staff Employees.
* **Workspace & Amenity Management:** Real-time creation and cataloging of conference rooms, private interview cabins, and hot desks with hourly rate structures.
* **Smart Booking & Access Control:** Staff and visitors can reserve time slots for amenities. Bookings are synchronized with a master daily access code published by management for secure facility entry.
* **Staff Directory & Permission Editor:** Operations Managers can onboard new employees, assign roles, and modify custom permissions dynamically.

---

## 🧰 Technology Stack

* **Frontend:** React.js, Vite, Modern CSS
* **Backend:** Node.js, Express.js
* **Database & Drivers:** Neon PostgreSQL, `pg` connection pooling
* **Security:** Bcrypt.js, CORS, Environment-based secrets configuration

---

## 📂 Repository Structure

```text
tenant_system/
├── backend/
│   ├── routes/
│   │   └── auth.js         # Multi-tenant provisioning, RBAC middleware, and CRUD logic
│   ├── .env                # Database connection string and server port
│   ├── server.js           # Master Express initialization and global registry setup
│   └── package.json        # Backend dependencies and scripts
│
├── frontend/
│   ├── src/                # React components, views, and navigation logic
│   ├── public/             # Static assets and favicons
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite build configuration
│
└── README.md               # Project documentation



Environment Variables

The backend uses environment variables for the database connection configuration.

Example:

Code snippet
DATABASE_URL=your_neon_postgresql_connection_string
PORT=5000

▶️ Running the Backend

Navigate to the backend:

cd backend

Install dependencies:
npm install

Start the server:
node server.js

The backend runs on:
http://localhost:5000


▶️ Running the Frontend

Navigate to the frontend:

cd frontend

Install dependencies:
npm install

Start the React development server:
npm run dev
The frontend will be available through the URL shown by Vite.
