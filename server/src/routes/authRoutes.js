import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

const router = express.Router();

const sanitizeUserId = (value) => value.trim();

const buildTokenPayload = (user) => ({
  sub: user._id.toString(),
  userId: user.userId,
  provider: user.provider,
});

const toPublicUser = (user) => ({
  id: user._id.toString(),
  userId: user.userId,
  provider: user.provider,
  isVerified: Boolean(user.isVerified),
});

const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

const getBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice(7).trim() || null;
};

const getAuthenticatedUserId = (request) => {
  const token = getBearerToken(request.headers.authorization);
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string') {
      return null;
    }

    return payload.sub;
  } catch {
    return null;
  }
};

router.post('/register', async (request, response) => {
  try {
    const { userId, password } = request.body ?? {};

    if (typeof userId !== 'string' || typeof password !== 'string') {
      return response.status(400).json({ message: 'User ID and password are required.' });
    }

    const normalizedUserId = sanitizeUserId(userId);
    if (!normalizedUserId || normalizedUserId.length < 3) {
      return response.status(400).json({ message: 'User ID must be at least 3 characters.' });
    }

    if (password.length < 6) {
      return response.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existingUser = await User.findOne({ userId: normalizedUserId });
    if (existingUser) {
      return response.status(409).json({ message: 'User ID already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      userId: normalizedUserId,
      passwordHash,
      provider: 'Email',
    });

    return response.status(201).json({
      message: 'Account created successfully.',
    });
  } catch (error) {
    console.error('Register route failed', error);
    return response.status(500).json({ message: 'Unable to register user right now.' });
  }
});

router.post('/login', async (request, response) => {
  try {
    const { userId, password } = request.body ?? {};

    if (typeof userId !== 'string' || typeof password !== 'string') {
      return response.status(400).json({ message: 'User ID and password are required.' });
    }

    const normalizedUserId = sanitizeUserId(userId);
    const user = await User.findOne({ userId: normalizedUserId });

    if (!user) {
      return response.status(401).json({ message: 'Invalid credentials.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return response.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(buildTokenPayload(user), env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });

    return response.status(200).json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('Login route failed', error);
    return response.status(500).json({ message: 'Unable to log in right now.' });
  }
});

router.post('/verify-document', async (request, response) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request);
    if (!authenticatedUserId) {
      return response.status(401).json({ message: 'Unauthorized request.' });
    }

    const { documentName, mimeType, documentDataUrl, documentSize } = request.body ?? {};

    if (
      typeof documentName !== 'string' ||
      typeof mimeType !== 'string' ||
      typeof documentDataUrl !== 'string' ||
      typeof documentSize !== 'number'
    ) {
      return response.status(400).json({ message: 'Document payload is incomplete.' });
    }

    const normalizedName = documentName.trim();
    const normalizedMimeType = mimeType.trim();
    if (!normalizedName) {
      return response.status(400).json({ message: 'Document name is required.' });
    }

    if (!normalizedMimeType) {
      return response.status(400).json({ message: 'Document type is required.' });
    }

    if (!documentDataUrl.startsWith('data:')) {
      return response.status(400).json({ message: 'Invalid document format.' });
    }

    if (!Number.isFinite(documentSize) || documentSize <= 0) {
      return response.status(400).json({ message: 'Invalid document size.' });
    }

    if (documentSize > MAX_DOCUMENT_SIZE_BYTES) {
      return response.status(413).json({ message: 'Document size exceeds 5MB limit.' });
    }

    const user = await User.findById(authenticatedUserId);
    if (!user) {
      return response.status(404).json({ message: 'User account not found.' });
    }

    user.isVerified = true;
    user.verificationDocumentName = normalizedName;
    user.verificationDocumentMimeType = normalizedMimeType;
    user.verificationDocumentSize = documentSize;
    user.verificationUploadedAt = new Date();
    await user.save();

    return response.status(200).json({
      message: 'Document uploaded and profile verified.',
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('Verify document route failed', error);
    return response.status(500).json({ message: 'Unable to process document right now.' });
  }
});

export default router;
