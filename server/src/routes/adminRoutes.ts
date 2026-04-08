import express from 'express';
import mongoose, { Types, type PipelineStage } from 'mongoose';
import { DeletedUser } from '../models/DeletedUser.js';
import { isAdmin } from '../middleware/isAdmin.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { Expense } from '../models/Expense.js';
import { Notification } from '../models/Notification.js';
import { Participant } from '../models/Participant.js';
import { Payment } from '../models/Payment.js';
import { Post } from '../models/Post.js';
import { Transaction } from '../models/Transaction.js';
import { Trip } from '../models/Trip.js';
import { TripJoinRequest } from '../models/TripJoinRequest.js';
import { User } from '../models/User.js';
import {
  ACTIVE_TRIP_STATUS,
  CANCELLED_TRIP_STATUS,
  CANCELLED_TRIP_STATUS_VALUES,
  COMPLETED_TRIP_STATUS,
  COMPLETED_TRIP_STATUS_VALUES,
  normalizeTripRecordStatus,
  UPCOMING_TRIP_STATUS,
} from '../utils/tripRecordStatus.js';
import { toDayEnd, toDayStart } from '../utils/tripStatus.js';

const router = express.Router();
const MAX_REJECTION_REASON_LENGTH = 240;
const MAX_BLOCK_REASON_LENGTH = 240;
const MAX_PENDING_ACTIVITY_LIMIT = 20;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toExactCaseInsensitiveRegex = (value: string): RegExp => new RegExp(`^${escapeRegExp(value)}$`, 'i');

const parseQueryDateBoundary = (value: unknown, boundary: 'start' | 'end'): Date | null => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return boundary === 'start' ? toDayStart(parsed) : toDayEnd(parsed);
};

const buildTripDateMatch = (fromDate: Date | null, toDate: Date | null): Record<string, unknown> => {
  if (fromDate && toDate) {
    return {
      startDate: { $lte: toDate },
      endDate: { $gte: fromDate },
    };
  }

  if (fromDate) {
    return {
      endDate: { $gte: fromDate },
    };
  }

  if (toDate) {
    return {
      startDate: { $lte: toDate },
    };
  }

  return {};
};

const getDisplayName = (user: {
  firstName?: string | null;
  lastName?: string | null;
  userId?: string | null;
}): string => {
  const firstName = typeof user.firstName === 'string' ? user.firstName.trim() : '';
  const lastName = typeof user.lastName === 'string' ? user.lastName.trim() : '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  if (typeof user.userId === 'string' && user.userId.trim()) {
    return user.userId.trim();
  }

  return 'Traveler';
};

