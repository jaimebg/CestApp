import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const DATABASE_NAME = 'cestapp.db';

// Open database synchronously
const expoDb = openDatabaseSync(DATABASE_NAME);

// Create drizzle instance
export const db = drizzle(expoDb, { schema });

// SQL for creating tables (used for initial setup)
export const createTablesSQL = `
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    logo_url TEXT,
    address TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    sync_id TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    parent_id INTEGER REFERENCES categories(id),
    keywords TEXT,
    is_default INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    sync_id TEXT
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER REFERENCES stores(id),
    date_time INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    subtotal INTEGER,
    tax_amount INTEGER,
    discount_amount INTEGER,
    payment_method TEXT,
    image_path TEXT,
    pdf_path TEXT,
    raw_text TEXT,
    processing_status TEXT NOT NULL DEFAULT 'pending',
    confidence INTEGER,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    sync_id TEXT
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT,
    price INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price INTEGER,
    unit TEXT,
    category_id INTEGER REFERENCES categories(id),
    confidence INTEGER,
    is_manually_edited INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    sync_id TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date_time);
  CREATE INDEX IF NOT EXISTS idx_receipts_store ON receipts(store_id);
  CREATE INDEX IF NOT EXISTS idx_items_receipt ON items(receipt_id);
  CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
`;

// Initialize database with tables
export function initializeDatabase() {
  expoDb.execSync(createTablesSQL);
}

export { schema };
