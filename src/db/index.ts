import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, GatewayInfo, NewUserPolicy } from '../types.js';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'last_attempt.sqlite');

let dbInstance: SqlJsDatabase | null = null;

export async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.error('Failed reading existing SQLite database, initializing fresh one:', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Ensure tables exist
  initSchema(dbInstance);
  await seedInitialData(dbInstance);
  saveDb();

  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('Error saving SQLite DB to disk:', err);
  }
}

function initSchema(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      auth_provider_id TEXT DEFAULT 'local',
      firebase_uid TEXT,
      role TEXT DEFAULT 'user',
      access_status TEXT DEFAULT 'active',
      access_expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_sign_in_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS extension_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      current_expiry TEXT,
      requested_duration TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewed_by TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_reads (
      id TEXT PRIMARY KEY,
      notification_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      read_at TEXT NOT NULL,
      UNIQUE(notification_id, user_id),
      FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    db.run("ALTER TABLE users ADD COLUMN avatar_url TEXT;");
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    db.run('ALTER TABLE users ADD COLUMN firebase_uid TEXT;');
  } catch (e) {
    // Existing user records are preserved; the column is already present on newer DBs.
  }
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);');
}

async function seedInitialData(db: SqlJsDatabase): Promise<void> {
  // Check settings
  const policyRes = db.exec("SELECT value FROM settings WHERE key = 'new_user_policy'");
  if (policyRes.length === 0 || policyRes[0].values.length === 0) {
    db.run("INSERT INTO settings (key, value) VALUES ('new_user_policy', 'auto_3_months')");
  }

  const gatewayInfoRes = db.exec("SELECT value FROM settings WHERE key = 'gateway_info'");
  if (gatewayInfoRes.length === 0 || gatewayInfoRes[0].values.length === 0) {
    const defaultGatewayInfo: GatewayInfo = {
      visible: true,
      heading: 'LAST ATTEMPT Medical Exam Companion',
      message: 'Welcome to Dr. Ahmar Shakoor’s official medical study portal for NRE 1 & 2 exam preparation. Please log in with your credentials to access the study content, question banks, and rapid review pearls.',
      whatsapp: '+92 300 0000000',
      email: 'drahmarshakoor@gmail.com',
      pricing: 'Standard 3-Month NRE Comprehensive Access',
      additional_notes: 'For subscription activation, extension requests, or group registration, contact Dr. Ahmar Shakoor via WhatsApp.'
    };
    db.run("INSERT INTO settings (key, value) VALUES ('gateway_info', ?)", [JSON.stringify(defaultGatewayInfo)]);
  }

  // Check if admin user exists
  const adminRes = db.exec("SELECT id FROM users WHERE LOWER(email) = 'drahmarshakoor@gmail.com'");
  if (adminRes.length === 0 || adminRes[0].values.length === 0) {
    const hash = await bcrypt.hash('AdminPass123!', 10);
    const now = new Date().toISOString();
    
    // Seed Dr. Ahmar Shakoor admin
    db.run(`
      INSERT INTO users (id, name, email, password_hash, auth_provider_id, role, access_status, access_expires_at, created_at, updated_at, last_sign_in_at)
      VALUES (?, ?, ?, ?, 'google', 'admin', 'active', NULL, ?, ?, ?)
    `, [uuidv4(), 'Dr. Ahmar Shakoor', 'drahmarshakoor@gmail.com', hash, now, now, now]);

    // Seed initial welcome notification
    db.run(`
      INSERT INTO notifications (id, title, category, message, is_active, created_at, created_by)
      VALUES (?, 'Welcome to LAST ATTEMPT Companion', 'Important', 'Study materials and question banks are updated for the latest NRE exam blueprint. High-yield endocrine and medicine pearls are now available in the study section.', 1, ?, 'admin')
    `, [uuidv4(), now]);
  }

  // Purge any fake bot / example accounts
  try {
    db.run("DELETE FROM users WHERE email LIKE '%@example.com' OR email = 'admin@lastattempt.com'");
  } catch (e) {
    // Ignore
  }
}

// Relational query helper functions
export function queryOne<T = any>(db: SqlJsDatabase, sql: string, params: any[] = []): T | null {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    if (stmt.step()) {
      return stmt.getAsObject() as unknown as T;
    }
    return null;
  } finally {
    stmt.free();
  }
}

export function queryAll<T = any>(db: SqlJsDatabase, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  const results: T[] = [];
  try {
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function execute(db: SqlJsDatabase, sql: string, params: any[] = []): void {
  db.run(sql, params);
  saveDb();
}
