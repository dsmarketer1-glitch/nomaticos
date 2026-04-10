const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../database/nomatic.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Create tables on first run
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    payout INTEGER DEFAULT 0,
    payout_type TEXT DEFAULT 'Monthly',
    website TEXT,
    location TEXT,
    services TEXT,
    checklist TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'To Do',
    priority TEXT DEFAULT 'Medium',
    due_date TEXT,
    client_id TEXT,
    client_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    client_name TEXT,
    amount INTEGER DEFAULT 0,
    project_name TEXT,
    due_date TEXT,
    payment_received INTEGER DEFAULT 0,
    received_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    company_name TEXT,
    source TEXT,
    medium TEXT,
    location TEXT,
    service_looking_for TEXT,
    website TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    linkedin_url TEXT,
    youtube_url TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    first_touch_date TEXT,
    first_touch_details TEXT,
    followup1_date TEXT,
    followup1_details TEXT,
    followup2_date TEXT,
    followup2_details TEXT,
    followup3_date TEXT,
    followup3_details TEXT,
    followup4_date TEXT,
    followup4_details TEXT,
    followup5_date TEXT,
    followup5_details TEXT,
    referral_name TEXT,
    status TEXT DEFAULT 'Cold',
    pitched_amount INTEGER DEFAULT 0,
    closed_amount INTEGER DEFAULT 0,
    proposal_url TEXT,
    action_plan_url TEXT,
    work_start_date TEXT,
    closed_at TEXT,
    is_converted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    month_year TEXT UNIQUE NOT NULL,
    revenue_target INTEGER DEFAULT 0,
    leads_target INTEGER DEFAULT 0,
    tasks_target INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// CRM Referral/ClosedAt Migration 
try {
  db.prepare("SELECT referral_name FROM leads LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE leads ADD COLUMN referral_name TEXT");
  db.exec("ALTER TABLE leads ADD COLUMN closed_at TEXT");
  console.log('[DB] Migrated: added referral_name and closed_at column to leads');
}

// Backfill closed_at for existing closed deals
try {
  db.prepare("UPDATE leads SET closed_at = created_at WHERE status = 'Closed' AND (closed_at IS NULL OR closed_at = '')").run();
} catch (e) {
  console.error('[DB] Error backfilling closed_at:', e.message);
}

// Clients Payout Type Migration
try {
  db.prepare("SELECT payout_type FROM clients LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE clients ADD COLUMN payout_type TEXT DEFAULT 'Monthly'");
  console.log('[DB] Migrated: added payout_type column to clients');
}

module.exports = db;
