import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';
import migrations from './migrations/migrations';

const DATABASE_NAME = 'cestapp.db';

const expoDb = openDatabaseSync(DATABASE_NAME);

export const db = drizzle(expoDb, { schema });

// Databases created before the migration system was adopted are missing columns
// added later; each ALTER fails harmlessly once the column exists.
const legacyColumnRepairs = [
  'ALTER TABLE store_parsing_templates ADD COLUMN template_image_dimensions TEXT',
  'ALTER TABLE store_parsing_templates ADD COLUMN fingerprint TEXT',
  'ALTER TABLE store_parsing_templates ADD COLUMN success_count INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE store_parsing_templates ADD COLUMN failure_count INTEGER NOT NULL DEFAULT 0',
];

export async function initializeDatabase() {
  await migrate(db, migrations);

  for (const statement of legacyColumnRepairs) {
    try {
      expoDb.execSync(statement);
    } catch {
      // Column already exists
    }
  }
}

export { schema };
