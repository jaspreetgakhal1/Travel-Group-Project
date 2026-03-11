import express from 'express';
import { Post } from '../models/Post.js';
import { Trip } from '../models/Trip.js';
import { User } from '../models/User.js';

const router = express.Router();

const normalizeAuthorKey = (value) => value.trim().toLowerCase();
const ACTIVE_STATUS_FILTER = {
  $or: [{ status: 'Active' }, { status: { $exists: false } }, { status: null }],
};

const resolveStatusQuery = (rawValue) => {
  if (typeof rawValue !== 'string') {
    return 'Active';
  }

  const normalizedValue = rawValue.trim();
  if (normalizedValue === 'all') {
    return 'all';
  }

  if (normalizedValue === 'Active' || normalizedValue === 'Completed') {
    return normalizedValue;
  }

  return null;
};

const parseViewerVerifiedQuery = (rawValue) => {
  if (typeof rawValue !== 'string') {
    return false;
  }

  return rawValue.trim().toLowerCase() === 'true';
};

const toIsoDateString = (value) => {
  const parsedDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString();
  }
  return parsedDate.toISOString();
};

const getPostStatus = (value) => (value === 'Completed' ? 'Completed' : 'Active');

const getPostAuthorKey = (post) => {
  const rawValue =
    typeof post.authorKey === 'string' && post.authorKey.trim()
      ? post.authorKey
      : typeof post.hostName === 'string'
        ? post.hostName
        : '';

  return normalizeAuthorKey(rawValue || 'unknown-host');
};

const buildDisplayName = (user, fallbackName) => {
  const firstName = typeof user?.firstName === 'string' ? user.firstName.trim() : '';
  const lastName = typeof user?.lastName === 'string' ? user.lastName.trim() : '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  const fallback =
    typeof fallbackName === 'string' && fallbackName.trim()
      ? fallbackName.trim()
      : typeof user?.userId === 'string'
        ? user.userId.trim()
        : '';

  return fallback || 'Traveler';
};

const getProfileImageDataUrl = (user) => {
  if (typeof user?.profileImageDataUrl !== 'string') {
    return null;
  }

  const normalizedValue = user.profileImageDataUrl.trim();
  return normalizedValue || null;
};

const getUserLookupKeys = (authorKey) => {
  const normalizedAuthorKey =
    typeof authorKey === 'string' && authorKey.trim() ? normalizeAuthorKey(authorKey) : '';
  if (!normalizedAuthorKey) {
    return [];
  }

  return [
    { email: normalizedAuthorKey },
    { userId: normalizedAuthorKey },
  ];
};

const getParticipantIds = (value) => (Array.isArray(value) ? value.map((participantId) => String(participantId)) : []);
const getSpotsFilledPercent = (spotsFilled, maxParticipants) => {
  if (!Number.isFinite(maxParticipants) || maxParticipants <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((spotsFilled / maxParticipants) * 100));
};

const findUsersByAuthorKeys = async (authorKeys) => {
  const normalizedAuthorKeys = Array.from(
    new Set(
      authorKeys
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => normalizeAuthorKey(value)),
    ),
  );

  if (normalizedAuthorKeys.length === 0) {
    return new Map();
  }

  const users = await User.find({
    $or: [{ email: { $in: normalizedAuthorKeys } }, { userId: { $in: normalizedAuthorKeys } }],
  })
    .select('_id email userId firstName lastName profileImageDataUrl isVerified')
    .lean();

  const usersByAuthorKey = new Map();

  users.forEach((user) => {
    if (typeof user.email === 'string' && user.email.trim()) {
      usersByAuthorKey.set(normalizeAuthorKey(user.email), user);
    }

    if (typeof user.userId === 'string' && user.userId.trim()) {
      const normalizedUserId = normalizeAuthorKey(user.userId);
      if (!usersByAuthorKey.has(normalizedUserId)) {
        usersByAuthorKey.set(normalizedUserId, user);
      }
    }
  });

  return usersByAuthorKey;
};

const findUserByAuthorKey = async (authorKey) => {
  const lookupKeys = getUserLookupKeys(authorKey);
  if (lookupKeys.length === 0) {
    return null;
  }

  const user = await User.findOne({ $or: lookupKeys })
    .select('_id email userId firstName lastName profileImageDataUrl isVerified')
    .lean();

  return user ?? null;
};

