import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import type { AuthenticatedUser } from '../types/auth.js';

type TokenPayload = JwtPayload & {
  sub?: string;
  userId?: string;
  provider?: string;
};

const getBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  return token || null;
};

export const requireAuth: RequestHandler = (req, res, next) => {
  const authRequest = req as typeof req & { user?: AuthenticatedUser };
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized request.' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    if (!payload || typeof payload.sub !== 'string' || !mongoose.isValidObjectId(payload.sub)) {
      return res.status(401).json({ message: 'Unauthorized request.' });
    }

    authRequest.user = {
      id: payload.sub,
      userId: typeof payload.userId === 'string' ? payload.userId : undefined,
      provider: typeof payload.provider === 'string' ? payload.provider : undefined,
    };

    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized request.' });
  }
};
