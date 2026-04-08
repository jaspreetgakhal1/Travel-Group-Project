import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
const getBearerToken = (authorizationHeader) => {
    if (typeof authorizationHeader !== 'string') {
        return null;
    }
    if (!authorizationHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authorizationHeader.slice('Bearer '.length).trim();
    return token || null;
};
export const requireAuth = async (req, res, next) => {
    const authRequest = req;
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
    try {
        const payload = jwt.verify(token, env.jwtSecret);
        if (!payload || typeof payload.sub !== 'string' || !mongoose.isValidObjectId(payload.sub)) {
            return res.status(401).json({ message: 'Unauthorized request.' });
        }
        const user = await User.findById(payload.sub)
            .select('_id userId provider role isBlocked')
            .lean();
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized request.' });
        }
        if (user.isBlocked) {
            return res.status(403).json({ message: 'This account has been blocked by an administrator.' });
        }
        authRequest.user = {
            id: String(user._id),
            userId: typeof user.userId === 'string' ? user.userId : undefined,
            provider: typeof user.provider === 'string' ? user.provider : undefined,
            role: user.role === 'admin' ? 'admin' : 'user',
        };
        return next();
    }
    catch {
        return res.status(401).json({ message: 'Unauthorized request.' });
    }
};
