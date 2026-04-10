import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Participant } from './models/Participant.js';
import { Post } from './models/Post.js';
import { Trip } from './models/Trip.js';
import { TripJoinRequest } from './models/TripJoinRequest.js';
import { User } from './models/User.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/splitngo';
const targetEmail = 'test1@gmail.com';
const legacySeedUserEmails = ['test1@gmail.com', 'hiren@gmail.com'];
const legacyTripTitles = [
  'Banff Sunrise Hiking Circle',
  'Toronto Food and Culture Weekend',
  'Montreal Design and Cafe Crawl',
  'Tokyo Neon Nights Explorer',
  'Swiss Lakes and Rail Pass Retreat',
  'Iceland Ring Road Highlights',
  'Bali Wellness Villa Week',
  'Paris Museums and Pastries Escape',
  'Cairo History and Desert Night',
  'Rio Beach and Samba Circuit',
  'Vancouver Sea to Sky Weekend',
  'Quebec City Winter Lights',
  'Tofino Surf and Cedar Getaway',
  'Marrakech Courtyard Escape',
  'Lisbon Sunsets and Tram Hops',
];
const singleCompletedTripTitle = 'Completed Test Journey - Test1 Host';

const buildLegacySeededTitles = () => [
  ...legacyTripTitles.map((title) => `${title} - Test1 Host`),
  ...legacyTripTitles.map((title) => `${title} - Hiren Host`),
];

const loadUsers = async () => {
  const users = await User.find({ email: { $in: legacySeedUserEmails } })
    .select('_id email userId firstName lastName isVerified')
    .lean();

  return users;
};

const cleanupLegacyTrips = async (users) => {
  const legacySeededTitles = buildLegacySeededTitles();
  const userIds = users.map((user) => user._id);
  const authorKeys = Array.from(
    new Set(
      users.flatMap((user) =>
        [user.email, user.userId]
          .filter((value) => typeof value === 'string' && value.trim())
          .map((value) => value.toLowerCase()),
      ),
    ),
  );

  const postsToDelete = await Post.find({
    $or: [
      { title: { $in: legacySeededTitles } },
      { title: singleCompletedTripTitle },
    ],
    ...(authorKeys.length > 0 ? { authorKey: { $in: authorKeys } } : {}),
  })
    .select('_id')
    .lean();

  const tripsToDelete = await Trip.find({
    $or: [
      { title: { $in: legacySeededTitles } },
      { title: singleCompletedTripTitle },
    ],
    ...(userIds.length > 0 ? { organizerId: { $in: userIds } } : {}),
  })
    .select('_id')
    .lean();

  const tripIds = Array.from(
    new Set([...postsToDelete.map((post) => String(post._id)), ...tripsToDelete.map((trip) => String(trip._id))]),
  ).map((tripId) => new mongoose.Types.ObjectId(tripId));

  const [participantResult, joinRequestResult, postResult, tripResult] = await Promise.all([
    tripIds.length > 0 ? Participant.deleteMany({ tripId: { $in: tripIds } }) : { deletedCount: 0 },
    tripIds.length > 0 ? TripJoinRequest.deleteMany({ tripId: { $in: tripIds } }) : { deletedCount: 0 },
    postsToDelete.length > 0 ? Post.deleteMany({ _id: { $in: postsToDelete.map((post) => post._id) } }) : { deletedCount: 0 },
    tripsToDelete.length > 0 ? Trip.deleteMany({ _id: { $in: tripsToDelete.map((trip) => trip._id) } }) : { deletedCount: 0 },
  ]);

  return {
    deletedPosts: postResult.deletedCount ?? 0,
    deletedTrips: tripResult.deletedCount ?? 0,
    deletedParticipants: participantResult.deletedCount ?? 0,
    deletedJoinRequests: joinRequestResult.deletedCount ?? 0,
  };
};

const seedSingleCompletedTrip = async (user) => {
  if (!user?._id) {
    throw new Error(`User with email ${targetEmail} was not found.`);
  }

  const authorKey = (
    typeof user.userId === 'string' && user.userId.trim() ? user.userId : user.email
  ).toLowerCase();
  const hostName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

  const endDate = new Date();
  endDate.setHours(18, 0, 0, 0);
  endDate.setDate(endDate.getDate() - 7);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 4);
  startDate.setHours(9, 0, 0, 0);

  const sharedId = new mongoose.Types.ObjectId();

  await Post.create({
    _id: sharedId,
    author: user._id,
    authorKey,
    status: 'Completed',
    title: singleCompletedTripTitle,
    hostName,
    isVerified: Boolean(user.isVerified),
    onlyVerifiedUsers: false,
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    location: 'Toronto, Ontario, Canada',
    cost: 240,
    durationDays: 5,
    requiredPeople: 4,
    spotsFilledPercent: 0,
    expectations: ['Be on time for meetups', 'Share costs fairly', 'Keep communication clear'],
    travelerType: 'Collaborative city traveler',
    startDate,
    endDate,
  });

  await Trip.create({
    _id: sharedId,
    organizerId: user._id,
    title: singleCompletedTripTitle,
    description: 'A seeded completed trip for archive and history testing.',
    location: 'Toronto, Ontario, Canada',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    price: 240,
    category: 'Budget',
    startDate,
    endDate,
    status: 'Completed',
    maxParticipants: 4,
    participants: [],
  });
};

const resetAndSeedTrips = async () => {
  try {
    await mongoose.connect(mongoUri, { autoIndex: true });
    console.log(`Connected to MongoDB at ${mongoUri}`);

    const users = await loadUsers();
    const cleanupSummary = await cleanupLegacyTrips(users);
    const targetUser = users.find((user) => user.email?.toLowerCase() === targetEmail);

    await seedSingleCompletedTrip(targetUser);

    console.log(
      `Cleanup complete. Deleted ${cleanupSummary.deletedPosts} posts, ${cleanupSummary.deletedTrips} trips, ${cleanupSummary.deletedParticipants} participant rows, and ${cleanupSummary.deletedJoinRequests} join requests.`,
    );
    console.log(`Inserted 1 completed trip for ${targetEmail}.`);
  } catch (error) {
    console.error('Failed to reset and seed trip data:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

void resetAndSeedTrips();