const buildUserPostMatchConditions = (user: {
  _id: unknown;
  email?: string | null;
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) => {
  const normalizedEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
  const normalizedUserId = typeof user.userId === 'string' ? user.userId.trim().toLowerCase() : '';
  const firstName = typeof user.firstName === 'string' ? user.firstName.trim() : '';
  const lastName = typeof user.lastName === 'string' ? user.lastName.trim() : '';
  const fullName = `${firstName} ${lastName}`.trim();
  const normalizedFullName = fullName.toLowerCase();

  const postMatchConditions: Array<Record<string, unknown>> = [{ author: user._id }];

  if (normalizedEmail) {
    postMatchConditions.push({ authorKey: normalizedEmail });
    postMatchConditions.push({ hostName: toExactCaseInsensitiveRegex(normalizedEmail) });
  }

  if (normalizedUserId) {
    postMatchConditions.push({ authorKey: normalizedUserId });
    postMatchConditions.push({ hostName: toExactCaseInsensitiveRegex(user.userId?.trim() ?? '') });
  }

  if (normalizedFullName) {
    postMatchConditions.push({ authorKey: normalizedFullName });
    postMatchConditions.push({ hostName: toExactCaseInsensitiveRegex(fullName) });
  }

  return postMatchConditions;
};

const syncUserPostVerification = async (
  user: {
    _id: unknown;
    email?: string | null;
    userId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  },
  isVerified: boolean,
): Promise<void> => {
  await Post.updateMany(
    {
      $or: buildUserPostMatchConditions(user),
    },
    {
      $set: {
        author: user._id,
        isVerified,
      },
    },
  );
};

const createVerificationNotification = async ({
  userId,
  title,
  message,
  type,
  rejectionReason = null,
}: {
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: 'verification_verified' | 'verification_rejected';
  rejectionReason?: string | null;
}): Promise<void> => {
  await Notification.create({
    userId,
    title,
    message,
    type,
    metadata: rejectionReason ? { rejectionReason } : null,
  });
};

type AdminUserRecord = {
  _id: unknown;
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobileNumber?: string | null;
  profileImageDataUrl?: string | null;
  isBlocked?: boolean;
  blockedAt?: Date | string | null;
  blockedReason?: string | null;
  verificationStatus?: string | null;
  verificationDocumentUrl?: string | null;
  verificationDocumentName?: string | null;
  verificationDocumentMimeType?: string | null;
  verificationUploadedAt?: Date | string | null;
  rejectionReason?: string | null;
  createdAt?: Date | string | null;
};

type DeletedAdminUserRecord = {
  _id: unknown;
  originalUserId?: unknown;
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobileNumber?: string | null;
  profileImageDataUrl?: string | null;
  isBlocked?: boolean;
  blockedAt?: Date | string | null;
  blockedReason?: string | null;
  verificationStatus?: string | null;
  verificationDocumentName?: string | null;
  verificationDocumentMimeType?: string | null;
  verificationUploadedAt?: Date | string | null;
  rejectionReason?: string | null;
  createdAt?: Date | string | null;
  deletedAt?: Date | string | null;
};

type AdminTripOrganizerRecord = {
  firstName?: string | null;
  lastName?: string | null;
  userId?: string | null;
};

type AdminTripRecord = {
  _id: unknown;
  title?: string | null;
  location?: string | null;
  status?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  expectedBudget?: number | null;
  maxParticipants?: number | null;
  participants?: unknown[] | null;
  organizerId?: AdminTripOrganizerRecord | null;
  createdAt?: Date | string | null;
};

const normalizeVerificationStatus = (value: string | null | undefined) =>
  value === 'verified' ? 'verified' : value === 'rejected' ? 'rejected' : 'pending';

const serializeAdminUser = (user: AdminUserRecord) => ({
  id: String(user._id),
  userId: typeof user.userId === 'string' ? user.userId : '',
  name: getDisplayName(user),
  email: typeof user.email === 'string' ? user.email : '',
  mobileNumber: typeof user.mobileNumber === 'string' ? user.mobileNumber : null,
  profileImageDataUrl: typeof user.profileImageDataUrl === 'string' ? user.profileImageDataUrl : null,
  isBlocked: Boolean(user.isBlocked),
  blockedAt: user.blockedAt ?? null,
  blockedReason: typeof user.blockedReason === 'string' ? user.blockedReason : null,
  verificationStatus: normalizeVerificationStatus(user.verificationStatus),
  verificationDocumentUrl: typeof user.verificationDocumentUrl === 'string' ? user.verificationDocumentUrl : null,
  verificationDocumentName: typeof user.verificationDocumentName === 'string' ? user.verificationDocumentName : null,
  verificationDocumentMimeType:
    typeof user.verificationDocumentMimeType === 'string' ? user.verificationDocumentMimeType : null,
  verificationUploadedAt: user.verificationUploadedAt ?? null,
  rejectionReason: typeof user.rejectionReason === 'string' ? user.rejectionReason : null,
  createdAt: user.createdAt ?? null,
  deletedAt: null,
  isDeleted: false,
});

const serializeDeletedAdminUser = (user: DeletedAdminUserRecord) => ({
  id: String(user._id),
  originalUserId: user.originalUserId ? String(user.originalUserId) : null,
  userId: typeof user.userId === 'string' ? user.userId : '',
  name: getDisplayName(user),
  email: typeof user.email === 'string' ? user.email : '',
  mobileNumber: typeof user.mobileNumber === 'string' ? user.mobileNumber : null,
  profileImageDataUrl: typeof user.profileImageDataUrl === 'string' ? user.profileImageDataUrl : null,
  isBlocked: Boolean(user.isBlocked),
  blockedAt: user.blockedAt ?? null,
  blockedReason: typeof user.blockedReason === 'string' ? user.blockedReason : null,
  verificationStatus: normalizeVerificationStatus(user.verificationStatus),
  verificationDocumentUrl: null,
  verificationDocumentName: typeof user.verificationDocumentName === 'string' ? user.verificationDocumentName : null,
  verificationDocumentMimeType:
    typeof user.verificationDocumentMimeType === 'string' ? user.verificationDocumentMimeType : null,
  verificationUploadedAt: user.verificationUploadedAt ?? null,
  rejectionReason: typeof user.rejectionReason === 'string' ? user.rejectionReason : null,
  createdAt: user.createdAt ?? null,
  deletedAt: user.deletedAt ?? null,
  isDeleted: true,
});

const serializeAdminTrip = (trip: AdminTripRecord) => {
  const normalizedStatus = normalizeTripRecordStatus(
    typeof trip.status === 'string' ? trip.status : null,
    {
      startDate: trip.startDate ?? null,
      endDate: trip.endDate ?? null,
    },
    new Date(),
  );

  return {
    id: String(trip._id),
    title: typeof trip.title === 'string' ? trip.title : 'Untitled trip',
    destination: typeof trip.location === 'string' ? trip.location : 'Destination not set',
    status: normalizedStatus,
    startDate: trip.startDate ?? null,
    endDate: trip.endDate ?? null,
    budget: typeof trip.expectedBudget === 'number' ? Number(trip.expectedBudget.toFixed(2)) : 0,
    maxParticipants: typeof trip.maxParticipants === 'number' ? trip.maxParticipants : 0,
    participantCount: Array.isArray(trip.participants) ? trip.participants.length : 0,
    hostName: trip.organizerId ? getDisplayName(trip.organizerId) : 'Traveler',
    createdAt: trip.createdAt ?? null,
  };
};

const ensureNotSelfTarget = (requestUserId: string | undefined, targetUserId: string): string | null => {
  if (!requestUserId) {
    return 'Unauthorized request.';
  }

  if (requestUserId === targetUserId) {
    return 'You cannot perform this action on your own admin account.';
  }

  return null;
};

const deleteUserCascade = async (userId: Types.ObjectId): Promise<void> => {
  const organizedTrips = await Trip.find({ organizerId: userId }).select('_id').lean<Array<{ _id: Types.ObjectId }>>();
  const organizedTripIds = organizedTrips.map((trip) => trip._id);

  await Promise.all([
    organizedTripIds.length ? Expense.deleteMany({ tripId: { $in: organizedTripIds } }) : Promise.resolve(),
    organizedTripIds.length ? Payment.deleteMany({ tripId: { $in: organizedTripIds } }) : Promise.resolve(),
    organizedTripIds.length ? Transaction.deleteMany({ tripId: { $in: organizedTripIds } }) : Promise.resolve(),
    organizedTripIds.length ? Participant.deleteMany({ tripId: { $in: organizedTripIds } }) : Promise.resolve(),
    organizedTripIds.length ? TripJoinRequest.deleteMany({ tripId: { $in: organizedTripIds } }) : Promise.resolve(),
    organizedTripIds.length ? Post.deleteMany({ _id: { $in: organizedTripIds } }) : Promise.resolve(),
    organizedTripIds.length ? Trip.deleteMany({ _id: { $in: organizedTripIds } }) : Promise.resolve(),
  ]);

  await Promise.all([
    Trip.updateMany({ participants: userId }, { $pull: { participants: userId } }),
    Participant.deleteMany({ userId }),
    TripJoinRequest.deleteMany({
      $or: [{ requesterId: userId }, { hostId: userId }],
    }),
    Notification.deleteMany({ userId }),
    Expense.deleteMany({
      $or: [{ paidBy: userId }, { createdBy: userId }, { lastUpdatedBy: userId }],
    }),
    Payment.deleteMany({
      $or: [{ payerId: userId }, { recipientUserId: userId }],
    }),
    Transaction.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }),
    Post.deleteMany({ author: userId }),
    User.deleteOne({ _id: userId }),
  ]);
};

