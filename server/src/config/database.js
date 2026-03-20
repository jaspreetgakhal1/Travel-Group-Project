// Added by Codex: project documentation comment for server\src\config\database.js
import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDatabase = async () => {
  try {
    await mongoose.connect(env.mongoUri, {
      autoIndex: true,
    });
    console.log('MongoDB connection established');
  } catch (error) {
    console.error('MongoDB connection failed', error);
    process.exit(1);
  }
};

