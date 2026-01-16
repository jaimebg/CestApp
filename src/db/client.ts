import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const DATABASE_NAME = 'cestapp.db';

const expoDb = openDatabaseSync(DATABASE_NAME);

export const db = drizzle(expoDb, { schema });

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

  CREATE TABLE IF NOT EXISTS user_learned_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    normalized_name TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    correction_count INTEGER NOT NULL DEFAULT 1,
    last_used_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date_time);
  CREATE INDEX IF NOT EXISTS idx_receipts_store ON receipts(store_id);
  CREATE INDEX IF NOT EXISTS idx_items_receipt ON items(receipt_id);
  CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
  CREATE UNIQUE INDEX IF NOT EXISTS user_learned_items_unique_idx ON user_learned_items(normalized_name, store_id);
`;

export function initializeDatabase() {
  expoDb.execSync(createTablesSQL);
}

export { schema };
