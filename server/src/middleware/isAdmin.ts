import type { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import type { AuthenticatedUser } from '../types/auth.js';

export const isAdmin: RequestHandler = async (req, res, next) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const userId = authRequest.user?.id;

  if (!userId || !mongoose.isValidObjectId(userId)) {
    return res.status(401).json({ message: 'Unauthorized request.' });
  }

  if (authRequest.user?.role === 'admin') {
    return next();
  }

  try {
    const user = await User.findById(userId).select('_id role').lean<{ _id: unknown; role?: string } | null>();

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    authRequest.user = {
      ...authRequest.user,
      role: 'admin',
    };

    return next();
  } catch (error) {
    console.error('isAdmin middleware failed', error);
    return res.status(500).json({ message: 'Unable to verify admin access right now.' });
  }
};
