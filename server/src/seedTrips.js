import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Post } from './models/Post.js';
import { Trip } from './models/Trip.js';
import { User } from './models/User.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/socialtravel';

const seedUserEmails = ['test1@gmail.com', 'hiren@gmail.com'];

const tripTemplates = [
  {
    title: 'Banff Sunrise Hiking Circle',
    description: 'A three-day Rocky Mountain escape with alpine hikes, shared cabin dinners, and sunrise photography at Moraine Lake.',
    location: 'Banff, Alberta, Canada',
    imageUrl: 'https://images.unsplash.com/photo-1508264165352-258a6f82b5f7',
    price: 420,
    startDate: '2026-06-12',
    endDate: '2026-06-15',
    maxParticipants: 6,
    category: 'Nature',
  },
  {
    title: 'Toronto Food and Culture Weekend',
    description: 'A city break focused on Kensington Market eats, waterfront biking, and a live music night in the Distillery District.',
    location: 'Toronto, Ontario, Canada',
    imageUrl: 'https://images.unsplash.com/photo-1517935706615-2717063c2225',
    price: 180,
    startDate: '2026-05-08',
    endDate: '2026-05-10',
    maxParticipants: 5,
    category: 'Budget',
  },
  {
    title: 'Montreal Design and Cafe Crawl',
    description: 'A relaxed long weekend exploring Old Montreal, boutique stays, coffee tastings, and late-night jazz bars.',
    location: 'Montreal, Quebec, Canada',
    imageUrl: 'https://images.unsplash.com/photo-1519178614-68673b201f36',
    price: 250,
    startDate: '2026-05-22',
    endDate: '2026-05-25',
    maxParticipants: 4,
    category: 'Luxury',
  },
  {
    title: 'Tokyo Neon Nights Explorer',
    description: 'A high-energy Tokyo itinerary with Shibuya crossings, ramen tastings, design hotels, and a Mount Fuji day trip.',
    location: 'Tokyo, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e',
    price: 1650,
    startDate: '2026-09-14',
    endDate: '2026-09-20',
    maxParticipants: 5,
    category: 'Adventure',
  },
  {
    title: 'Swiss Lakes and Rail Pass Retreat',
    description: 'Panoramic train rides, boutique chalets, and slow travel through Lucerne, Interlaken, and the Lauterbrunnen Valley.',
    location: 'Interlaken, Switzerland',
    imageUrl: 'https://images.unsplash.com/photo-1531219432768-9f540ce91ef3',
    price: 1980,
    startDate: '2026-08-03',
    endDate: '2026-08-09',
    maxParticipants: 4,
    category: 'Luxury',
  },
  {
    title: 'Iceland Ring Road Highlights',
    description: 'Waterfalls, hot springs, black sand beaches, and shared camper-style pacing for a scenic Iceland escape.',
    location: 'Reykjavik, Iceland',
    imageUrl: 'https://images.unsplash.com/photo-1521033335978-f1ca5d741a75',
    price: 1425,
    startDate: '2026-07-07',
    endDate: '2026-07-13',
    maxParticipants: 6,
    category: 'Nature',
  },
  {
    title: 'Bali Wellness Villa Week',
    description: 'A tropical reset featuring yoga mornings, co-working afternoons, rice terrace visits, and sunset beach dinners.',
    location: 'Ubud, Bali, Indonesia',
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4',
    price: 980,
    startDate: '2026-10-05',
    endDate: '2026-10-11',
    maxParticipants: 8,
    category: 'Luxury',
  },
  {
    title: 'Paris Museums and Pastries Escape',
    description: 'A curated Paris trip with Louvre mornings, Seine sunset walks, boutique hotels, and bakery stops between neighborhoods.',
    location: 'Paris, France',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
    price: 1350,
    startDate: '2026-09-01',
    endDate: '2026-09-06',
    maxParticipants: 5,
    category: 'Luxury',
  },
  {
    title: 'Cairo History and Desert Night',
    description: 'Guided pyramids visits, Nile-side dinners, local market walks, and a desert camp experience just outside the city.',
    location: 'Cairo, Egypt',
    imageUrl: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f73',
    price: 740,
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    maxParticipants: 7,
    category: 'Adventure',
  },
  {
    title: 'Rio Beach and Samba Circuit',
    description: 'A vibrant group trip with beach mornings, hillside viewpoints, live samba venues, and local food tours.',
    location: 'Rio de Janeiro, Brazil',
    imageUrl: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325',
    price: 890,
    startDate: '2026-12-02',
    endDate: '2026-12-07',
    maxParticipants: 8,
    category: 'Adventure',
  },
  {
    title: 'Vancouver Sea to Sky Weekend',
    description: 'A quick west coast getaway with mountain views, craft coffee, scenic drives, and an easy group hiking schedule.',
    location: 'Vancouver, British Columbia, Canada',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
    price: 310,
    startDate: '2026-06-19',
    endDate: '2026-06-21',
    maxParticipants: 5,
    category: 'Nature',
  },
  {
    title: 'Quebec City Winter Lights',
    description: 'Snowy streets, cozy inns, old-town walks, and a small-group winter food itinerary through Quebec City.',
    location: 'Quebec City, Quebec, Canada',
    imageUrl: 'https://images.unsplash.com/photo-1512813382947-8efc962f4197',
    price: 220,
    startDate: '2026-12-11',
    endDate: '2026-12-14',
    maxParticipants: 4,
    category: 'Budget',
  },
  {
    title: 'Tofino Surf and Cedar Getaway',
    description: 'Learn-to-surf sessions, storm-watch cabins, beach fires, and flexible free time on Vancouver Island.',
    location: 'Tofino, British Columbia, Canada',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
    price: 560,
    startDate: '2026-07-24',
    endDate: '2026-07-27',
    maxParticipants: 6,
    category: 'Adventure',
  },
  {
    title: 'Marrakech Courtyard Escape',
    description: 'Riad stays, medina exploration, rooftop dinners, and a balanced pace between guided highlights and free time.',
    location: 'Marrakech, Morocco',
    imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada',
    price: 860,
    startDate: '2026-10-20',
    endDate: '2026-10-25',
    maxParticipants: 6,
    category: 'Nature',
  },
  {
    title: 'Lisbon Sunsets and Tram Hops',
    description: 'An easygoing Europe trip with tiled streets, shared apartment living, miradouros, and late seafood dinners.',
    location: 'Lisbon, Portugal',
    imageUrl: 'https://images.unsplash.com/photo-1513735492246-483525079686',
    price: 690,
    startDate: '2026-09-18',
    endDate: '2026-09-23',
    maxParticipants: 5,
    category: 'Budget',
  },
];

