// Added by Codex: project documentation comment for server\src\config\database.js
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from './env.js';
import { User } from '../models/User.js';

const ensureAdminAccount = async () => {
  const normalizedAdminUserId = env.adminUserId.trim();
  const normalizedAdminPassword = env.adminPassword;

  if (!normalizedAdminUserId || !normalizedAdminPassword) {
    return;
  }

  const passwordHash = await bcrypt.hash(normalizedAdminPassword, 12);
  const adminEmail = normalizedAdminUserId.includes('@')
    ? normalizedAdminUserId.toLowerCase()
    : `${normalizedAdminUserId.toLowerCase()}@splitngo.local`;

  const adminUser = await User.findOne({ userId: normalizedAdminUserId });

  if (!adminUser) {
    await User.create({
      userId: normalizedAdminUserId,
      passwordHash,
      provider: 'Email',
      role: 'admin',
      isBlocked: false,
      email: adminEmail,
      firstName: 'Admin',
      lastName: 'User',
      isVerified: true,
      verificationStatus: 'verified',
    });
    console.log(`Bootstrap admin account created for "${normalizedAdminUserId}".`);
    return;
  }

  adminUser.passwordHash = passwordHash;
  adminUser.provider = 'Email';
  adminUser.role = 'admin';
  adminUser.isBlocked = false;
  adminUser.blockedAt = null;
  adminUser.blockedReason = null;
  adminUser.email = adminEmail;
  adminUser.isVerified = true;
  adminUser.verificationStatus = 'verified';
  await adminUser.save();
};

export const connectDatabase = async () => {
  try {
    await mongoose.connect(env.mongoUri, {
      autoIndex: true,
    });
    await ensureAdminAccount();
    console.log('MongoDB connection established');
  } catch (error) {
    console.error('MongoDB connection failed', error);
    process.exit(1);
  }
};