router.use(requireAuth, isAdmin);

router.get('/users', async (req, res) => {
  const requestedStatus = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : 'all';
  const verificationStatusFilter =
    requestedStatus === 'pending' ||
    requestedStatus === 'verified' ||
    requestedStatus === 'rejected' ||
    requestedStatus === 'blocked' ||
    requestedStatus === 'deleted'
      ? requestedStatus
      : requestedStatus === 'all'
        ? null
        : undefined;

  if (typeof verificationStatusFilter === 'undefined') {
    return res.status(400).json({ message: 'Status filter must be all, pending, verified, blocked, deleted, or rejected.' });
  }

  try {
    if (verificationStatusFilter === 'deleted') {
      const deletedUsers = await DeletedUser.find({})
        .sort({ deletedAt: -1, createdAt: -1 })
        .select(
          '_id originalUserId userId firstName lastName email mobileNumber profileImageDataUrl isBlocked blockedAt blockedReason verificationStatus verificationDocumentName verificationDocumentMimeType verificationUploadedAt rejectionReason createdAt deletedAt',
        )
        .lean<DeletedAdminUserRecord[]>();

      return res.status(200).json({
        users: deletedUsers.map(serializeDeletedAdminUser),
      });
    }

    const userFilter =
      verificationStatusFilter === 'blocked'
        ? { isBlocked: true }
        : verificationStatusFilter
          ? { verificationStatus: verificationStatusFilter }
          : {};

    const users = await User.find(userFilter)
      .sort({
        isBlocked: -1,
        verificationUploadedAt: -1,
        createdAt: -1,
      })
      .select(
        '_id userId firstName lastName email mobileNumber profileImageDataUrl isBlocked blockedAt blockedReason verificationStatus verificationDocumentUrl verificationDocumentName verificationDocumentMimeType verificationUploadedAt rejectionReason createdAt',
      )
      .lean<AdminUserRecord[]>();

    return res.status(200).json({
      users: users.map(serializeAdminUser),
    });
  } catch (error) {
    console.error('GET /api/admin/users failed', error);
    return res.status(500).json({ message: 'Unable to load admin users right now.' });
  }
});