const buildTripsForUser = (user, label) =>
  tripTemplates.map((trip, index) => ({
    organizerId: user._id,
    title: `${trip.title} - ${label}`,
    description: `${trip.description} Hosted by ${user.firstName || user.email}.`,
    location: trip.location,
    imageUrl: trip.imageUrl,
    price: trip.price,
    category: trip.category,
    startDate: new Date(`${trip.startDate}T09:00:00.000Z`),
    endDate: new Date(`${trip.endDate}T18:00:00.000Z`),
    maxParticipants: trip.maxParticipants,
    participants: [],
    author: user._id,
    authorKey:
      (typeof user.userId === 'string' && user.userId.trim()
        ? user.userId
        : typeof user.email === 'string'
          ? user.email
          : ''
      ).toLowerCase(),
    status: 'Active',
    hostName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
    isVerified: Boolean(user.isVerified),
    onlyVerifiedUsers: index % 4 === 0,
    cost: trip.price,
    durationDays: Math.max(
      1,
      Math.ceil((new Date(`${trip.endDate}T18:00:00.000Z`).getTime() - new Date(`${trip.startDate}T09:00:00.000Z`).getTime()) / 86400000),
    ),
    requiredPeople: Math.max(2, Math.min(trip.maxParticipants, trip.maxParticipants - 1)),
    spotsFilledPercent: 0,
    expectations:
      trip.category === 'Luxury'
        ? ['Respect the itinerary', 'Be punctual for bookings', 'Keep shared spaces tidy']
        : trip.category === 'Adventure'
          ? ['Pack light', 'Be comfortable with flexible plans', 'Stay responsive in group chat']
          : trip.category === 'Nature'
            ? ['Leave no trace', 'Early starts for best views', 'Share transport logistics']
            : ['Split costs fairly', 'Keep the pace collaborative', 'Be flexible with plans'],
    travelerType:
      trip.category === 'Luxury'
        ? 'Comfort-focused Planner'
        : trip.category === 'Adventure'
          ? 'Spontaneous Explorer'
          : trip.category === 'Nature'
            ? 'Outdoors Enthusiast'
            : 'Budget-Savvy Traveler',
  }));

