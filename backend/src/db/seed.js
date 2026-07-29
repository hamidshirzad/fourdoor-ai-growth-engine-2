import bcrypt from 'bcryptjs';
import pool from './pool.js';

export async function seedData() {
  try {
    const hashedPassword = await bcrypt.hash('demo@password123', 12);
    const user = await pool.query(
      `INSERT INTO users (name, email, password_hash, company, plan, subscription_status, onboarding)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [
        'Demo User',
        'demo@fourdoor.ai',
        hashedPassword,
        'Demo Corp',
        'pro',
        'active',
        JSON.stringify({ niche: 'B2B marketing agency', audience: 'founders with inconsistent lead flow', goal: 'book more qualified sales calls' })
      ]
    );

    if (user.rows && user.rows.length > 0) {
      await pool.query(
        `INSERT INTO campaigns (user_id, name, niche, audience, goal)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT DO NOTHING`,
        [
          user.rows[0].id,
          'Agency growth campaign',
          'B2B marketing agency',
          'founders with inconsistent lead flow',
          'book more qualified sales calls'
        ]
      );
    }

    console.log('Seed data inserted. Login: demo@fourdoor.ai / demo@password123');
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedData().then(() => pool.end?.());
}

