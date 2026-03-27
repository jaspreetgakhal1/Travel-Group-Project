import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Expense } from './models/Expense.js';
import { Payment } from './models/Payment.js';
import { Transaction } from './models/Transaction.js';
import { Trip } from './models/Trip.js';
import { User } from './models/User.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/splitngo';
const targetEmails = ['test1@gmail.com', 'hiren@gmail.com'];
const dryRun = process.argv.includes('--dry-run');

const toObjectIdStrings = (value) =>
  Array.isArray(value) ? value.map((entry) => String(entry)) : [];

const main = async () => {
  await mongoose.connect(mongoUri, { autoIndex: true });

  const hostUsers = await User.find({
    email: { $in: targetEmails },
  })
    .select('_id email')
    .lean();

  if (hostUsers.length === 0) {
    console.log('No matching host users found.');
    return;
  }

  const hostIds = hostUsers.map((user) => user._id);
  const trips = await Trip.find({
    organizerId: { $in: hostIds },
  })
    .select('_id organizerId participants title')
    .lean();

  const tripIds = trips.map((trip) => trip._id);
  const affectedUserIds = Array.from(
    new Set([
      ...hostIds.map((id) => String(id)),
      ...trips.flatMap((trip) => toObjectIdStrings(trip.participants)),
    ]),
  );

  const [expenseCount, paymentCount, transactionCount] = await Promise.all([
    Expense.countDocuments({ tripId: { $in: tripIds } }),
    Payment.countDocuments({ tripId: { $in: tripIds } }),
    Transaction.countDocuments({ tripId: { $in: tripIds } }),
  ]);

  console.log(
    JSON.stringify(
      {
        dryRun,
        hostEmails: hostUsers.map((user) => user.email),
        hostedTripCount: trips.length,
        hostedTripTitles: trips.map((trip) => trip.title),
        expenseCount,
        paymentCount,
        transactionCount,
        affectedUserCount: affectedUserIds.length,
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    return;
  }

  await Promise.all([
    Expense.deleteMany({ tripId: { $in: tripIds } }),
    Payment.deleteMany({ tripId: { $in: tripIds } }),
    Transaction.deleteMany({ tripId: { $in: tripIds } }),
    User.updateMany(
      { _id: { $in: affectedUserIds.map((id) => new mongoose.Types.ObjectId(id)) } },
      { $set: { escrowBalance: 500 } },
    ),
  ]);

  console.log('Hosted trip split data cleared and affected user escrow balances reset to 500.00.');
};

main()
  .catch((error) => {
    console.error('Failed to reset hosted trip split data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