const toFeedPost = (post, user = null, trip = null) => {
  const participantIds = getParticipantIds(trip?.participants);
  const maxParticipants =
    Number.isInteger(trip?.maxParticipants) && trip.maxParticipants > 0
      ? trip.maxParticipants
      : Number.isInteger(post.requiredPeople) && post.requiredPeople > 0
        ? post.requiredPeople
        : 1;
  const fallbackSpotsFilled =
    Number.isFinite(post.spotsFilledPercent) && maxParticipants > 0
      ? Math.round((post.spotsFilledPercent / 100) * maxParticipants)
      : 0;
  const spotsFilled = trip ? participantIds.length : fallbackSpotsFilled;

  return {
    id: post._id.toString(),
    hostId:
      trip?.organizerId ? String(trip.organizerId) : user?._id ? String(user._id) : undefined,
    authorKey: getPostAuthorKey(post),
    status: getPostStatus(post.status),
    onlyVerifiedUsers: Boolean(post.onlyVerifiedUsers),
    title: post.title,
    hostName: buildDisplayName(user, post.hostName),
    isVerified: user ? Boolean(user.isVerified) : Boolean(post.isVerified),
    hostProfileImageDataUrl: getProfileImageDataUrl(user),
    imageUrl: post.imageUrl,
    location: post.location,
    cost: post.cost,
    durationDays: post.durationDays,
    requiredPeople: post.requiredPeople,
    maxParticipants,
    spotsFilled,
    spotsFilledPercent: getSpotsFilledPercent(spotsFilled, maxParticipants),
    participantIds,
    expectations: post.expectations,
    travelerType: post.travelerType,
    startDate: toIsoDateString(post.startDate),
    endDate: toIsoDateString(post.endDate),
  };
};

const validatePostPayload = (body) => {
  const {
    authorKey,
    status,
    onlyVerifiedUsers,
    title,
    hostName,
    isVerified,
    imageUrl,
    location,
    cost,
    durationDays,
    requiredPeople,
    spotsFilledPercent,
    expectations,
    travelerType,
    startDate,
    endDate,
  } = body ?? {};

  if (
    typeof authorKey !== 'string' ||
    typeof title !== 'string' ||
    typeof hostName !== 'string' ||
    typeof isVerified !== 'boolean' ||
    typeof imageUrl !== 'string' ||
    typeof location !== 'string' ||
    typeof cost !== 'number' ||
    typeof durationDays !== 'number' ||
    typeof requiredPeople !== 'number' ||
    typeof spotsFilledPercent !== 'number' ||
    !Array.isArray(expectations) ||
    typeof travelerType !== 'string' ||
    typeof startDate !== 'string' ||
    typeof endDate !== 'string'
  ) {
    return { isValid: false, message: 'Post payload is incomplete or invalid.' };
  }

  const normalizedAuthorKey = normalizeAuthorKey(authorKey);
  if (!normalizedAuthorKey) {
    return { isValid: false, message: 'Post author is required.' };
  }

  if (typeof status !== 'undefined' && status !== 'Active' && status !== 'Completed') {
    return { isValid: false, message: 'Post status must be Active or Completed.' };
  }

  if (typeof onlyVerifiedUsers !== 'undefined' && typeof onlyVerifiedUsers !== 'boolean') {
    return { isValid: false, message: 'Verified-user flow flag must be true or false.' };
  }

  const normalizedTitle = title.trim();
  const normalizedHostName = hostName.trim();
  const normalizedImageUrl = imageUrl.trim();
  const normalizedLocation = location.trim();
  const normalizedTravelerType = travelerType.trim();

  if (!normalizedTitle || !normalizedHostName || !normalizedImageUrl || !normalizedLocation || !normalizedTravelerType) {
    return { isValid: false, message: 'Title, host, image, location, and traveler type are required.' };
  }

  if (!Number.isFinite(cost) || cost < 0) {
    return { isValid: false, message: 'Cost must be a non-negative number.' };
  }

  if (!Number.isInteger(durationDays) || durationDays < 1) {
    return { isValid: false, message: 'Duration days must be a positive integer.' };
  }

  if (!Number.isInteger(requiredPeople) || requiredPeople < 1) {
    return { isValid: false, message: 'Required people must be a positive integer.' };
  }

  if (!Number.isFinite(spotsFilledPercent) || spotsFilledPercent < 0 || spotsFilledPercent > 100) {
    return { isValid: false, message: 'Spots filled percent must be between 0 and 100.' };
  }

  if (expectations.some((expectation) => typeof expectation !== 'string' || !expectation.trim())) {
    return { isValid: false, message: 'Expectations must be a list of non-empty strings.' };
  }

  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
    return { isValid: false, message: 'Start date and end date must be valid ISO date values.' };
  }

  if (parsedEndDate < parsedStartDate) {
    return { isValid: false, message: 'End date cannot be earlier than start date.' };
  }

  return {
    isValid: true,
    payload: {
      authorKey: normalizedAuthorKey,
      ...(typeof status === 'string' ? { status } : {}),
      onlyVerifiedUsers: typeof onlyVerifiedUsers === 'boolean' ? onlyVerifiedUsers : false,
      title: normalizedTitle,
      hostName: normalizedHostName,
      isVerified,
      imageUrl: normalizedImageUrl,
      location: normalizedLocation,
      cost: Number(cost.toFixed(2)),
      durationDays,
      requiredPeople,
      spotsFilledPercent: Math.round(spotsFilledPercent),
      expectations: expectations.map((expectation) => expectation.trim()),
      travelerType: normalizedTravelerType,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    },
  };
};