const loadUsers = async () => {
  const users = await User.find({ email: { $in: seedUserEmails } })
    .select('_id email userId firstName lastName isVerified')
    .lean();

  const userByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
  const missingEmails = seedUserEmails.filter((email) => !userByEmail.has(email));

  if (missingEmails.length > 0) {
    throw new Error(`Missing users for emails: ${missingEmails.join(', ')}`);
  }

  return {
    testUser: userByEmail.get('test1@gmail.com'),
    hirenUser: userByEmail.get('hiren@gmail.com'),
  };
};

const seedTrips = async () => {
  try {
    await mongoose.connect(mongoUri, { autoIndex: true });
    console.log(`Connected to MongoDB at ${mongoUri}`);

    const { testUser, hirenUser } = await loadUsers();

    const seededTrips = [
      ...buildTripsForUser(testUser, 'Test1 Host'),
      ...buildTripsForUser(hirenUser, 'Hiren Host'),
    ];

    await Post.deleteMany({
      authorKey: {
        $in: [
          (testUser.userId || testUser.email).toLowerCase(),
          (hirenUser.userId || hirenUser.email).toLowerCase(),
          testUser.email.toLowerCase(),
          hirenUser.email.toLowerCase(),
        ],
      },
      title: { $in: seededTrips.map((trip) => trip.title) },
    });

    await Trip.deleteMany({
      organizerId: { $in: [testUser._id, hirenUser._id] },
      title: { $in: seededTrips.map((trip) => trip.title) },
    });

    const postDocuments = seededTrips.map((trip) => {
      const _id = new mongoose.Types.ObjectId();
      return {
        _id,
        author: trip.author,
        authorKey: trip.authorKey,
        status: trip.status,
        title: trip.title,
        hostName: trip.hostName,
        isVerified: trip.isVerified,
        onlyVerifiedUsers: trip.onlyVerifiedUsers,
        imageUrl: trip.imageUrl,
        location: trip.location,
        cost: trip.cost,
        durationDays: trip.durationDays,
        requiredPeople: trip.requiredPeople,
        spotsFilledPercent: trip.spotsFilledPercent,
        expectations: trip.expectations,
        travelerType: trip.travelerType,
        startDate: trip.startDate,
        endDate: trip.endDate,
      };
    });

    const tripDocuments = seededTrips.map((trip, index) => ({
      _id: postDocuments[index]._id,
      organizerId: trip.organizerId,
      title: trip.title,
      description: trip.description,
      location: trip.location,
      imageUrl: trip.imageUrl,
      price: trip.price,
      category: trip.category,
      startDate: trip.startDate,
      endDate: trip.endDate,
      maxParticipants: trip.maxParticipants,
      participants: [],
    }));

    await Post.insertMany(postDocuments);
    const insertedTrips = await Trip.insertMany(tripDocuments);

    console.log(`Inserted ${insertedTrips.length} trips.`);
    console.log(`Created 15 trips and posts for ${testUser.email} and 15 trips and posts for ${hirenUser.email}.`);
  } catch (error) {
    console.error('Failed to seed trips:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

void seedTrips();
