import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../shared/schema-sqlite';
import path from 'path';
import fs from 'fs';

function getDataPath(): string {
  const isNWJS = typeof process !== 'undefined' && (process as any).versions && (process as any).versions['nw'];
  
  if (isNWJS) {
    const nw = (global as any).nw || (window as any).nw;
    if (nw && nw.App && nw.App.dataPath) {
      return nw.App.dataPath;
    }
  }
  
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  return dataDir;
}

const dbPath = path.join(getDataPath(), 'airavoto-gaming.db');
console.log(`Database path: ${dbPath}`);

export const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_session_expire ON sessions(expire);

    CREATE TABLE IF NOT EXISTS session_groups (
      id TEXT PRIMARY KEY,
      group_code TEXT UNIQUE,
      group_name TEXT NOT NULL,
      category TEXT NOT NULL,
      booking_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_code TEXT UNIQUE,
      group_id TEXT,
      group_code TEXT,
      category TEXT NOT NULL,
      seat_number INTEGER NOT NULL,
      seat_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      whatsapp_number TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      price TEXT NOT NULL,
      status TEXT NOT NULL,
      booking_type TEXT NOT NULL,
      paused_remaining_time INTEGER,
      person_count INTEGER NOT NULL DEFAULT 1,
      payment_method TEXT,
      cash_amount TEXT,
      upi_amount TEXT,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      last_payment_action TEXT,
      food_orders TEXT DEFAULT '[]',
      original_price TEXT,
      discount_applied TEXT,
      bonus_hours_applied TEXT,
      promotion_details TEXT,
      is_promotional_discount INTEGER DEFAULT 0,
      is_promotional_bonus INTEGER DEFAULT 0,
      manual_discount_percentage INTEGER,
      manual_free_hours TEXT,
      discount TEXT,
      bonus TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      cost_price TEXT,
      current_stock INTEGER NOT NULL DEFAULT 0,
      min_stock_level INTEGER NOT NULL DEFAULT 10,
      in_inventory INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'trackable',
      supplier TEXT,
      expiry_date INTEGER
    );

    CREATE TABLE IF NOT EXISTS stock_batches (
      id TEXT PRIMARY KEY,
      food_item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      cost_price TEXT NOT NULL,
      supplier TEXT,
      purchase_date INTEGER NOT NULL,
      expiry_date INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS device_configs (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL UNIQUE,
      count INTEGER NOT NULL DEFAULT 0,
      seats TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS pricing_configs (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      duration TEXT NOT NULL,
      price TEXT NOT NULL,
      person_count INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS happy_hours_configs (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS happy_hours_pricing (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      duration TEXT NOT NULL,
      price TEXT NOT NULL,
      person_count INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS booking_history (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      booking_code TEXT,
      group_id TEXT,
      group_code TEXT,
      category TEXT NOT NULL,
      seat_number INTEGER NOT NULL,
      seat_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      whatsapp_number TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      price TEXT NOT NULL,
      status TEXT NOT NULL,
      booking_type TEXT NOT NULL,
      paused_remaining_time INTEGER,
      person_count INTEGER NOT NULL DEFAULT 1,
      payment_method TEXT,
      cash_amount TEXT,
      upi_amount TEXT,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      last_payment_action TEXT,
      food_orders TEXT DEFAULT '[]',
      original_price TEXT,
      discount_applied TEXT,
      bonus_hours_applied TEXT,
      promotion_details TEXT,
      is_promotional_discount INTEGER DEFAULT 0,
      is_promotional_bonus INTEGER DEFAULT 0,
      manual_discount_percentage INTEGER,
      manual_free_hours TEXT,
      discount TEXT,
      bonus TEXT,
      created_at INTEGER NOT NULL,
      archived_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      profile_image_url TEXT,
      username TEXT UNIQUE,
      password_hash TEXT,
      role TEXT,
      onboarding_completed INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount TEXT NOT NULL,
      date INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      activity_log_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gaming_center_info (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      hours TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gallery_images (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS load_metrics (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      active_sessions INTEGER NOT NULL DEFAULT 0,
      avg_session_length INTEGER NOT NULL DEFAULT 0,
      food_orders INTEGER NOT NULL DEFAULT 0,
      capacity_utilization INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS load_predictions (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      horizon TEXT NOT NULL,
      predicted_load INTEGER NOT NULL,
      model_version TEXT NOT NULL,
      features TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS retention_config (
      id TEXT PRIMARY KEY,
      booking_history_days INTEGER NOT NULL DEFAULT 36500,
      activity_logs_days INTEGER NOT NULL DEFAULT 36500,
      load_metrics_days INTEGER NOT NULL DEFAULT 36500,
      load_predictions_days INTEGER NOT NULL DEFAULT 36500,
      expenses_days INTEGER NOT NULL DEFAULT 36500,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS device_maintenance (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      seat_name TEXT NOT NULL,
      last_maintenance_date INTEGER,
      total_usage_hours REAL NOT NULL DEFAULT 0,
      total_sessions INTEGER NOT NULL DEFAULT 0,
      issues_reported INTEGER NOT NULL DEFAULT 0,
      maintenance_notes TEXT,
      status TEXT NOT NULL DEFAULT 'healthy',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_logs (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      seat_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      amount TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      previous_status TEXT,
      previous_method TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  
  console.log('SQLite database initialized successfully');
}

export function closeDatabase() {
  sqlite.close();
}
