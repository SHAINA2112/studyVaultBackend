/**
 * Controlled admin creation script — the ONLY way an admin account gets created.
 * Never exposed via any HTTP route. Run manually:
 *
 *   npm run seed:admin
 *
 * Reads credentials from environment variables so they're never hardcoded
 * or exposed to the frontend.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

async function seedAdmin() {
  const { ADMIN_NAME, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_USERNAME) {
    console.error('[seedAdmin] ADMIN_EMAIL, ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ $or: [{ email: ADMIN_EMAIL.toLowerCase() }, { username: ADMIN_USERNAME.toLowerCase() }] });

  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`[seedAdmin] Promoted existing user "${existing.email}" to admin.`);
    } else {
      console.log(`[seedAdmin] Admin account "${existing.email}" already exists. No changes made.`);
    }
  } else {
    // Password hashing happens automatically via the User model's pre-save hook.
    await User.create({
      name: ADMIN_NAME || 'SHAINA Admin',
      username: ADMIN_USERNAME.toLowerCase(),
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
      role: 'admin',
      isActive: true,
    });
    console.log(`[seedAdmin] Admin account created for "${ADMIN_EMAIL}".`);
  }

  await mongoose.connection.close();
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('[seedAdmin] Failed:', err);
  process.exit(1);
});