const isPostOwner = (post, authorKey) => {
  if (typeof authorKey !== 'string' || !authorKey.trim()) {
    return false;
  }

  return getPostAuthorKey(post) === normalizeAuthorKey(authorKey);
};

router.get('/stats', async (request, response) => {
  const authorKeyQuery = typeof request.query.authorKey === 'string' ? request.query.authorKey.trim() : '';
  const filterByAuthor = authorKeyQuery
    ? {
        authorKey: normalizeAuthorKey(authorKeyQuery),
      }
    : {};

  try {
    const [activeCount, completedCount, totalCount] = await Promise.all([
      Post.countDocuments({ ...filterByAuthor, ...ACTIVE_STATUS_FILTER }),
      Post.countDocuments({ ...filterByAuthor, status: 'Completed' }),
      Post.countDocuments(filterByAuthor),
    ]);

    return response.status(200).json({
      activeCount,
      completedCount,
      totalCount,
    });
  } catch (error) {
    console.error('Post stats route failed', error);
    return response.status(500).json({ message: 'Unable to fetch post stats right now.' });
  }
});

router.get('/', async (request, response) => {
  const statusQuery = resolveStatusQuery(request.query.status);
  if (!statusQuery) {
    return response.status(400).json({ message: 'Invalid status filter. Use Active, Completed, or all.' });
  }

  const viewerIsVerified = parseViewerVerifiedQuery(request.query.viewerVerified);
  const viewerAuthorKey =
    typeof request.query.viewerAuthorKey === 'string' && request.query.viewerAuthorKey.trim()
      ? normalizeAuthorKey(request.query.viewerAuthorKey)
      : null;

  const statusFilter =
    statusQuery === 'all'
      ? {}
      : statusQuery === 'Completed'
        ? { status: 'Completed' }
        : ACTIVE_STATUS_FILTER;

  const visibilityFilter = viewerIsVerified
    ? {}
    : viewerAuthorKey
      ? {
          $or: [{ onlyVerifiedUsers: { $ne: true } }, { authorKey: viewerAuthorKey }],
        }
      : { onlyVerifiedUsers: { $ne: true } };

  const filter =
    Object.keys(statusFilter).length === 0
      ? visibilityFilter
      : {
          $and: [statusFilter, visibilityFilter],
        };

  try {
    const posts = await Post.find(filter).sort({ createdAt: -1 });
    const usersByAuthorKey = await findUsersByAuthorKeys(posts.map((post) => getPostAuthorKey(post)));
    const postIds = posts.map((post) => post._id);
    const trips = postIds.length > 0
      ? await Trip.find({ _id: { $in: postIds } }).select('_id organizerId maxParticipants participants').lean()
      : [];
    const tripById = new Map(trips.map((trip) => [String(trip._id), trip]));

    return response
      .status(200)
      .json(
        posts.map((post) =>
          toFeedPost(
            post,
            usersByAuthorKey.get(getPostAuthorKey(post)) ?? null,
            tripById.get(String(post._id)) ?? null,
          ),
        ),
      );
  } catch (error) {
    console.error('Get posts route failed', error);
    return response.status(500).json({ message: 'Unable to fetch posts right now.' });
  }
});

