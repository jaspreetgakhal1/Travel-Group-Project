import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { env } from '../config/env.js';

const router = express.Router();

const sanitizeUserId = (value) => value.trim();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRAVEL_ROLE_OPTIONS = ['The Navigator', 'The Foodie', 'The Photographer', 'The Budgeter'];
const TRAVEL_DNA_FIELDS = [
  'socialBattery',
  'planningStyle',
  'budgetFlexibility',
  'morningSync',
  'riskAppetite',
  'cleanliness',
];
const DEFAULT_TRAVEL_DNA_VALUE = 5;

const buildTokenPayload = (user) => ({
  sub: user._id.toString(),
  userId: user.userId,
  provider: user.provider,
});

const toVerificationStatus = (user) =>
  user?.verificationStatus === 'verified' || Boolean(user?.isVerified) ? 'verified' : 'pending';

const toPublicUser = (user) => ({
  id: user._id.toString(),
  userId: user.userId,
  provider: user.provider,
  isVerified: Boolean(user.isVerified),
  verificationStatus: toVerificationStatus(user),
});

const toTravelDNA = (user) => {
  const sourceDNA = user?.travelDNA ?? {};
  const normalizedDNA = TRAVEL_DNA_FIELDS.reduce((accumulator, fieldName) => {
    const value = sourceDNA[fieldName];
    accumulator[fieldName] =
      typeof value === 'number' && Number.isFinite(value)
        ? Math.min(10, Math.max(1, Math.round(value)))
        : DEFAULT_TRAVEL_DNA_VALUE;
    return accumulator;
  }, {});

  const sourceRoles = Array.isArray(sourceDNA.travelRoles) ? sourceDNA.travelRoles : [];
  const normalizedRoles = sourceRoles
    .filter((role) => typeof role === 'string' && TRAVEL_ROLE_OPTIONS.includes(role))
    .filter((role, index, allRoles) => allRoles.indexOf(role) === index);

  return {
    ...normalizedDNA,
    travelRoles: normalizedRoles,
  };
};

const toUserProfile = (user) => ({
  firstName: user.firstName ?? '',
  lastName: user.lastName ?? '',
  countryCode: user.countryCode ?? '+1',
  mobileNumber: user.mobileNumber ?? '',
  email: user.email ?? '',
  profileImageDataUrl: user.profileImageDataUrl ?? null,
  travelDNA: toTravelDNA(user),
});

const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toExactCaseInsensitiveRegex = (value) => new RegExp(`^${escapeRegExp(value)}$`, 'i');

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

const normalizeTravelDNAPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, message: 'Travel DNA payload is required.' };
  }

  const normalizedDNA = {};

  for (const fieldName of TRAVEL_DNA_FIELDS) {
    const rawValue = payload[fieldName];
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
      return { isValid: false, message: `${fieldName} must be a number between 1 and 10.` };
    }

    if (rawValue < 1 || rawValue > 10) {
      return { isValid: false, message: `${fieldName} must be between 1 and 10.` };
    }

    normalizedDNA[fieldName] = Math.round(rawValue);
  }

  const rawTravelRoles = payload.travelRoles;
  if (!Array.isArray(rawTravelRoles)) {
    return { isValid: false, message: 'travelRoles must be an array.' };
  }

  const normalizedRoles = rawTravelRoles
    .filter((role) => typeof role === 'string' && TRAVEL_ROLE_OPTIONS.includes(role))
    .filter((role, index, allRoles) => allRoles.indexOf(role) === index);

  return {
    isValid: true,
    payload: {
      ...normalizedDNA,
      travelRoles: normalizedRoles,
    },
  };
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
    if (normalizedUserId.length > 32) {
      return response.status(400).json({ message: 'User ID must be 32 characters or fewer.' });
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
      email: normalizedUserId.toLowerCase(),
    });

    return response.status(201).json({
      message: 'Account created successfully.',
    });
  } catch (error) {
    console.error('Register route failed', error);
    return response.status(500).json({ message: 'Unable to register user right now.' });
  }
});

router.get('/profile', async (request, response) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request);
    if (!authenticatedUserId) {
      return response.status(401).json({ message: 'Unauthorized request.' });
    }

    const user = await User.findById(authenticatedUserId);
    if (!user) {
      return response.status(404).json({ message: 'User account not found.' });
    }

    return response.status(200).json({
      profile: toUserProfile(user),
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('Get profile route failed', error);
    return response.status(500).json({ message: 'Unable to load profile right now.' });
  }
});

