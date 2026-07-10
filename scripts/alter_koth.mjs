import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query('ALTER TABLE koth_participants ADD COLUMN IF NOT EXISTS staked_amount integer DEFAULT 0');
    console.log('Successfully added staked_amount');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