router.post('/', async (request, response) => {
  const validationResult = validatePostPayload(request.body);
  if (!validationResult.isValid) {
    return response.status(400).json({ message: validationResult.message });
  }

  try {
    const createdPost = await Post.create({
      ...validationResult.payload,
      status: validationResult.payload.status ?? 'Active',
    });
    const authorUser = await findUserByAuthorKey(getPostAuthorKey(createdPost));
    return response.status(201).json(toFeedPost(createdPost, authorUser));
  } catch (error) {
    console.error('Create post route failed', error);
    return response.status(500).json({ message: 'Unable to create post right now.' });
  }
});

router.put('/:postId', async (request, response) => {
  const { postId } = request.params;
  const validationResult = validatePostPayload(request.body);

  if (!validationResult.isValid) {
    return response.status(400).json({ message: validationResult.message });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return response.status(404).json({ message: 'Post not found.' });
    }

    if (!isPostOwner(post, validationResult.payload.authorKey)) {
      return response.status(403).json({ message: 'You can only edit your own posts.' });
    }

    post.authorKey = validationResult.payload.authorKey;
    post.status = validationResult.payload.status ?? getPostStatus(post.status);
    post.title = validationResult.payload.title;
    post.hostName = validationResult.payload.hostName;
    post.isVerified = validationResult.payload.isVerified;
    post.onlyVerifiedUsers = validationResult.payload.onlyVerifiedUsers;
    post.imageUrl = validationResult.payload.imageUrl;
    post.location = validationResult.payload.location;
    post.cost = validationResult.payload.cost;
    post.durationDays = validationResult.payload.durationDays;
    post.requiredPeople = validationResult.payload.requiredPeople;
    post.spotsFilledPercent = validationResult.payload.spotsFilledPercent;
    post.expectations = validationResult.payload.expectations;
    post.travelerType = validationResult.payload.travelerType;
    post.startDate = validationResult.payload.startDate;
    post.endDate = validationResult.payload.endDate;

    await post.save();
    const authorUser = await findUserByAuthorKey(getPostAuthorKey(post));
    return response.status(200).json(toFeedPost(post, authorUser));
  } catch (error) {
    console.error('Update post route failed', error);
    return response.status(500).json({ message: 'Unable to update post right now.' });
  }
});

router.patch('/:postId/status', async (request, response) => {
  const { postId } = request.params;
  const { authorKey, status } = request.body ?? {};

  if (typeof authorKey !== 'string' || !authorKey.trim()) {
    return response.status(400).json({ message: 'Post author is required.' });
  }

  if (status !== 'Active' && status !== 'Completed') {
    return response.status(400).json({ message: 'Status must be Active or Completed.' });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return response.status(404).json({ message: 'Post not found.' });
    }

    if (!isPostOwner(post, authorKey)) {
      return response.status(403).json({ message: 'You can only update your own posts.' });
    }

    post.authorKey = getPostAuthorKey(post);
    post.status = status;
    await post.save();
    const authorUser = await findUserByAuthorKey(getPostAuthorKey(post));
    return response.status(200).json(toFeedPost(post, authorUser));
  } catch (error) {
    console.error('Update post status route failed', error);
    return response.status(500).json({ message: 'Unable to update post status right now.' });
  }
});

router.delete('/:postId', async (request, response) => {
  const { postId } = request.params;
  const { authorKey } = request.body ?? {};

  if (typeof authorKey !== 'string' || !authorKey.trim()) {
    return response.status(400).json({ message: 'Post author is required.' });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return response.status(404).json({ message: 'Post not found.' });
    }

    if (!isPostOwner(post, authorKey)) {
      return response.status(403).json({ message: 'You can only delete your own posts.' });
    }

    await Post.deleteOne({ _id: postId });
    return response.status(200).json({ message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('Delete post route failed', error);
    return response.status(500).json({ message: 'Unable to delete post right now.' });
  }
});

export default router;
