import dotenv from 'dotenv';
dotenv.config();
import gen1 from '../server/bantahBro/gen1EconomyService.js';

async function run() {
  try {
    console.log('Seeding Gen1 Season 1 tools...');
    await gen1.seedGen1SeasonOneTools();
    console.log('Seeding completed');
  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  }
}

run();
