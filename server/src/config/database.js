// Added by Codex: project documentation comment for server\src\config\database.js
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from './env.js';
import { User } from '../models/User.js';

const CONNECTION_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let activeConnectionPromise = null;
let lastConnectionError = null;

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

const getConnectionState = () => CONNECTION_STATE_LABELS[mongoose.connection.readyState] ?? 'unknown';

export const getDatabaseHealth = () => ({
  connected: mongoose.connection.readyState === 1,
  readyState: mongoose.connection.readyState,
  state: getConnectionState(),
  lastError: lastConnectionError,
});

mongoose.connection.on('connected', () => {
  lastConnectionError = null;
  console.log('MongoDB connection established');
});

mongoose.connection.on('error', (error) => {
  lastConnectionError = error instanceof Error ? error.message : String(error);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection is disconnected');
});

export const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  if (activeConnectionPromise) {
    return activeConnectionPromise;
  }

  activeConnectionPromise = mongoose
    .connect(env.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    })
    .then(async () => {
      await ensureAdminAccount();
    })
    .catch((error) => {
      lastConnectionError = error instanceof Error ? error.message : String(error);
      throw error;
    })
    .finally(() => {
      activeConnectionPromise = null;
    });

  return activeConnectionPromise;
};