router.get('/pending-users', async (req, res) => {
  const requestedLimit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : Number.NaN;
  const safeLimit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_PENDING_ACTIVITY_LIMIT)
      : null;

  try {
    const pendingUsersQuery = User.find({
      verificationStatus: 'pending',
      verificationDocumentUrl: { $exists: true, $nin: [null, ''] },
    })
      .sort({ verificationUploadedAt: -1, createdAt: -1 })
      .select(
        '_id userId firstName lastName email mobileNumber profileImageDataUrl isBlocked blockedAt blockedReason verificationStatus verificationDocumentUrl verificationDocumentName verificationDocumentMimeType verificationUploadedAt rejectionReason createdAt',
      );

    if (safeLimit) {
      pendingUsersQuery.limit(safeLimit);
    }

    const pendingUsers = await pendingUsersQuery.lean<AdminUserRecord[]>();

    return res.status(200).json({
      users: pendingUsers.map(serializeAdminUser),
    });
  } catch (error) {
    console.error('GET /api/admin/pending-users failed', error);
    return res.status(500).json({ message: 'Unable to load pending verification users right now.' });
  }
});

router.get('/trips', async (req, res) => {
  const fromDate = parseQueryDateBoundary(req.query.from, 'start');
  const toDate = parseQueryDateBoundary(req.query.to, 'end');

  if ((req.query.from && !fromDate) || (req.query.to && !toDate)) {
    return res.status(400).json({ message: 'Date filters must use a valid YYYY-MM-DD value.' });
  }

  if (fromDate && toDate && fromDate > toDate) {
    return res.status(400).json({ message: 'The start date must be on or before the end date.' });
  }

  try {
    const tripFilter = buildTripDateMatch(fromDate, toDate);

    const trips = await Trip.find(tripFilter)
      .populate('organizerId', 'firstName lastName userId')
      .sort({ startDate: 1, createdAt: -1 })
      .select('_id title location status startDate endDate expectedBudget maxParticipants participants organizerId createdAt')
      .lean<AdminTripRecord[]>();

    return res.status(200).json({
      trips: trips.map(serializeAdminTrip),
      dateRange: {
        from: fromDate ? fromDate.toISOString() : null,
        to: toDate ? toDate.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/trips failed', error);
    return res.status(500).json({ message: 'Unable to load admin trips right now.' });
  }
});

router.post('/verify-user/:id', async (req, res) => {
  const userId = typeof req.params.id === 'string' ? req.params.id : '';

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: 'User id is invalid.' });
  }

  try {
    const user = await User.findById(userId).select(
      '_id email userId firstName lastName verificationDocumentUrl verificationStatus',
    );

    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    if (!user.verificationDocumentUrl) {
      return res.status(409).json({ message: 'User has not uploaded a verification document yet.' });
    }

    user.isVerified = true;
    user.verificationStatus = 'verified';
    user.rejectionReason = null;
    await user.save();

    await Promise.all([
      syncUserPostVerification(user, true),
      createVerificationNotification({
        userId: user._id,
        title: 'Verification approved',
        message: 'Your identity document has been approved. Your verified badge is now active.',
        type: 'verification_verified',
      }),
    ]);

    return res.status(200).json({
      message: 'User verified successfully.',
      user: {
        id: user._id.toString(),
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/verify-user/:id failed', error);
    return res.status(500).json({ message: 'Unable to verify this user right now.' });
  }
});

router.post('/reject-user/:id', async (req, res) => {
  const userId = typeof req.params.id === 'string' ? req.params.id : '';
  const rawReason = req.body?.reason;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: 'User id is invalid.' });
  }

  if (typeof rawReason !== 'string' || !rawReason.trim()) {
    return res.status(400).json({ message: 'A rejection reason is required.' });
  }

  const reason = rawReason.trim();
  if (reason.length > MAX_REJECTION_REASON_LENGTH) {
    return res
      .status(400)
      .json({ message: `Rejection reason must be ${MAX_REJECTION_REASON_LENGTH} characters or fewer.` });
  }

  try {
    const user = await User.findById(userId).select(
      '_id email userId firstName lastName verificationDocumentUrl verificationStatus',
    );

    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    user.isVerified = false;
    user.verificationStatus = 'rejected';
    user.rejectionReason = reason;
    await user.save();

    await Promise.all([
      syncUserPostVerification(user, false),
      createVerificationNotification({
        userId: user._id,
        title: 'Verification rejected',
        message: `Your verification document was rejected: ${reason}`,
        type: 'verification_rejected',
        rejectionReason: reason,
      }),
    ]);

    return res.status(200).json({
      message: 'User verification rejected.',
      user: {
        id: user._id.toString(),
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/reject-user/:id failed', error);
    return res.status(500).json({ message: 'Unable to reject this user right now.' });
  }
});

router.post('/block-user/:id', async (req, res) => {
  const targetUserId = typeof req.params.id === 'string' ? req.params.id : '';
  const requesterId = req.user?.id;
  const rawReason = req.body?.reason;

  if (!mongoose.isValidObjectId(targetUserId)) {
    return res.status(400).json({ message: 'User id is invalid.' });
  }

  const selfTargetError = ensureNotSelfTarget(requesterId, targetUserId);
  if (selfTargetError) {
    return res.status(selfTargetError === 'Unauthorized request.' ? 401 : 400).json({ message: selfTargetError });
  }

  const reason =
    typeof rawReason === 'string' && rawReason.trim() ? rawReason.trim() : 'Blocked by administrator.';

  if (reason.length > MAX_BLOCK_REASON_LENGTH) {
    return res.status(400).json({ message: `Block reason must be ${MAX_BLOCK_REASON_LENGTH} characters or fewer.` });
  }

  try {
    const user = await User.findById(targetUserId).select('_id role isBlocked blockedReason');

    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    user.isBlocked = true;
    user.blockedAt = new Date();
    user.blockedReason = reason;
    await user.save();

    return res.status(200).json({
      message: 'User account blocked successfully.',
      user: {
        id: user._id.toString(),
        isBlocked: true,
        blockedReason: user.blockedReason,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/block-user/:id failed', error);
    return res.status(500).json({ message: 'Unable to block this user right now.' });
  }
});

router.post('/unblock-user/:id', async (req, res) => {
  const targetUserId = typeof req.params.id === 'string' ? req.params.id : '';
  const requesterId = req.user?.id;

  if (!mongoose.isValidObjectId(targetUserId)) {
    return res.status(400).json({ message: 'User id is invalid.' });
  }

  const selfTargetError = ensureNotSelfTarget(requesterId, targetUserId);
  if (selfTargetError) {
    return res.status(selfTargetError === 'Unauthorized request.' ? 401 : 400).json({ message: selfTargetError });
  }

  try {
    const user = await User.findById(targetUserId).select('_id isBlocked blockedReason');

    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    user.isBlocked = false;
    user.blockedAt = null;
    user.blockedReason = null;
    await user.save();

    return res.status(200).json({
      message: 'User account unblocked successfully.',
      user: {
        id: user._id.toString(),
        isBlocked: false,
        blockedReason: null,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/unblock-user/:id failed', error);
    return res.status(500).json({ message: 'Unable to unblock this user right now.' });
  }
});

router.delete('/user/:id', async (req, res) => {
  const targetUserId = typeof req.params.id === 'string' ? req.params.id : '';
  const requesterId = req.user?.id;

  if (!mongoose.isValidObjectId(targetUserId)) {
    return res.status(400).json({ message: 'User id is invalid.' });
  }

  const selfTargetError = ensureNotSelfTarget(requesterId, targetUserId);
  if (selfTargetError) {
    return res.status(selfTargetError === 'Unauthorized request.' ? 401 : 400).json({ message: selfTargetError });
  }

  try {
    const user = await User.findById(targetUserId).select(
      '_id userId firstName lastName email mobileNumber profileImageDataUrl isBlocked blockedAt blockedReason verificationStatus verificationDocumentName verificationDocumentMimeType verificationUploadedAt rejectionReason createdAt',
    );

    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    await DeletedUser.create({
      originalUserId: user._id,
      deletedByUserId: requesterId && mongoose.isValidObjectId(requesterId) ? new Types.ObjectId(requesterId) : null,
      userId: user.userId,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      mobileNumber: user.mobileNumber ?? '',
      profileImageDataUrl: user.profileImageDataUrl ?? null,
      isBlocked: Boolean(user.isBlocked),
      blockedAt: user.blockedAt ?? null,
      blockedReason: user.blockedReason ?? null,
      verificationStatus: normalizeVerificationStatus(user.verificationStatus),
      verificationDocumentName: user.verificationDocumentName ?? null,
      verificationDocumentMimeType: user.verificationDocumentMimeType ?? null,
      verificationUploadedAt: user.verificationUploadedAt ?? null,
      rejectionReason: user.rejectionReason ?? null,
      createdAt: user.createdAt ?? null,
      deletedAt: new Date(),
    });

    await deleteUserCascade(new Types.ObjectId(targetUserId));

    return res.status(200).json({
      message: 'User account deleted successfully.',
      user: {
        id: targetUserId,
      },
    });
  } catch (error) {
    console.error('DELETE /api/admin/user/:id failed', error);
    return res.status(500).json({ message: 'Unable to delete this user right now.' });
  }
});

router.get('/stats', async (req, res) => {
  const todayStart = toDayStart(new Date());
  const todayEnd = toDayEnd(new Date());
  const fromDate = parseQueryDateBoundary(req.query.from, 'start');
  const toDate = parseQueryDateBoundary(req.query.to, 'end');

  if (!todayStart || !todayEnd) {
    return res.status(500).json({ message: 'Unable to calculate admin analytics right now.' });
  }

  if ((req.query.from && !fromDate) || (req.query.to && !toDate)) {
    return res.status(400).json({ message: 'Date filters must use a valid YYYY-MM-DD value.' });
  }

  if (fromDate && toDate && fromDate > toDate) {
    return res.status(400).json({ message: 'The start date must be on or before the end date.' });
  }

  try {
    const tripDateMatch = buildTripDateMatch(fromDate, toDate);
    const tripAggregationPipeline: PipelineStage[] = [];

    if (Object.keys(tripDateMatch).length > 0) {
      tripAggregationPipeline.push({
        $match: tripDateMatch,
      });
    }

    tripAggregationPipeline.push(
      {
        $addFields: {
          normalizedStatus: {
            $switch: {
              branches: [
                {
                  case: { $in: ['$status', [...CANCELLED_TRIP_STATUS_VALUES]] },
                  then: CANCELLED_TRIP_STATUS,
                },
                {
                  case: { $in: ['$status', [...COMPLETED_TRIP_STATUS_VALUES]] },
                  then: COMPLETED_TRIP_STATUS,
                },
                {
                  case: { $gt: ['$startDate', todayEnd] },
                  then: UPCOMING_TRIP_STATUS,
                },
                {
                  case: { $lt: ['$endDate', todayStart] },
                  then: COMPLETED_TRIP_STATUS,
                },
                {
                  case: {
                    $and: [{ $lte: ['$startDate', todayEnd] }, { $gte: ['$endDate', todayStart] }],
                  },
                  then: ACTIVE_TRIP_STATUS,
                },
              ],
              default: UPCOMING_TRIP_STATUS,
            },
          },
        },
      },
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: '$normalizedStatus',
                count: { $sum: 1 },
              },
            },
          ],
          totals: [
            {
              $group: {
                _id: null,
                grossTripTotal: { $sum: { $ifNull: ['$expectedBudget', 0] } },
                totalTrips: { $sum: 1 },
              },
            },
          ],
        },
      },
    );

    const [totalUsers, totalVerifiedUsers, totalPendingUsers, totalBlockedUsers, totalDeletedUsers, tripStatsResult] =
      await Promise.all([
        User.countDocuments({}),
        User.countDocuments({
          $or: [{ verificationStatus: 'verified' }, { isVerified: true }],
        }),
        User.countDocuments({ verificationStatus: 'pending' }),
        User.countDocuments({ isBlocked: true }),
        DeletedUser.countDocuments({}),
        Trip.aggregate<{
          counts?: Array<{ _id: string; count: number }>;
          totals?: Array<{ grossTripTotal?: number; totalTrips?: number }>;
        }>(tripAggregationPipeline),
      ]);

    const tripStats = tripStatsResult[0] ?? {};
    const tripCounts = new Map<string, number>(
      (tripStats.counts ?? []).map((entry) => [entry._id, typeof entry.count === 'number' ? entry.count : 0]),
    );
    const totals = tripStats.totals?.[0] ?? {};
    const totalTrips = typeof totals.totalTrips === 'number' ? totals.totalTrips : 0;
    const totalCompletedTrips = tripCounts.get(COMPLETED_TRIP_STATUS) ?? 0;
    const totalActiveTrips = tripCounts.get(ACTIVE_TRIP_STATUS) ?? 0;
    const totalUpcomingTrips = tripCounts.get(UPCOMING_TRIP_STATUS) ?? 0;
    const totalCancelledTrips = tripCounts.get(CANCELLED_TRIP_STATUS) ?? 0;
    const totalPendingTrips = totalUpcomingTrips + totalActiveTrips;
    const grossTripTotal =
      typeof totals.grossTripTotal === 'number' ? Number(totals.grossTripTotal.toFixed(2)) : 0;
    const successRate = totalTrips > 0 ? Number(((totalCompletedTrips / totalTrips) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      totalUsers,
      totalVerifiedUsers,
      totalPendingUsers,
      totalBlockedUsers,
      totalDeletedUsers,
      totalCompletedTrips,
      totalPendingTrips,
      totalTrips,
      grossTripTotal,
      successRate,
      tripLifecycle: {
        completed: totalCompletedTrips,
        active: totalActiveTrips,
        pending: totalUpcomingTrips,
        cancelled: totalCancelledTrips,
      },
      dateRange: {
        from: fromDate ? fromDate.toISOString() : null,
        to: toDate ? toDate.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/stats failed', error);
    return res.status(500).json({ message: 'Unable to load admin analytics right now.' });
  }
});

export default router;