router.put('/profile', async (request, response) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request);
    if (!authenticatedUserId) {
      return response.status(401).json({ message: 'Unauthorized request.' });
    }

    const {
      firstName,
      lastName,
      countryCode,
      mobileNumber,
      email,
      profileImageDataUrl,
    } = request.body ?? {};

    if (
      typeof firstName !== 'string' ||
      typeof lastName !== 'string' ||
      typeof countryCode !== 'string' ||
      typeof mobileNumber !== 'string' ||
      typeof email !== 'string' ||
      (profileImageDataUrl !== null && typeof profileImageDataUrl !== 'string')
    ) {
      return response.status(400).json({ message: 'Profile payload is incomplete or invalid.' });
    }

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedCountryCode = countryCode.trim();
    const normalizedMobileNumber = mobileNumber.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedProfileImageDataUrl = typeof profileImageDataUrl === 'string' ? profileImageDataUrl : null;

    if (!normalizedFirstName) {
      return response.status(400).json({ message: 'First name is required.' });
    }

    if (!normalizedLastName) {
      return response.status(400).json({ message: 'Last name is required.' });
    }

    if (!normalizedCountryCode) {
      return response.status(400).json({ message: 'Country code is required.' });
    }

    if (!normalizedMobileNumber) {
      return response.status(400).json({ message: 'Mobile number is required.' });
    }

    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
      return response.status(400).json({ message: 'A valid email address is required.' });
    }

    const user = await User.findById(authenticatedUserId);
    if (!user) {
      return response.status(404).json({ message: 'User account not found.' });
    }

    user.firstName = normalizedFirstName;
    user.lastName = normalizedLastName;
    user.countryCode = normalizedCountryCode;
    user.mobileNumber = normalizedMobileNumber;
    user.email = normalizedEmail;
    user.profileImageDataUrl = normalizedProfileImageDataUrl;
    await user.save();

    return response.status(200).json({
      message: 'Profile saved successfully.',
      profile: toUserProfile(user),
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('Update profile route failed', error);
    return response.status(500).json({ message: 'Unable to save profile right now.' });
  }
});

router.get('/travel-dna', async (request, response) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request);
    if (!authenticatedUserId) {
      return response.status(401).json({ message: 'Unauthorized request.' });
    }

    const user = await User.findById(authenticatedUserId);
    if (!user) {
      return response.status(404).json({ message: 'User account not found.' });
    }

    return response.status(200).json({
      travelDNA: toTravelDNA(user),
    });
  } catch (error) {
    console.error('Get travel DNA route failed', error);
    return response.status(500).json({ message: 'Unable to load travel DNA right now.' });
  }
});

router.put('/travel-dna', async (request, response) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request);
    if (!authenticatedUserId) {
      return response.status(401).json({ message: 'Unauthorized request.' });
    }

    const payload = request.body?.travelDNA ?? request.body;
    const validationResult = normalizeTravelDNAPayload(payload);
    if (!validationResult.isValid) {
      return response.status(400).json({ message: validationResult.message });
    }

    const user = await User.findById(authenticatedUserId);
    if (!user) {
      return response.status(404).json({ message: 'User account not found.' });
    }

    user.travelDNA = validationResult.payload;
    await user.save();

    return response.status(200).json({
      message: 'Travel DNA saved successfully.',
      travelDNA: toTravelDNA(user),
    });
  } catch (error) {
    console.error('Update travel DNA route failed', error);
    return response.status(500).json({ message: 'Unable to save travel DNA right now.' });
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

    const updatedUser = await User.findByIdAndUpdate(
      authenticatedUserId,
      {
        isVerified: true,
        verificationStatus: 'verified',
        verificationDocumentName: normalizedName,
        verificationDocumentMimeType: normalizedMimeType,
        verificationDocumentSize: documentSize,
        verificationUploadedAt: new Date(),
      },
      {
        new: true,
      },
    );

    if (!updatedUser) {
      return response.status(404).json({ message: 'User account not found.' });
    }

    const normalizedEmail = typeof updatedUser.email === 'string' ? updatedUser.email.trim().toLowerCase() : '';
    const normalizedUserId = typeof updatedUser.userId === 'string' ? updatedUser.userId.trim().toLowerCase() : '';
    const firstName = typeof updatedUser.firstName === 'string' ? updatedUser.firstName.trim() : '';
    const lastName = typeof updatedUser.lastName === 'string' ? updatedUser.lastName.trim() : '';
    const fullName = `${firstName} ${lastName}`.trim();
    const normalizedFullName = fullName.toLowerCase();

    const postMatchConditions = [{ author: updatedUser._id }];
    if (normalizedEmail) {
      postMatchConditions.push({ authorKey: normalizedEmail });
      postMatchConditions.push({ hostName: toExactCaseInsensitiveRegex(normalizedEmail) });
    }
    if (normalizedUserId) {
      postMatchConditions.push({ authorKey: normalizedUserId });
      postMatchConditions.push({ hostName: toExactCaseInsensitiveRegex(updatedUser.userId.trim()) });
    }
    if (normalizedFullName) {
      postMatchConditions.push({ authorKey: normalizedFullName });
      postMatchConditions.push({ hostName: toExactCaseInsensitiveRegex(fullName) });
    }

    await Post.updateMany(
      {
        $or: postMatchConditions,
      },
      {
        $set: {
          author: updatedUser._id,
          isVerified: true,
        },
      },
    );

    return response.status(200).json({
      message: 'Document uploaded and profile verified.',
      user: toPublicUser(updatedUser),
    });
  } catch (error) {
    console.error('Verify document route failed', error);
    return response.status(500).json({ message: 'Unable to process document right now.' });
  }
});

export default router;
