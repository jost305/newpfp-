import { readFileSync } from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

const MIGRATION_FILE = process.argv[2] || './migrations/20260613_add_gen1_economy.sql';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // fail faster if DB is unreachable
  connectionTimeoutMillis: 10000,
  max: 1,
  idleTimeoutMillis: 0,
});

async function run() {
  try {
    const sql = readFileSync(MIGRATION_FILE, 'utf-8');
    const statements = sql.split('--> statement-breakpoint').filter(s => s.trim());
    console.log(`Applying ${MIGRATION_FILE} — ${statements.length} statements`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      try {
        await pool.query(stmt);
        console.log(`✓ ${i + 1}/${statements.length}`);
      } catch (err) {
        if (err.code === '42P07') {
          console.log(`✓ ${i + 1}/${statements.length}: already exists`);
        } else {
          console.error(`✗ ${i + 1}/${statements.length}:`, err.code, err.message);
        }
      }
    }

    console.log('Migration complete');
    await pool.end();
  } catch (e) {
    console.error('Migration failed:', e.message);
    await pool.end();
    process.exit(1);
  }
}

run();
