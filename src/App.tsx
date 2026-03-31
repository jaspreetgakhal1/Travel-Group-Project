// Added by Codex: project documentation comment for src\App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  chatMessages,
  expenseCategories,
  initialCosts,
  navItems,
  type ExpenseCategory,
  type NavIcon,
} from './models/dashboardModel';
import { TRAVEL_DNA_DIMENSIONS, defaultUserDNA, normalizeTravelDNA, type UserDNA } from './models/dnaModel';
import { tripCatalog, type Trip } from './models/tripModel';
import { getMatchScore } from './utils/getMatchScore';
import {
  calculateEscrowSummary,
  releaseCheckInFunds,
  type EscrowSummary,
  type TripLifecycleStatus,
} from './utils/paymentProcessor';
import ChatInterfaceView from './views/ChatInterfaceView';
import MainFeed from './components/MainFeed';
import AnimatedAmount from './components/AnimatedAmount';
import ExpenseEmptyState from './components/ExpenseEmptyState';
import ExpenseItem from './components/ExpenseItem';
import ExpenseParticipantChecklist from './components/ExpenseParticipantChecklist';
import FloatingLabelField from './components/FloatingLabelField';
import LiquidSplitMeter from './components/LiquidSplitMeter';
import RequestModal from './components/RequestModal';
import Sidebar from './components/Sidebar';
import DiscoveryFeedView from './views/DiscoveryFeedView';
import type { FeedPost } from './types/feed';
import ExpenseTrackerView from './views/ExpenseTrackerView';
import DashboardView from './views/DashboardView';
import GroupChatView from './views/GroupChatView';
import HeroView from './views/HeroView';
import OnboardingQuizView from './views/OnboardingQuizView';
import ReviewSystemView from './views/ReviewSystemView';
import TripDetailView from './views/TripDetailView';
import VerificationGateView from './views/VerificationGateView';
import CreateTripView, { type CreateTripPayload } from './views/CreateTripView';
import AboutUsView from './views/AboutUsView';
import ContactUsView from './views/ContactUsView';
import {
  fetchUserProfile,
  loginWithCredentials,
  registerWithCredentials,
  updateTravelDNA,
  updateUserProfile,
  uploadVerificationDocument,
  type UpdateProfileRequest,
  type UserProfile,
} from './services/authApi';
import { fetchTripDNAMatch, type TripDNAMatch } from './services/matchApi';
import {
  createFeedPost,
  deleteFeedPost,
  fetchFeedPosts,
  fetchPostStats,
  updateFeedPost,
  updateFeedPostStatus,
  type PostStats,
} from './services/postApi';
import {
  deleteTripExpense,
  fetchActiveTripExpenseSummary,
  fetchWalletSummary,
  releaseWalletPayment,
  splitTripExpense,
  type TripExpenseSummary,
  updateTripExpense,
  type WalletSummary,
  type WalletSummaryEntry,
} from './services/expenseApi';
import {
  fetchSelfTrips,
  fetchTripRequests,
  reviewJoinRequest,
  submitJoinRequest,
  type HostTripRequest,
  type HostTripSummary,
  type JoinRequestStatus,
} from './services/tripRequestApi';
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Coins,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCircle2,
  Users,
  Wallet,
  WalletCards,
  X,
} from 'lucide-react';

const DEFAULT_INTRO_PERIOD_MS = 24 * 60 * 60 * 1000;
const configuredIntroPeriod = Number(import.meta.env.VITE_INTRO_PERIOD_MS);
const INTRO_PERIOD_MS =
  Number.isFinite(configuredIntroPeriod) && configuredIntroPeriod > 0
    ? configuredIntroPeriod
    : DEFAULT_INTRO_PERIOD_MS;

const AUTH_TOKEN_STORAGE_KEY = 'splitngo_auth_token';
const USER_SESSION_STORAGE_KEY = 'splitngo_user_session';
const POST_AUTH_REDIRECT_STORAGE_KEY = 'splitngo_post_auth_redirect';
const SYSTEM_NOTICE_AUTO_DISMISS_MS = 3000;

type ScreenName =
  | 'home'
  | 'discovery'
  | 'auth'
  | 'aboutUs'
  | 'contactUs'
  | 'createTrip'
  | 'editPost'
  | 'dashboard'
  | 'expenses'
  | 'chat'
  | 'tripDetails'
  | 'profile'
  | 'history'
  | 'wallet'
  | 'onboarding'
  | 'verification'
  | 'groupChat'
  | 'reviews';
type AuthMode = 'signin' | 'signup';
type ActiveView = 'feed' | 'myPosts' | 'dashboard';
type SocialProvider = 'Google' | 'Microsoft' | 'Facebook';

type AuthForm = {
  userId: string;
  password: string;
  confirmPassword: string;
};

type AuthErrors = {
  userId?: string;
  password?: string;
  confirmPassword?: string;
};

type UserSession = {
  id: string | null;
  name: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  email: string;
  profileImageDataUrl: string | null;
  provider: 'Email' | SocialProvider;
  dna: UserDNA | null;
  isVerified: boolean;
  toursCompleted: number;
  ratingAverage: number;
  ratingCount: number;
};

type ProfileForm = {
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  email: string;
  profileImageDataUrl: string | null;
};

type ProfileErrors = {
  firstName?: string;
  lastName?: string;
  countryCode?: string;
  mobileNumber?: string;
  email?: string;
  profileImageDataUrl?: string;
};

type EditableProfileField = 'firstName' | 'lastName' | 'countryCode' | 'email';

type CountryCodeOption = {
  value: string;
  label: string;
};

type PublicProfile = {
  name: string;
  toursCompleted: number;
  ratingAverage: number;
  ratingCount: number;
  isVerified: boolean;
};

type DNAMatchByPostId = Record<string, TripDNAMatch>;
type HostTripRequestsByTripId = Record<string, HostTripRequest[]>;
type HostRequestReviewStatus = Extract<JoinRequestStatus, 'accepted' | 'rejected'>;
type JoinConflictMessageByPostId = Record<string, string>;
type WalletPanel = 'payables' | 'release' | null;

type TripRuntime = {
  status: TripLifecycleStatus;
  introEndsAt: number | null;
  escrowSummary: EscrowSummary | null;
  hasReleasedCheckInFunds: boolean;
  hasReviewed: boolean;
};

const feedFillTargets = [60, 72, 48, 81, 56, 68];
const requiredPeopleTargets = [5, 4, 6, 5, 4, 7];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const US_MOBILE_PATTERN = /^\(\d{3}\)-\d{3}-\d{4}$/;
const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const MAX_VERIFICATION_DOCUMENT_BYTES = 5 * 1024 * 1024;
const countryCodeOptions: CountryCodeOption[] = [
  { value: '+1', label: 'US (+1)' },
  { value: '+44', label: 'UK (+44)' },
  { value: '+91', label: 'IN (+91)' },
  { value: '+61', label: 'AU (+61)' },
  { value: '+971', label: 'UAE (+971)' },
];
const EMPTY_POST_STATS: PostStats = {
  activeCount: 0,
  completedCount: 0,
  totalCount: 0,
};
const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  minimumFractionDigits: 2,
  style: 'currency',
});

const formatCurrency = (value: number) => currencyFormatter.format(value);
const TRIP_OVERLAP_NOTICE =
  'Logic Error: You are already committed to another trip during these dates. You cannot be in two places at once.';
const TRIP_OVERLAP_HELPER_TEXT = 'Conflicts with your already booked trip dates.';

const toDayStartTimestamp = (value: string | Date): number | null => {
  const parsedDate = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate.getTime();
};

const toDayEndTimestamp = (value: string | Date): number | null => {
  const parsedDate = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(23, 59, 59, 999);
  return parsedDate.getTime();
};

const getFeedPostDateRange = (post: Pick<FeedPost, 'startDate' | 'endDate'>): { start: number; end: number } | null => {
  const start = toDayStartTimestamp(post.startDate);
  const end = toDayEndTimestamp(post.endDate);

  if (start === null || end === null || end < start) {
    return null;
  }

  return { start, end };
};

const doFeedPostDatesOverlap = (leftPost: Pick<FeedPost, 'startDate' | 'endDate'>, rightPost: Pick<FeedPost, 'startDate' | 'endDate'>): boolean => {
  const leftDateRange = getFeedPostDateRange(leftPost);
  const rightDateRange = getFeedPostDateRange(rightPost);

  if (!leftDateRange || !rightDateRange) {
    return false;
  }

  return leftDateRange.start <= rightDateRange.end && leftDateRange.end >= rightDateRange.start;
};

const compareFeedPostsByMostRecentTrip = (
  leftPost: Pick<FeedPost, 'startDate' | 'endDate'>,
  rightPost: Pick<FeedPost, 'startDate' | 'endDate'>,
): number => {
  const leftStart = toDayStartTimestamp(leftPost.startDate) ?? 0;
  const rightStart = toDayStartTimestamp(rightPost.startDate) ?? 0;

  if (rightStart !== leftStart) {
    return rightStart - leftStart;
  }

  const leftEnd = toDayEndTimestamp(leftPost.endDate) ?? 0;
  const rightEnd = toDayEndTimestamp(rightPost.endDate) ?? 0;
  return rightEnd - leftEnd;
};

const createJourneyDateRange = (
  startJourneyDate: string,
  endJourneyDate: string,
): { startDate: Date; endDate: Date; durationDays: number } | null => {
  if (!startJourneyDate || !endJourneyDate) {
    return null;
  }

  const [startYear, startMonth, startDay] = startJourneyDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endJourneyDate.split('-').map(Number);

  if (
    !Number.isInteger(startYear) ||
    !Number.isInteger(startMonth) ||
    !Number.isInteger(startDay) ||
    !Number.isInteger(endYear) ||
    !Number.isInteger(endMonth) ||
    !Number.isInteger(endDay)
  ) {
    return null;
  }

  const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
  const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const durationDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerDay));

  return {
    startDate,
    endDate,
    durationDays,
  };
};

const findConflictingBookedTrip = (
  bookedPosts: FeedPost[],
  startDateValue: string | Date,
  endDateValue: string | Date,
  excludePostId?: string,
): FeedPost | null => {
  const candidatePost = {
    startDate: startDateValue instanceof Date ? startDateValue.toISOString() : startDateValue,
    endDate: endDateValue instanceof Date ? endDateValue.toISOString() : endDateValue,
  };

  return (
    bookedPosts.find(
      (bookedPost) => bookedPost.id !== excludePostId && doFeedPostDatesOverlap(bookedPost, candidatePost),
    ) ?? null
  );
};

const isFeedPostCurrentActive = (post: FeedPost, referenceDate = new Date()): boolean => {
  if (post.status !== 'Active') {
    return false;
  }

  const today = toDayStartTimestamp(referenceDate);
  const dateRange = getFeedPostDateRange(post);

  if (today === null || !dateRange) {
    return false;
  }

  return dateRange.start <= today && dateRange.end >= today;
};

const getEqualSplitShareAmount = (amount: number, participantCount: number): number => {
  if (!Number.isFinite(amount) || amount <= 0 || participantCount <= 0) {
    return 0;
  }

  const totalCents = Math.round(amount * 100);
  return Number((Math.floor(totalCents / participantCount) / 100).toFixed(2));
};

const formatMobileNumber = (rawValue: string): string => {
  const digits = rawValue.replace(/\D/g, '').slice(0, 10);
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);

  if (!digits) {
    return '';
  }

  if (digits.length <= 3) {
    return `(${area}`;
  }

  if (digits.length <= 6) {
    return `(${area})-${prefix}`;
  }

  return `(${area})-${prefix}-${line}`;
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Unable to read file contents.'));
    };
    reader.onerror = () => {
      reject(new Error('Unable to read file contents.'));
    };
    reader.readAsDataURL(file);
  });

const getTravelerType = (trip: Trip): string => {
  if (trip.tripDNA.riskAppetite >= 7 && trip.tripDNA.socialBattery >= 7) {
    return 'High-energy social explorers';
  }

  if (trip.tripDNA.planningStyle >= 7) {
    return 'Adventure-focused planners';
  }

  if (trip.tripDNA.socialBattery >= 7) {
    return 'Outgoing city connectors';
  }

  return 'Calm collaborative travelers';
};

const getRouteLabel = (route: string): string => {
  const stops = route
    .split('->')
    .map((stop) => stop.trim())
    .filter(Boolean);

  if (stops.length >= 2) {
    return `${stops[0]} to ${stops[stops.length - 1]}`;
  }

  return route;
};

const normalizeAuthorKey = (value: string): string => value.trim().toLowerCase();

const getSessionAuthorKeys = (session: UserSession | null): string[] => {
  if (!session) {
    return [];
  }

  const normalizedKeys = [session.email, session.name]
    .map((value) => (typeof value === 'string' ? normalizeAuthorKey(value) : ''))
    .filter(Boolean);

  return Array.from(new Set(normalizedKeys));
};

const getSessionAuthorKey = (session: UserSession | null): string | null => {
  return getSessionAuthorKeys(session)[0] ?? null;
};

const isMongoObjectId = (value: string): boolean => MONGO_OBJECT_ID_PATTERN.test(value);

const getDigitsOnly = (value?: string): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/\D/g, '');
};

const toWhatsAppPhone = (countryCode?: string, mobileNumber?: string): string => {
  const countryDigits = getDigitsOnly(countryCode);
  const mobileDigits = getDigitsOnly(mobileNumber);

  if (!mobileDigits) {
    return '';
  }

  if (countryDigits && mobileDigits.startsWith(countryDigits)) {
    return mobileDigits;
  }

  return `${countryDigits}${mobileDigits}`;
};

const getLocalConflictHint = (viewerDNA: UserDNA, organizerDNA: UserDNA): string => {
  const strongestGap = TRAVEL_DNA_DIMENSIONS.map(({ key }) => ({
    key,
    gap: Math.abs(viewerDNA[key] - organizerDNA[key]),
  })).sort((left, right) => right.gap - left.gap)[0];

  if (!strongestGap || strongestGap.gap < 4) {
    return 'Minor differences only. Core travel vibe is mostly aligned.';
  }

  if (strongestGap.key === 'morningSync') {
    const viewerIsEarlyBird = viewerDNA.morningSync >= organizerDNA.morningSync;
    return viewerIsEarlyBird
      ? 'Morning person vs. night owl scheduling mismatch.'
      : 'Night owl vs. early riser scheduling mismatch.';
  }

  if (strongestGap.key === 'budgetFlexibility') {
    return 'Budget style conflict: saver mindset vs. flexible spender.';
  }

  if (strongestGap.key === 'planningStyle') {
    return 'Planning conflict: structured planner vs. spontaneous explorer.';
  }

  if (strongestGap.key === 'riskAppetite') {
    return 'Risk mismatch: adventure-seeking vs. safety-first decisions.';
  }

  if (strongestGap.key === 'cleanliness') {
    return 'Cleanliness expectations are far apart for shared spaces.';
  }

  return 'Social battery mismatch: one prefers quiet time while the other prefers constant group activity.';
};

const toCreateTripPayloadFromFeedPost = (post: FeedPost): CreateTripPayload => ({
  posterImageUrls: post.imageUrl ? [post.imageUrl] : [],
  peopleRequired: post.requiredPeople,
  budget: post.cost,
  expectations: post.expectations,
  interestedIn: 'Unspecified',
  onlyVerifiedUsers: post.onlyVerifiedUsers,
  startJourneyDate: typeof post.startDate === 'string' ? post.startDate.slice(0, 10) : '',
  endJourneyDate: typeof post.endDate === 'string' ? post.endDate.slice(0, 10) : '',
  location: post.location,
  travelerType: post.travelerType,
});

const toRuntimeTripFromFeedPost = (post: FeedPost): Trip => ({
  id: post.id,
  hostId: post.hostId,
  title: post.title,
  hostName: post.hostName,
  hostCountryCode: post.hostCountryCode,
  hostMobileNumber: post.hostMobileNumber,
  priceShare: post.cost,
  matchPercentage: 100,
  tripDNA: normalizeTravelDNA(defaultUserDNA),
  imageUrl: post.imageUrl,
  isVerified: post.isVerified,
  route: post.location,
  duration: `${post.durationDays} Days`,
  totalExpectedFromPartner: post.cost * post.requiredPeople,
  partnerExpectations: post.expectations,
  notes: 'Runtime trip generated from feed post for group chat access.',
  highlights: post.expectations.slice(0, 3),
});

const createInitialFeedPosts = (): FeedPost[] => {
  const startAnchor = new Date();
  startAnchor.setHours(0, 0, 0, 0);
  startAnchor.setDate(startAnchor.getDate() + 9);

  return tripCatalog.map((trip, index) => {
    const durationDays = Number.parseInt(trip.duration, 10) || 7;
    const startDate = new Date(startAnchor);
    startDate.setDate(startAnchor.getDate() + index * 8);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays - 1);

    return {
      id: trip.id,
      hostId: trip.hostId,
      hostCountryCode: trip.hostCountryCode,
      hostMobileNumber: trip.hostMobileNumber,
      authorKey: trip.hostName.trim().toLowerCase(),
      status: 'Active',
      onlyVerifiedUsers: false,
      title: trip.title,
      hostName: trip.hostName,
      isVerified: trip.isVerified,
      imageUrl: trip.imageUrl,
      location: getRouteLabel(trip.route),
      cost: trip.priceShare,
      durationDays,
      requiredPeople: requiredPeopleTargets[index % requiredPeopleTargets.length],
      maxParticipants: requiredPeopleTargets[index % requiredPeopleTargets.length],
      spotsFilled: Math.round(
        (feedFillTargets[index % feedFillTargets.length] / 100) * requiredPeopleTargets[index % requiredPeopleTargets.length],
      ),
      spotsFilledPercent: feedFillTargets[index % feedFillTargets.length],
      participantIds: [],
      expectations: trip.partnerExpectations,
      travelerType: getTravelerType(trip),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  });
};

const splitDisplayName = (displayName: string): { firstName: string; lastName: string } => {
  const cleanedName = displayName.trim();
  if (!cleanedName) {
    return { firstName: '', lastName: '' };
  }

  const [firstName = '', ...lastNameParts] = cleanedName.split(/\s+/);
  return {
    firstName,
    lastName: lastNameParts.join(' '),
  };
};

const getDisplayName = (firstName: string, lastName: string, fallback = 'Traveler'): string => {
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  return fullName || fallback;
};

const createProfileForm = (session: UserSession | null): ProfileForm => ({
  firstName: session?.firstName ?? '',
  lastName: session?.lastName ?? '',
  countryCode: session?.countryCode ?? countryCodeOptions[0].value,
  mobileNumber: session?.mobileNumber ?? '',
  email: session?.email ?? '',
  profileImageDataUrl: session?.profileImageDataUrl ?? null,
});

const profileToForm = (profile: UserProfile): ProfileForm => ({
  firstName: profile.firstName,
  lastName: profile.lastName,
  countryCode: profile.countryCode,
  mobileNumber: profile.mobileNumber,
  email: profile.email,
  profileImageDataUrl: profile.profileImageDataUrl,
});

const mergeSessionWithProfile = (
  session: UserSession,
  profile: UserProfile,
  isVerified: boolean,
): UserSession => {
  const nextFirstName = profile.firstName.trim();
  const nextLastName = profile.lastName.trim();
  const fallbackName = session.name || session.email || session.firstName || 'Traveler';

  return {
    ...session,
    name: getDisplayName(nextFirstName, nextLastName, fallbackName),
    firstName: nextFirstName,
    lastName: nextLastName,
    countryCode: profile.countryCode || session.countryCode,
    mobileNumber: profile.mobileNumber,
    email: profile.email,
    profileImageDataUrl: profile.profileImageDataUrl,
    dna: profile.travelDNA ? normalizeTravelDNA(profile.travelDNA) : session.dna,
    isVerified,
  };
};

const getStoredUserSession = (): UserSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(USER_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserSession>;
    if (!parsed) {
      return null;
    }

    const provider = parsed.provider;
    if (provider !== 'Email' && provider !== 'Google' && provider !== 'Microsoft' && provider !== 'Facebook') {
      return null;
    }

    const persistedName = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    const persistedFirstName = typeof parsed.firstName === 'string' ? parsed.firstName.trim() : '';
    const persistedLastName = typeof parsed.lastName === 'string' ? parsed.lastName.trim() : '';
    const fallbackName = persistedName || `${persistedFirstName} ${persistedLastName}`.trim();
    if (!fallbackName) {
      return null;
    }

    const derivedNameParts = splitDisplayName(fallbackName);
    const firstName = persistedFirstName || derivedNameParts.firstName || 'Traveler';
    const lastName = persistedLastName || derivedNameParts.lastName;
    const countryCode =
      typeof parsed.countryCode === 'string' && countryCodeOptions.some((option) => option.value === parsed.countryCode)
        ? parsed.countryCode
        : countryCodeOptions[0].value;
    const id = typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id : null;
    const mobileNumber = typeof parsed.mobileNumber === 'string' ? parsed.mobileNumber : '';
    const email = typeof parsed.email === 'string' ? parsed.email : '';
    const profileImageDataUrl = typeof parsed.profileImageDataUrl === 'string' ? parsed.profileImageDataUrl : null;

    return {
      id,
      name: getDisplayName(firstName, lastName, fallbackName),
      firstName,
      lastName,
      countryCode,
      mobileNumber,
      email,
      profileImageDataUrl,
      provider,
      dna: parsed.dna ? normalizeTravelDNA(parsed.dna) : null,
      isVerified: Boolean(parsed.isVerified),
      toursCompleted: typeof parsed.toursCompleted === 'number' ? parsed.toursCompleted : 0,
      ratingAverage: typeof parsed.ratingAverage === 'number' ? parsed.ratingAverage : 0,
      ratingCount: typeof parsed.ratingCount === 'number' ? parsed.ratingCount : 0,
    };
  } catch {
    return null;
  }
};

const createSession = (name: string, provider: 'Email' | SocialProvider): UserSession => {
  const cleanedName = name.trim();
  const { firstName: rawFirstName, lastName: rawLastName } = splitDisplayName(cleanedName);
  const firstName = rawFirstName || cleanedName || 'Traveler';
  const lastName = rawLastName;

  return {
    id: null,
    name: getDisplayName(firstName, lastName, cleanedName || 'Traveler'),
    firstName,
    lastName,
    countryCode: countryCodeOptions[0].value,
    mobileNumber: '',
    email: '',
    profileImageDataUrl: null,
    provider,
    dna: null,
    isVerified: false,
    toursCompleted: 0,
    ratingAverage: 0,
    ratingCount: 0,
  };
};

const clearStoredAuthState = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
};

const createInitialTripRuntime = (): Record<string, TripRuntime> =>
  tripCatalog.reduce<Record<string, TripRuntime>>((accumulator, trip) => {
    accumulator[trip.id] = {
      status: 'Open',
      introEndsAt: null,
      escrowSummary: null,
      hasReleasedCheckInFunds: false,
      hasReviewed: false,
    };
    return accumulator;
  }, {});

const createInitialPublicProfiles = (): Record<string, PublicProfile> =>
  tripCatalog.reduce<Record<string, PublicProfile>>((accumulator, trip) => {
    if (!accumulator[trip.hostName]) {
      accumulator[trip.hostName] = {
        name: trip.hostName,
        toursCompleted: 4,
        ratingAverage: 4.6,
        ratingCount: 8,
        isVerified: trip.isVerified,
      };
    }
    return accumulator;
  }, {});

const updateAverageRating = (
  currentAverage: number,
  currentCount: number,
  newRating: number,
): { nextAverage: number; nextCount: number } => {
  const nextCount = currentCount + 1;
  const nextAverage = Number(((currentAverage * currentCount + newRating) / nextCount).toFixed(2));
  return { nextAverage, nextCount };
};

const renderSidebarIcon = (icon: NavIcon): React.ReactNode => {
  if (icon === 'trips') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 8l9-5 9 5-9 5-9-5z" />
        <path d="M3 16l9 5 9-5" />
        <path d="M3 12l9 5 9-5" />
      </svg>
    );
  }

  if (icon === 'safety') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
        <path d="M9.5 12.5l1.8 1.8 3.4-3.8" />
      </svg>
    );
  }

  if (icon === 'wallet') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M16 12h3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 12a8 8 0 1116 0v4a2 2 0 01-2 2h-2v-5h4" />
      <path d="M4 18h4v-5H4" />
    </svg>
  );
};

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [activeView, setActiveView] = useState<ActiveView>('feed');
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory>('Transport');
  const [costs, setCosts] = useState<Record<ExpenseCategory, number>>(initialCosts);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [activeGroupTripId, setActiveGroupTripId] = useState<string | null>(null);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [editingFeedPost, setEditingFeedPost] = useState<FeedPost | null>(null);
  const [dnaMatchByPostId, setDnaMatchByPostId] = useState<DNAMatchByPostId>({});
  const [dnaMatchLoadingPostIds, setDnaMatchLoadingPostIds] = useState<string[]>([]);
  const [sentRequestPostIds, setSentRequestPostIds] = useState<string[]>([]);
  const [selfTripSummaries, setSelfTripSummaries] = useState<HostTripSummary[]>([]);
  const [pendingRequestCountByTripId, setPendingRequestCountByTripId] = useState<Record<string, number>>({});
  const [hostRequestsByTripId, setHostRequestsByTripId] = useState<HostTripRequestsByTripId>({});
  const [activeRequestModalPost, setActiveRequestModalPost] = useState<FeedPost | null>(null);
  const [isRequestModalLoading, setIsRequestModalLoading] = useState(false);
  const [isRequestActionInProgress, setIsRequestActionInProgress] = useState(false);
  const [userCreatedTrips, setUserCreatedTrips] = useState<Trip[]>([]);
  const [postStats, setPostStats] = useState<PostStats>(EMPTY_POST_STATS);
  const [isPostActionInProgress, setIsPostActionInProgress] = useState(false);
  const [splitExpenseDescription, setSplitExpenseDescription] = useState('');
  const [splitExpenseAmount, setSplitExpenseAmount] = useState('');
  const [selectedSplitDebtorIds, setSelectedSplitDebtorIds] = useState<string[]>([]);
  const [tripExpenseSummary, setTripExpenseSummary] = useState<TripExpenseSummary | null>(null);
  const [tripExpenseError, setTripExpenseError] = useState('');
  const [isTripExpenseLoading, setIsTripExpenseLoading] = useState(false);
  const [isTripExpenseSubmitting, setIsTripExpenseSubmitting] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpenseDescription, setEditingExpenseDescription] = useState('');
  const [editingExpenseAmount, setEditingExpenseAmount] = useState('');
  const [editingExpenseDebtorIds, setEditingExpenseDebtorIds] = useState<string[]>([]);
  const [isExpenseUpdateSubmitting, setIsExpenseUpdateSubmitting] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isSplitExpenseSuccessVisible, setIsSplitExpenseSuccessVisible] = useState(false);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [activeWalletPanel, setActiveWalletPanel] = useState<WalletPanel>(null);
  const [walletReleaseKey, setWalletReleaseKey] = useState<string | null>(null);
  const [walletReleaseEntry, setWalletReleaseEntry] = useState<WalletSummaryEntry | null>(null);
  const [walletReleaseAmount, setWalletReleaseAmount] = useState('');

  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authForm, setAuthForm] = useState<AuthForm>({ userId: '', password: '', confirmPassword: '' });
  const [authErrors, setAuthErrors] = useState<AuthErrors>({});
  const [authMessage, setAuthMessage] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [hydratedProfileToken, setHydratedProfileToken] = useState<string | null>(null);
  const [systemNotice, setSystemNotice] = useState<string>('');
  const [postAuthRedirectScreen, setPostAuthRedirectScreen] = useState<ScreenName | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const storedRedirect = window.sessionStorage.getItem(POST_AUTH_REDIRECT_STORAGE_KEY);
    return storedRedirect === 'createTrip' ? 'createTrip' : null;
  });

  const [userSession, setUserSession] = useState<UserSession | null>(() => getStoredUserSession());
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>(() => createProfileForm(getStoredUserSession()));
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [verificationDocumentFile, setVerificationDocumentFile] = useState<File | null>(null);
  const [verificationDocumentError, setVerificationDocumentError] = useState('');
  const [isVerificationUploading, setIsVerificationUploading] = useState(false);

  const [, setPublicProfiles] = useState<Record<string, PublicProfile>>(() =>
    createInitialPublicProfiles(),
  );
  const [tripRuntimeById, setTripRuntimeById] = useState<Record<string, TripRuntime>>(() =>
    createInitialTripRuntime(),
  );

  const [isEmergencyAlertActive, setIsEmergencyAlertActive] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const currentUserAuthorKey = useMemo(() => getSessionAuthorKey(userSession), [userSession]);
  const userProfileImageSrc = useMemo(() => {
    if (typeof userSession?.profileImageDataUrl !== 'string') {
      return null;
    }

    const normalizedValue = userSession.profileImageDataUrl.trim();
    return normalizedValue || null;
  }, [userSession?.profileImageDataUrl]);
  const authToken = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const storedToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (typeof storedToken !== 'string') {
      return null;
    }

    const normalizedToken = storedToken.trim();
    return normalizedToken || null;
  }, [userSession?.id, userSession?.email]);
  const normalizedCurrentUserAuthorKey = useMemo(
    () => (currentUserAuthorKey ? normalizeAuthorKey(currentUserAuthorKey) : null),
    [currentUserAuthorKey],
  );
  const selfTripIdSet = useMemo(() => new Set(selfTripSummaries.map((trip) => trip.id)), [selfTripSummaries]);
  const mainFeedPosts = useMemo(() => {
    return feedPosts
      .filter((post) => {
        if (post.status !== 'Active') {
          return false;
        }

        const isOwnPostByAuthor =
          normalizedCurrentUserAuthorKey !== null && normalizeAuthorKey(post.authorKey) === normalizedCurrentUserAuthorKey;
        const isOwnPostById = selfTripIdSet.has(post.id);
        const isOwnPostByHostId = Boolean(userSession?.id && post.hostId && post.hostId === userSession.id);
        return !(isOwnPostByAuthor || isOwnPostById || isOwnPostByHostId);
      })
      .sort(compareFeedPostsByMostRecentTrip);
  }, [feedPosts, normalizedCurrentUserAuthorKey, selfTripIdSet, userSession?.id]);
  const myFeedPosts = useMemo(() => {
    const filteredPosts = feedPosts.filter((post) => {
      if (post.status !== 'Active') {
        return false;
      }

      const isOwnPostByAuthor =
        normalizedCurrentUserAuthorKey !== null && normalizeAuthorKey(post.authorKey) === normalizedCurrentUserAuthorKey;
      const isOwnPostById = selfTripIdSet.has(post.id);
      const isOwnPostByHostId = Boolean(userSession?.id && post.hostId && post.hostId === userSession.id);
      return isOwnPostByAuthor || isOwnPostById || isOwnPostByHostId;
    });

    return filteredPosts
      .map((post) => ({
        ...post,
        pendingRequestCount: pendingRequestCountByTripId[post.id] ?? post.pendingRequestCount ?? 0,
      }))
      .sort(compareFeedPostsByMostRecentTrip);
  }, [feedPosts, normalizedCurrentUserAuthorKey, pendingRequestCountByTripId, selfTripIdSet, userSession?.id]);
  const archivedMyPosts = useMemo(() => {
    return feedPosts
      .filter((post) => {
        if (post.status !== 'Completed') {
          return false;
        }

        const isOwnPostByAuthor =
          normalizedCurrentUserAuthorKey !== null && normalizeAuthorKey(post.authorKey) === normalizedCurrentUserAuthorKey;
        const isOwnPostById = selfTripIdSet.has(post.id);
        const isOwnPostByHostId = Boolean(userSession?.id && post.hostId && post.hostId === userSession.id);
        return isOwnPostByAuthor || isOwnPostById || isOwnPostByHostId;
      })
      .sort(compareFeedPostsByMostRecentTrip);
  }, [feedPosts, normalizedCurrentUserAuthorKey, selfTripIdSet, userSession?.id]);
  const bookedTripPosts = useMemo(() => {
    const currentUserId = userSession?.id;
    const currentAuthorKey = normalizedCurrentUserAuthorKey;

    return feedPosts.filter((post, index, collection) => {
      if (post.status !== 'Active') {
        return false;
      }

      const isOwnPostByAuthor = currentAuthorKey !== null && normalizeAuthorKey(post.authorKey) === currentAuthorKey;
      const isOwnPostByHostId = Boolean(currentUserId && post.hostId && post.hostId === currentUserId);
      const isParticipant = Boolean(currentUserId && post.participantIds.includes(currentUserId));

      if (!isOwnPostByAuthor && !isOwnPostByHostId && !isParticipant) {
        return false;
      }

      return collection.findIndex((candidate) => candidate.id === post.id) === index;
    });
  }, [feedPosts, normalizedCurrentUserAuthorKey, userSession?.id]);
  const joinConflictMessageByPostId = useMemo<JoinConflictMessageByPostId>(() => {
    const currentUserId = userSession?.id;
    const currentAuthorKey = normalizedCurrentUserAuthorKey;

    if (!currentUserId && !currentAuthorKey) {
      return {};
    }

    return mainFeedPosts.reduce<JoinConflictMessageByPostId>((accumulator, post) => {
      const isOwnPostByAuthor = currentAuthorKey !== null && normalizeAuthorKey(post.authorKey) === currentAuthorKey;
      const isOwnPostByHostId = Boolean(currentUserId && post.hostId && post.hostId === currentUserId);
      const isParticipant = Boolean(currentUserId && post.participantIds.includes(currentUserId));

      if (isOwnPostByAuthor || isOwnPostByHostId || isParticipant) {
        return accumulator;
      }

      const conflictingBooking = findConflictingBookedTrip(bookedTripPosts, post.startDate, post.endDate, post.id);
      if (conflictingBooking) {
        accumulator[post.id] = TRIP_OVERLAP_HELPER_TEXT;
      }

      return accumulator;
    }, {});
  }, [bookedTripPosts, mainFeedPosts, normalizedCurrentUserAuthorKey, userSession?.id]);
  const myPostConflictMessageByPostId = useMemo<JoinConflictMessageByPostId>(() => {
    return myFeedPosts.reduce<JoinConflictMessageByPostId>((accumulator, post) => {
      const conflictingBooking = findConflictingBookedTrip(bookedTripPosts, post.startDate, post.endDate, post.id);
      if (conflictingBooking) {
        accumulator[post.id] = TRIP_OVERLAP_HELPER_TEXT;
      }

      return accumulator;
    }, {});
  }, [bookedTripPosts, myFeedPosts]);
  const activeMyPostIds = useMemo(
    () => new Set(myFeedPosts.filter((post) => isFeedPostCurrentActive(post)).map((post) => post.id)),
    [myFeedPosts],
  );
  const loadActiveFeedPosts = async (
    showFallbackNotice = true,
    overrides?: {
      viewerVerified?: boolean;
      viewerAuthorKey?: string | null;
    },
  ) => {
    const viewerVerified = overrides?.viewerVerified ?? Boolean(userSession?.isVerified);
    const viewerAuthorKey =
      typeof overrides?.viewerAuthorKey === 'string' || overrides?.viewerAuthorKey === null
        ? overrides.viewerAuthorKey
        : getSessionAuthorKey(userSession);

    try {
      const posts = await fetchFeedPosts({
        viewerVerified,
        viewerAuthorKey,
        status: 'all',
      });
      setFeedPosts(posts);
    } catch (error) {
      setFeedPosts(createInitialFeedPosts());
      if (showFallbackNotice) {
        const message = error instanceof Error ? error.message : 'Unable to load posts from database.';
        setSystemNotice(`${message} Showing demo posts.`);
      }
    }
  };

  const loadPostStatsFromDatabase = async (authorKey: string | null) => {
    if (!authorKey) {
      setPostStats(EMPTY_POST_STATS);
      return;
    }

    try {
      const stats = await fetchPostStats(authorKey);
      setPostStats(stats);
    } catch {
      setPostStats(EMPTY_POST_STATS);
    }
  };

  const syncOwnPostsVerificationStatus = (
    authorKeys: string[] | null | undefined,
    userId: string | null | undefined,
    isVerified: boolean,
  ) => {
    const normalizedAuthorKeys = Array.from(
      new Set(
        (authorKeys ?? [])
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .map((value) => normalizeAuthorKey(value)),
      ),
    );

    if (normalizedAuthorKeys.length === 0 && !userId) {
      return;
    }

    setFeedPosts((previous) =>
      previous.map((post) => {
        const normalizedPostAuthorKey =
          typeof post.authorKey === 'string' && post.authorKey.trim() ? normalizeAuthorKey(post.authorKey) : '';
        const postAuthorId =
          typeof post.author === 'object' && post.author !== null && typeof post.author.id === 'string'
            ? post.author.id
            : null;
        const matchesAuthorKey = normalizedPostAuthorKey ? normalizedAuthorKeys.includes(normalizedPostAuthorKey) : false;
        const matchesHostId = Boolean(userId && post.hostId && post.hostId === userId);
        const matchesAuthorId = Boolean(userId && postAuthorId && postAuthorId === userId);

        if (!matchesAuthorKey && !matchesHostId && !matchesAuthorId) {
          return post;
        }

        const nextAuthor =
          typeof post.author === 'object' && post.author !== null ? { ...post.author, isVerified } : post.author;

        return {
          ...post,
          isVerified,
          author: nextAuthor,
        };
      }),
    );
  };

  const loadSelfTripsForHost = async () => {
    const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!authToken) {
      setSelfTripSummaries([]);
      setPendingRequestCountByTripId({});
      setHostRequestsByTripId({});
      return;
    }

    try {
      const hostTrips = await fetchSelfTrips(authToken);
      setSelfTripSummaries(hostTrips);
      setPendingRequestCountByTripId(
        hostTrips.reduce<Record<string, number>>((accumulator, trip) => {
          accumulator[trip.id] = trip.pendingRequestCount;
          return accumulator;
        }, {}),
      );
    } catch {
      // Keep local feed fallback when /api/trips/self is not available.
    }
  };

  const loadProfileFromDatabase = async (authToken: string, baseSession: UserSession): Promise<UserSession> => {
    const profileResponse = await fetchUserProfile(authToken);
    return mergeSessionWithProfile(
      baseSession,
      profileResponse.profile,
      Boolean(profileResponse.user.isVerified),
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      setCurrentScreen('auth');
      setSystemNotice(`Google login failed: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (!code) {
      return;
    }

    const expectedState = sessionStorage.getItem('google_oauth_state');
    if (expectedState && expectedState !== state) {
      setCurrentScreen('auth');
      setSystemNotice('Google login failed: state mismatch.');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const redirectTarget = postAuthRedirectScreen;
    setPostAuthRedirectScreen(null);
    setUserSession(createSession('Google User', 'Google'));
    setActiveView('feed');
    setCurrentScreen(redirectTarget === 'createTrip' ? 'createTrip' : 'home');
    setSystemNotice(
      redirectTarget === 'createTrip'
        ? 'Google login successful. Continue creating your trip.'
        : 'Google login successful. Your Main Feed is ready.',
    );
    sessionStorage.removeItem('google_oauth_state');
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [postAuthRedirectScreen]);

  useEffect(() => {
    if (!systemNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSystemNotice('');
    }, SYSTEM_NOTICE_AUTO_DISMISS_MS);

    return () => window.clearTimeout(timeoutId);
  }, [systemNotice]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!postAuthRedirectScreen) {
      window.sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(POST_AUTH_REDIRECT_STORAGE_KEY, postAuthRedirectScreen);
  }, [postAuthRedirectScreen]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!userSession) {
      window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(userSession));
  }, [userSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!userSession) {
      setHydratedProfileToken(null);
      return;
    }

    const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!authToken || hydratedProfileToken === authToken) {
      return;
    }

    let isActive = true;

    const hydrateProfile = async () => {
      try {
        const nextSession = await loadProfileFromDatabase(authToken, userSession);
        if (!isActive) {
          return;
        }
        setUserSession(nextSession);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const isUnauthorized = error instanceof Error && error.message === 'Unauthorized request.';
        if (isUnauthorized && userSession.provider === 'Email') {
          clearStoredAuthState();
          setUserSession(null);
          setSystemNotice('Your session expired. Please sign in again.');
          setCurrentScreen('auth');
          return;
        }
      } finally {
        if (isActive) {
          setHydratedProfileToken(authToken);
        }
      }
    };

    void hydrateProfile();

    return () => {
      isActive = false;
    };
  }, [hydratedProfileToken, userSession]);

  useEffect(() => {
    if (!userSession) {
      setProfileForm(createProfileForm(null));
      setProfileErrors({});
      setIsProfileEditing(false);
      setIsProfileSaving(false);
      setVerificationDocumentFile(null);
      setVerificationDocumentError('');
      setWalletSummary(null);
      setWalletError('');
      setActiveWalletPanel(null);
      setWalletReleaseKey(null);
      setWalletReleaseEntry(null);
      setWalletReleaseAmount('');
      setTripExpenseSummary(null);
      setTripExpenseError('');
      setSelectedSplitDebtorIds([]);
      setEditingExpenseId(null);
      setEditingExpenseDescription('');
      setEditingExpenseAmount('');
      setEditingExpenseDebtorIds([]);
      setIsExpenseUpdateSubmitting(false);
      setDeletingExpenseId(null);
      setIsSplitExpenseSuccessVisible(false);
      return;
    }

    if (!isProfileEditing) {
      setProfileForm(createProfileForm(userSession));
      setProfileErrors({});
    }
  }, [isProfileEditing, userSession]);

  useEffect(() => {
    void loadActiveFeedPosts();
  }, [userSession?.isVerified, userSession?.email, userSession?.name]);

  useEffect(() => {
    void loadPostStatsFromDatabase(currentUserAuthorKey);
  }, [currentUserAuthorKey]);

  useEffect(() => {
    if (activeView !== 'myPosts' || !userSession) {
      return;
    }

    void loadSelfTripsForHost();
  }, [activeView, userSession?.id, userSession?.email, userSession?.name]);

  useEffect(() => {
    const currentAuthToken =
      typeof window === 'undefined' ? authToken : window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim() || authToken;

    if (currentScreen !== 'wallet' || !currentAuthToken) {
      return;
    }

    let isActive = true;
    setIsTripExpenseLoading(true);
    setTripExpenseError('');

    void fetchActiveTripExpenseSummary(currentAuthToken)
      .then((summary) => {
        if (isActive) {
          setTripExpenseSummary(summary);
        }
      })
      .catch((error) => {
        if (isActive) {
          const isUnauthorized = error instanceof Error && error.message === 'Unauthorized request.';
          if (isUnauthorized) {
            clearStoredAuthState();
            setUserSession(null);
            setSystemNotice('Your session expired. Please sign in again.');
            setCurrentScreen('auth');
            return;
          }

          setTripExpenseSummary(null);
          const message = error instanceof Error ? error.message : 'Unable to load split expenses for your active trip.';
          if (message === 'No active trip is available for expense splitting right now.') {
            setTripExpenseError('');
            return;
          }

          setTripExpenseError(message);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsTripExpenseLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [authToken, currentScreen]);

  useEffect(() => {
    if (!tripExpenseSummary || !userSession?.id) {
      setSelectedSplitDebtorIds([]);
      return;
    }

    setSelectedSplitDebtorIds(
      tripExpenseSummary.members
        .filter((member) => member.id !== userSession.id)
        .map((member) => member.id),
    );
  }, [tripExpenseSummary?.trip.id, tripExpenseSummary?.members, userSession?.id]);

  useEffect(() => {
    if (!isSplitExpenseSuccessVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSplitExpenseSuccessVisible(false);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [isSplitExpenseSuccessVisible]);

  useEffect(() => {
    if (!editingExpenseId || !tripExpenseSummary) {
      return;
    }

    const matchingExpense = tripExpenseSummary.expenses.find((expense) => expense.id === editingExpenseId);
    if (!matchingExpense) {
      handleCloseExpenseEdit();
    }
  }, [editingExpenseId, tripExpenseSummary]);

  useEffect(() => {
    const currentAuthToken =
      typeof window === 'undefined' ? authToken : window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim() || authToken;

    if (currentScreen !== 'wallet' || !currentAuthToken) {
      return;
    }

    let isActive = true;
    setIsWalletLoading(true);
    setWalletError('');

    void fetchWalletSummary(currentAuthToken)
      .then((summary) => {
        if (isActive) {
          setWalletSummary(summary);
        }
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        const isUnauthorized = error instanceof Error && error.message === 'Unauthorized request.';
        if (isUnauthorized) {
          clearStoredAuthState();
          setHydratedProfileToken(null);
          setUserSession(null);
          setCurrentScreen('auth');
          setSystemNotice('Your session expired. Please sign in again.');
          return;
        }

        setWalletSummary(null);
        setWalletError(error instanceof Error ? error.message : 'Unable to load wallet summary right now.');
      })
      .finally(() => {
        if (isActive) {
          setIsWalletLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [authToken, currentScreen]);

  useEffect(() => {
    if (!userSession || feedPosts.length === 0) {
      setDnaMatchByPostId({});
      setDnaMatchLoadingPostIds([]);
      return;
    }

    const viewerDNA = normalizeTravelDNA(userSession.dna ?? defaultUserDNA);
    const localTripMatches = feedPosts.reduce<DNAMatchByPostId>((accumulator, post) => {
      const catalogTrip = tripCatalog.find((trip) => trip.id === post.id);
      if (!catalogTrip) {
        return accumulator;
      }

      const organizerDNA = normalizeTravelDNA(catalogTrip.tripDNA);
      accumulator[post.id] = {
        tripId: post.id,
        matchPercentage: getMatchScore(viewerDNA, organizerDNA),
        organizerName: catalogTrip.hostName,
        viewerDNA,
        organizerDNA,
        conflictHint: getLocalConflictHint(viewerDNA, organizerDNA),
      };
      return accumulator;
    }, {});

    const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    const candidatePostIds = feedPosts.map((post) => post.id).filter((postId) => isMongoObjectId(postId));
    if (!authToken || candidatePostIds.length === 0) {
      setDnaMatchByPostId(localTripMatches);
      setDnaMatchLoadingPostIds([]);
      return;
    }

    let isActive = true;
    setDnaMatchLoadingPostIds(candidatePostIds);

    const loadDNAMatches = async () => {
      const settledMatches = await Promise.all(
        candidatePostIds.map(async (postId) => {
          try {
            const match = await fetchTripDNAMatch(postId, authToken);
            return { postId, match };
          } catch {
            return null;
          }
        }),
      );

      if (!isActive) {
        return;
      }

      const nextMap = settledMatches.reduce<DNAMatchByPostId>((accumulator, currentValue) => {
        if (!currentValue) {
          return accumulator;
        }

        accumulator[currentValue.postId] = currentValue.match;
        return accumulator;
      }, { ...localTripMatches });

      setDnaMatchByPostId(nextMap);
      setDnaMatchLoadingPostIds([]);
    };

    void loadDNAMatches();

    return () => {
      isActive = false;
    };
  }, [feedPosts, userSession]);

  const allTrips = useMemo(() => [...userCreatedTrips, ...tripCatalog], [userCreatedTrips]);

  const matchedTrips = useMemo(
    () =>
      allTrips.map((trip) => ({
        trip,
        matchScore: userSession?.dna ? getMatchScore(userSession.dna, trip.tripDNA) : trip.matchPercentage,
      })),
    [allTrips, userSession?.dna],
  );

  const activeGroupTrip = useMemo(() => {
    if (!activeGroupTripId) {
      return null;
    }
    return allTrips.find((trip) => trip.id === activeGroupTripId) ?? null;
  }, [activeGroupTripId, allTrips]);

  const activeGroupRuntime = useMemo(() => {
    if (!activeGroupTripId) {
      return null;
    }
    return tripRuntimeById[activeGroupTripId] ?? null;
  }, [activeGroupTripId, tripRuntimeById]);

  const escrowStats = useMemo(
    () => ({
      totalPaid: Number((walletSummary?.paidTotal ?? 0).toFixed(2)),
      totalReleased: Number((walletSummary?.releasedTotal ?? 0).toFixed(2)),
      inEscrow: Number((walletSummary?.escrowBalance ?? 0).toFixed(2)),
    }),
    [walletSummary],
  );
  const activeTripExpenseId = tripExpenseSummary?.trip.id ?? '';
  const selectedTripPaidEntries = useMemo(() => {
    if (!walletSummary?.paidEntries?.length) {
      return [];
    }

    if (!activeTripExpenseId) {
      return walletSummary.paidEntries;
    }

    return walletSummary.paidEntries.filter((entry) => entry.tripId === activeTripExpenseId);
  }, [activeTripExpenseId, walletSummary?.paidEntries]);
  const selectedTripParticipantEntries = useMemo(() => {
    if (!tripExpenseSummary || !userSession?.id) {
      return [];
    }

    const payableByUserId = new Map(selectedTripPaidEntries.map((entry) => [entry.recipientUserId, entry]));
    const releasedAmountByUserId = new Map(
      (walletSummary?.releasedEntries ?? [])
        .filter((entry) => entry.tripId === tripExpenseSummary.trip.id)
        .map((entry) => [entry.recipientUserId, entry.amount]),
    );
    const settlementAmountByUserId = tripExpenseSummary.settlementSummary.reduce<Map<string, number>>((accumulator, settlement) => {
      if (settlement.fromUserId !== userSession.id) {
        return accumulator;
      }

      accumulator.set(
        settlement.toUserId,
        Number((((accumulator.get(settlement.toUserId) ?? 0) + settlement.amount)).toFixed(2)),
      );
      return accumulator;
    }, new Map());

    return tripExpenseSummary.balances
      .filter((balance) => balance.userId !== userSession.id)
      .map((balance) => {
        const member = tripExpenseSummary.members.find((tripMember) => tripMember.id === balance.userId);
        const payableEntry = payableByUserId.get(balance.userId);
        const settledAmount = settlementAmountByUserId.get(balance.userId) ?? 0;
        const releasedAmount = releasedAmountByUserId.get(balance.userId) ?? 0;
        const remainingAmount = Math.max(0, Number((settledAmount - releasedAmount).toFixed(2)));
        const totalOwesAmount = payableEntry?.amount ?? remainingAmount;

        return {
          id: payableEntry?.id ?? `trip-balance:${balance.userId}`,
          userId: balance.userId,
          name: balance.name,
          avatar: balance.avatar ?? member?.avatar ?? null,
          tripId: tripExpenseSummary.trip.id,
          tripTitle: tripExpenseSummary.trip.title,
          totalOwesAmount: Number((totalOwesAmount ?? 0).toFixed(2)),
          netBalanceAmount: Number((payableEntry?.amount ?? remainingAmount).toFixed(2)),
          payableEntry: payableEntry ?? null,
        };
      })
      .sort((left, right) => right.totalOwesAmount - left.totalOwesAmount);
  }, [selectedTripPaidEntries, tripExpenseSummary, userSession?.id, walletSummary?.releasedEntries]);
  const selectedTripPayableTotal = useMemo(
    () => Number(selectedTripPaidEntries.reduce((total, entry) => total + entry.amount, 0).toFixed(2)),
    [selectedTripPaidEntries],
  );
  const currentUserTripBalance = useMemo(() => {
    if (!tripExpenseSummary || !userSession?.id) {
      return null;
    }

    return tripExpenseSummary.balances.find((balance) => balance.userId === userSession.id) ?? null;
  }, [tripExpenseSummary, userSession?.id]);
  const tripScopedPayableAmount = useMemo(() => {
    if (currentUserTripBalance && currentUserTripBalance.totalOwed > 0) {
      return Number(currentUserTripBalance.totalOwed.toFixed(2));
    }

    return selectedTripPayableTotal;
  }, [currentUserTripBalance, selectedTripPayableTotal]);
  const splitPreviewAmount = useMemo(() => {
    const parsedAmount = Number.parseFloat(splitExpenseAmount);
    return Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  }, [splitExpenseAmount]);
  const splitSelectedMemberCount = useMemo(() => {
    if (!tripExpenseSummary || !userSession?.id) {
      return 0;
    }

    return selectedSplitDebtorIds.length + 1;
  }, [selectedSplitDebtorIds.length, tripExpenseSummary, userSession?.id]);
  const splitPreviewShareAmount = useMemo(
    () => getEqualSplitShareAmount(splitPreviewAmount, splitSelectedMemberCount),
    [splitPreviewAmount, splitSelectedMemberCount],
  );
  const splitParticipantChips = useMemo(() => {
    if (!tripExpenseSummary || !userSession?.id) {
      return [];
    }

    const selectedDebtorIdSet = new Set(selectedSplitDebtorIds);

    return tripExpenseSummary.members.map((member) => {
      const isCurrentUser = member.id === userSession.id;
      const isSelected = isCurrentUser || selectedDebtorIdSet.has(member.id);
      let detail = 'Excluded from this expense';

      if (isCurrentUser) {
        detail =
          splitPreviewAmount > 0 && splitSelectedMemberCount > 0
            ? `Your share stays at $${splitPreviewShareAmount.toFixed(2)}`
            : 'You paid for this bill';
      } else if (isSelected) {
        detail =
          splitPreviewAmount > 0 && splitSelectedMemberCount > 0
            ? `Owes you $${splitPreviewShareAmount.toFixed(2)}`
            : 'Included in the equal split';
      }

      return {
        ...member,
        detail,
        isCurrentUser,
        isSelected,
      };
    });
  }, [selectedSplitDebtorIds, splitPreviewAmount, splitPreviewShareAmount, splitSelectedMemberCount, tripExpenseSummary, userSession?.id]);
  const editingExpensePreviewAmount = useMemo(() => {
    const parsedAmount = Number.parseFloat(editingExpenseAmount);
    return Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  }, [editingExpenseAmount]);
  const editingExpenseSelectedMemberCount = useMemo(() => {
    if (!tripExpenseSummary || !userSession?.id || !editingExpenseId) {
      return 0;
    }

    return editingExpenseDebtorIds.length + 1;
  }, [editingExpenseDebtorIds.length, editingExpenseId, tripExpenseSummary, userSession?.id]);
  const editingExpenseShareAmount = useMemo(
    () => getEqualSplitShareAmount(editingExpensePreviewAmount, editingExpenseSelectedMemberCount),
    [editingExpensePreviewAmount, editingExpenseSelectedMemberCount],
  );
  const editingExpenseParticipantChips = useMemo(() => {
    if (!tripExpenseSummary || !userSession?.id || !editingExpenseId) {
      return [];
    }

    const selectedDebtorIdSet = new Set(editingExpenseDebtorIds);

    return tripExpenseSummary.members.map((member) => {
      const isCurrentUser = member.id === userSession.id;
      const isSelected = isCurrentUser || selectedDebtorIdSet.has(member.id);
      let detail = 'Excluded from this expense';

      if (isCurrentUser) {
        detail =
          editingExpensePreviewAmount > 0 && editingExpenseSelectedMemberCount > 0
            ? `Your share stays at $${editingExpenseShareAmount.toFixed(2)}`
            : 'You paid for this bill';
      } else if (isSelected) {
        detail =
          editingExpensePreviewAmount > 0 && editingExpenseSelectedMemberCount > 0
            ? `Owes you $${editingExpenseShareAmount.toFixed(2)}`
            : 'Included in the equal split';
      }

      return {
        ...member,
        detail,
        isCurrentUser,
        isSelected,
      };
    });
  }, [
    editingExpenseDebtorIds,
    editingExpenseId,
    editingExpensePreviewAmount,
    editingExpenseSelectedMemberCount,
    editingExpenseShareAmount,
    tripExpenseSummary,
    userSession?.id,
  ]);
  const splitHeroLiquidRatio = useMemo(() => {
    if (splitPreviewAmount > 0) {
      const referenceAmount =
        tripExpenseSummary && tripExpenseSummary.totalExpenses > 0 ? tripExpenseSummary.totalExpenses : splitPreviewAmount;

      return Math.max(0.14, Math.min(0.94, splitPreviewShareAmount / Math.max(referenceAmount, splitPreviewShareAmount, 1)));
    }

    if (tripExpenseSummary?.totalExpenses) {
      return Math.max(0.12, Math.min(0.4, splitPreviewShareAmount / Math.max(tripExpenseSummary.totalExpenses, 1)));
    }

    return 0.18;
  }, [splitPreviewAmount, splitPreviewShareAmount, tripExpenseSummary]);
  const maxTripBalanceMagnitude = useMemo(() => {
    if (!tripExpenseSummary?.balances.length) {
      return 1;
    }

    return tripExpenseSummary.balances.reduce((largestMagnitude, balance) => {
      return Math.max(largestMagnitude, Math.abs(balance.netBalance), balance.totalOwed, balance.totalReceivable, 1);
    }, 1);
  }, [tripExpenseSummary]);

  const completedTripsCount = useMemo(
    () => archivedMyPosts.length,
    [archivedMyPosts],
  );

  const handleNavigation = (screenName: string) => {
    const validScreens: ScreenName[] = [
      'home',
      'discovery',
      'auth',
      'aboutUs',
      'contactUs',
      'createTrip',
      'editPost',
      'dashboard',
      'expenses',
      'chat',
      'tripDetails',
      'profile',
      'history',
      'wallet',
      'onboarding',
      'verification',
      'groupChat',
      'reviews',
    ];
    const targetScreen = screenName as ScreenName;
    if (!validScreens.includes(targetScreen)) {
      return;
    }

    if (targetScreen !== 'editPost' && editingFeedPost) {
      setEditingFeedPost(null);
    }

    if (targetScreen !== 'auth' && targetScreen !== 'createTrip' && postAuthRedirectScreen === 'createTrip') {
      setPostAuthRedirectScreen(null);
    }

    const requiresSession: ScreenName[] = [
      'createTrip',
      'editPost',
      'dashboard',
      'expenses',
      'chat',
      'profile',
      'history',
      'wallet',
      'onboarding',
      'verification',
      'groupChat',
      'reviews',
    ];

    if (requiresSession.includes(targetScreen) && !userSession) {
      if (targetScreen === 'createTrip') {
        setPostAuthRedirectScreen('createTrip');
        setAuthMode('signin');
        setAuthErrors({});
        setAuthMessage('');
      }
      setCurrentScreen('auth');
      setSystemNotice('Please sign in to continue.');
      return;
    }

    if (targetScreen === 'verification' && userSession && !userSession.dna) {
      setCurrentScreen('onboarding');
      setSystemNotice('Complete Travel DNA first.');
      return;
    }

    if (userSession && (targetScreen === 'home' || targetScreen === 'discovery' || targetScreen === 'dashboard')) {
      setCurrentScreen(targetScreen);
      setActiveView(targetScreen === 'dashboard' ? 'dashboard' : 'feed');
      setIsAccountPanelOpen(false);
      return;
    }

    setCurrentScreen(targetScreen);
    setIsAccountPanelOpen(false);
  };

  const handleCostChange = (category: ExpenseCategory, value: string) => {
    const parsed = Number(value);
    const numericValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

    setCosts((previous) => ({
      ...previous,
      [category]: numericValue,
    }));
  };

  const handleSplitParticipantToggle = (memberId: string) => {
    if (!userSession?.id || memberId === userSession.id) {
      return;
    }

    setSelectedSplitDebtorIds((previous) =>
      previous.includes(memberId) ? previous.filter((currentId) => currentId !== memberId) : [...previous, memberId],
    );
  };

  const handleEditExpenseParticipantToggle = (memberId: string) => {
    if (!userSession?.id || memberId === userSession.id) {
      return;
    }

    setEditingExpenseDebtorIds((previous) =>
      previous.includes(memberId) ? previous.filter((currentId) => currentId !== memberId) : [...previous, memberId],
    );
  };

  const handleCloseExpenseEdit = () => {
    setEditingExpenseId(null);
    setEditingExpenseDescription('');
    setEditingExpenseAmount('');
    setEditingExpenseDebtorIds([]);
    setIsExpenseUpdateSubmitting(false);
  };

  const handleOpenExpenseEdit = (expense: TripExpenseSummary['expenses'][number]) => {
    setEditingExpenseId(expense.id);
    setEditingExpenseDescription(expense.description);
    setEditingExpenseAmount(expense.amount.toFixed(2));
    setEditingExpenseDebtorIds(expense.settlements.map((settlement) => settlement.userId));
    setTripExpenseError('');
  };

  const handleOpenTrip = (tripId: string) => {
    const foundTrip = allTrips.find((trip) => trip.id === tripId) ?? null;
    setSelectedTrip(foundTrip);
    setCurrentScreen('tripDetails');
  };

  const handleHostTrip = () => {
    setIsAccountPanelOpen(false);

    if (userSession) {
      setPostAuthRedirectScreen(null);
      setCurrentScreen('createTrip');
      setSystemNotice('Set up your trip and publish your host request.');
      return;
    }

    setPostAuthRedirectScreen('createTrip');
    setAuthMode('signin');
    setAuthErrors({});
    setAuthMessage('');
    setCurrentScreen('auth');
    setSystemNotice('Sign in to host your trip.');
  };

  const handleCreateTrip = async (payload: CreateTripPayload) => {
    if (!userSession) {
      setCurrentScreen('auth');
      setSystemNotice('Please sign in to continue.');
      return;
    }

    const newTripId = `trip-user-${Date.now()}`;
    const inferredBudgetFlexibility = Math.max(1, Math.min(10, Math.round(payload.budget / 250)));
    const hostDNA = userSession.dna
      ? normalizeTravelDNA(userSession.dna)
      : normalizeTravelDNA({
          ...defaultUserDNA,
          budgetFlexibility: inferredBudgetFlexibility,
        });
    const preferredTravelers =
      payload.interestedIn === 'Unspecified' ? 'Unspecified' : `${payload.interestedIn} travelers`;
    const journeyDateRange = createJourneyDateRange(payload.startJourneyDate, payload.endJourneyDate);

    if (!journeyDateRange) {
      setSystemNotice('Please choose a valid start and end journey date.');
      return;
    }

    const conflictingBooking = findConflictingBookedTrip(
      bookedTripPosts,
      journeyDateRange.startDate,
      journeyDateRange.endDate,
    );
    if (conflictingBooking) {
      setSystemNotice(TRIP_OVERLAP_NOTICE);
      return;
    }

    const createdTrip: Trip = {
      id: newTripId,
      title: `${userSession.firstName || userSession.name} Hosted Trip`,
      hostName: userSession.name,
      priceShare: payload.budget,
      matchPercentage: 82,
      tripDNA: hostDNA,
      imageUrl: payload.posterImageUrls[0],
      isVerified: Boolean(userSession.isVerified),
      route: payload.location,
      duration: `${journeyDateRange.durationDays} Days`,
      totalExpectedFromPartner: payload.budget * payload.peopleRequired,
      partnerExpectations: payload.expectations,
      notes: `Preferred travelers: ${preferredTravelers}. ${
        payload.onlyVerifiedUsers ? 'Verified users only.' : 'Open to all users.'
      }`,
      highlights: payload.expectations.slice(0, 3),
    };
    const authorKey = getSessionAuthorKey(userSession);

    if (!authorKey) {
      setSystemNotice('Unable to identify post author. Update your profile and try again.');
      return;
    }

    try {
      const createdFeedPost = await createFeedPost({
        authorKey,
        status: 'Active',
        onlyVerifiedUsers: payload.onlyVerifiedUsers,
        title: createdTrip.title,
        hostName: createdTrip.hostName,
        isVerified: Boolean(createdTrip.isVerified),
        imageUrl: createdTrip.imageUrl,
        location: payload.location,
        cost: payload.budget,
        durationDays: journeyDateRange.durationDays,
        requiredPeople: payload.peopleRequired,
        spotsFilledPercent: 0,
        expectations: payload.expectations,
        travelerType: payload.travelerType,
        startDate: journeyDateRange.startDate.toISOString(),
        endDate: journeyDateRange.endDate.toISOString(),
      });

      setFeedPosts((previous) => [createdFeedPost, ...previous]);
      setUserCreatedTrips((previous) => [createdTrip, ...previous]);
      setTripRuntimeById((previous) => ({
        ...previous,
        [newTripId]: {
          status: 'Open',
          introEndsAt: null,
          escrowSummary: null,
          hasReleasedCheckInFunds: false,
          hasReviewed: false,
        },
      }));
      setPublicProfiles((previous) => {
        if (previous[userSession.name]) {
          return previous;
        }

        return {
          ...previous,
          [userSession.name]: {
            name: userSession.name,
            toursCompleted: userSession.toursCompleted,
            ratingAverage: userSession.ratingAverage,
            ratingCount: userSession.ratingCount,
            isVerified: Boolean(userSession.isVerified),
          },
        };
      });
      setCurrentScreen('discovery');
      setSystemNotice('Trip post created and saved to database.');
      void loadSelfTripsForHost();
      await loadPostStatsFromDatabase(authorKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create trip post right now.';
      setSystemNotice(message);
    }
  };

  const openTripWhatsApp = (trip: Trip): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }

    const phone = toWhatsAppPhone(trip.hostCountryCode, trip.hostMobileNumber);
    if (!phone) {
      return false;
    }

    const message = `Hi ${trip.hostName}, I am interested in "${trip.title}" on SplitNGo.`;
    const targetUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    return true;
  };

  const handleJoinChat = (tripId: string) => {
    if (!userSession) {
      setCurrentScreen('auth');
      setSystemNotice('Sign in to join trip chat.');
      return;
    }

    if (!userSession.dna) {
      setCurrentScreen('onboarding');
      setSystemNotice('Complete onboarding to unlock matchmaking.');
      return;
    }

    if (!userSession.isVerified) {
      setCurrentScreen('verification');
      setSystemNotice('Verification is required before joining chat.');
      return;
    }

    const matchScore = matchedTrips.find((entry) => entry.trip.id === tripId)?.matchScore ?? 0;
    if (matchScore <= 70) {
      setSystemNotice('You need a match score above 70% to join this group chat.');
      return;
    }

    const trip = allTrips.find((item) => item.id === tripId);
    if (!trip) {
      return;
    }

    if (openTripWhatsApp(trip)) {
      setSystemNotice(`Opening WhatsApp chat with ${trip.hostName}.`);
      return;
    }

    setSelectedTrip(trip);
    setActiveGroupTripId(tripId);
    setTripRuntimeById((previous) => {
      const runtime = previous[tripId];
      if (!runtime || runtime.status !== 'Open') {
        return previous;
      }

      return {
        ...previous,
        [tripId]: {
          ...runtime,
          status: 'Introductory',
          introEndsAt: Date.now() + INTRO_PERIOD_MS,
        },
      };
    });

    setCurrentScreen('groupChat');
    setSystemNotice('');
  };

  const handleFeedDismiss = (postId: string) => {
    setFeedPosts((previous) => previous.filter((post) => post.id !== postId));
    setSentRequestPostIds((previous) => previous.filter((id) => id !== postId));
  };

  const handleFeedJoinRequest = async (post: FeedPost) => {
    if (!userSession) {
      setCurrentScreen('auth');
      setSystemNotice('Sign in to send a join request.');
      return;
    }

    const isOwnPostByAuthor =
      normalizedCurrentUserAuthorKey !== null && normalizeAuthorKey(post.authorKey) === normalizedCurrentUserAuthorKey;
    const isOwnPostById = selfTripIdSet.has(post.id);
    const isOwnPostByHostId = Boolean(userSession.id && post.hostId && post.hostId === userSession.id);
    if (isOwnPostByAuthor || isOwnPostById || isOwnPostByHostId) {
      setSystemNotice('Hosts cannot send join requests to their own posts.');
      return;
    }

    if (userSession.id && post.participantIds.includes(userSession.id)) {
      setSystemNotice('You are already a participant in this trip.');
      return;
    }

    if (post.spotsFilled >= post.maxParticipants) {
      setSystemNotice('Trip is full. No additional join requests can be sent.');
      return;
    }

    if (joinConflictMessageByPostId[post.id]) {
      setSystemNotice(TRIP_OVERLAP_NOTICE);
      return;
    }

    if (sentRequestPostIds.includes(post.id)) {
      return;
    }

    const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    const shouldUseJoinApi = Boolean(authToken && isMongoObjectId(post.id));

    if (!shouldUseJoinApi) {
      setSentRequestPostIds((previous) => (previous.includes(post.id) ? previous : [...previous, post.id]));
      setSystemNotice(`Join request sent to ${post.hostName} for "${post.title}".`);
      return;
    }

    setIsPostActionInProgress(true);
    try {
      await submitJoinRequest(post.id, authToken as string);
      setSentRequestPostIds((previous) => (previous.includes(post.id) ? previous : [...previous, post.id]));
      setSystemNotice(`Join request sent to ${post.hostName} for "${post.title}".`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send join request right now.';
      setSystemNotice(message);
    } finally {
      setIsPostActionInProgress(false);
    }
  };

  const handleJoinedTripChat = (tripId: string) => {
    if (!userSession) {
      setCurrentScreen('auth');
      setSystemNotice('Sign in to join trip chat.');
      return;
    }

    let nextTrip = allTrips.find((item) => item.id === tripId) ?? null;
    if (!nextTrip) {
      const feedPost = feedPosts.find((post) => post.id === tripId) ?? null;
      if (feedPost) {
        const runtimeTrip = toRuntimeTripFromFeedPost(feedPost);
        nextTrip = runtimeTrip;
        setUserCreatedTrips((previous) =>
          previous.some((trip) => trip.id === runtimeTrip.id) ? previous : [runtimeTrip, ...previous],
        );
      }
    }

    if (!nextTrip) {
      setSystemNotice('Unable to open trip chat right now.');
      return;
    }

    if (openTripWhatsApp(nextTrip)) {
      setSystemNotice(`Opening WhatsApp chat with ${nextTrip.hostName}.`);
      return;
    }

    setSelectedTrip(nextTrip);
    setActiveGroupTripId(tripId);
    setTripRuntimeById((previous) => {
      const runtime = previous[tripId];
      if (!runtime) {
        return {
          ...previous,
          [tripId]: {
            status: 'Introductory',
            introEndsAt: Date.now() + INTRO_PERIOD_MS,
            escrowSummary: null,
            hasReleasedCheckInFunds: false,
            hasReviewed: false,
          },
        };
      }

      if (runtime.status !== 'Open') {
        return previous;
      }

      return {
        ...previous,
        [tripId]: {
          ...runtime,
          status: 'Introductory',
          introEndsAt: Date.now() + INTRO_PERIOD_MS,
        },
      };
    });

    setCurrentScreen('groupChat');
    setSystemNotice('');
  };

  const handleCloseRequestModal = () => {
    setActiveRequestModalPost(null);
    setIsRequestModalLoading(false);
    setIsRequestActionInProgress(false);
  };

  const handleOpenManageRequests = async (post: FeedPost) => {
    setActiveRequestModalPost(post);
    setHostRequestsByTripId((previous) => ({
      ...previous,
      [post.id]: previous[post.id] ?? [],
    }));

    const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!authToken || !isMongoObjectId(post.id)) {
      setPendingRequestCountByTripId((previous) => ({
        ...previous,
        [post.id]: previous[post.id] ?? post.pendingRequestCount ?? 0,
      }));
      return;
    }

    setIsRequestModalLoading(true);
    try {
      const requests = await fetchTripRequests(post.id, authToken);
      setHostRequestsByTripId((previous) => ({
        ...previous,
        [post.id]: requests,
      }));
      setPendingRequestCountByTripId((previous) => ({
        ...previous,
        [post.id]: requests.length,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load trip requests right now.';
      setSystemNotice(message);
      setHostRequestsByTripId((previous) => ({
        ...previous,
        [post.id]: [],
      }));
      setPendingRequestCountByTripId((previous) => ({
        ...previous,
        [post.id]: 0,
      }));
    } finally {
      setIsRequestModalLoading(false);
    }
  };

  const handleReviewTripRequest = async (requestItem: HostTripRequest, status: HostRequestReviewStatus) => {
    const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

    if (requestItem.source === 'api' && !authToken) {
      setSystemNotice('Your session expired. Please sign in again.');
      return;
    }

    setIsRequestActionInProgress(true);
    try {
      let updatedTripSnapshot:
        | {
            id: string;
            maxParticipants: number;
            spotsFilled: number;
            spotsFilledPercent: number;
            participantIds: string[];
          }
        | null = null;

      if (requestItem.source === 'api' && authToken) {
        const response = await reviewJoinRequest(requestItem.id, status, authToken);
        if (response.trip) {
          updatedTripSnapshot = {
            id: response.trip.id,
            maxParticipants: response.trip.maxParticipants,
            spotsFilled: response.trip.spotsFilled,
            spotsFilledPercent: response.trip.spotsFilledPercent,
            participantIds: response.trip.participantIds,
          };
        }
      }

      setHostRequestsByTripId((previous) => ({
        ...previous,
        [requestItem.tripId]: (previous[requestItem.tripId] ?? []).filter((request) => request.id !== requestItem.id),
      }));
      setPendingRequestCountByTripId((previous) => ({
        ...previous,
        [requestItem.tripId]: Math.max(0, (previous[requestItem.tripId] ?? 0) - 1),
      }));

      if (status === 'accepted') {
        setFeedPosts((previous) =>
          previous.map((post) => {
            if (post.id !== requestItem.tripId) {
              return post;
            }

            if (updatedTripSnapshot) {
              return {
                ...post,
                maxParticipants: updatedTripSnapshot.maxParticipants,
                spotsFilled: updatedTripSnapshot.spotsFilled,
                spotsFilledPercent: updatedTripSnapshot.spotsFilledPercent,
                participantIds: updatedTripSnapshot.participantIds,
              };
            }

            const currentParticipantIds = post.participantIds.includes(requestItem.requesterId)
              ? post.participantIds
              : [...post.participantIds, requestItem.requesterId];
            const nextSpotsFilled = currentParticipantIds.length;
            const nextSpotsFilledPercent =
              post.maxParticipants > 0 ? Math.min(100, Math.round((nextSpotsFilled / post.maxParticipants) * 100)) : 0;

            return {
              ...post,
              participantIds: currentParticipantIds,
              spotsFilled: nextSpotsFilled,
              spotsFilledPercent: nextSpotsFilledPercent,
            };
          }),
        );
      }

      if (status === 'accepted') {
        setSystemNotice(`${requestItem.requesterLabel} was accepted and can now join trip chat.`);
      } else {
        setSystemNotice(`${requestItem.requesterLabel} was rejected.`);
      }
      void loadSelfTripsForHost();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update request right now.';
      setSystemNotice(message);
    } finally {
      setIsRequestActionInProgress(false);
    }
  };

  const handleFeedShare = async (post: FeedPost) => {
    const shareText = `${post.title} | ${post.location} | $${post.cost.toFixed(0)} | ${post.durationDays} days`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: shareText,
          url: window.location.href,
        });
        setSystemNotice('Trip post shared successfully.');
        return;
      } catch {
        // Ignore and fall through to clipboard fallback.
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        setSystemNotice('Trip summary copied to clipboard.');
        return;
      } catch {
        // Ignore and fall through to final notice.
      }
    }

    setSystemNotice('Sharing is not available in this browser.');
  };

  const handleEditFeedPost = (post: FeedPost) => {
    if (!currentUserAuthorKey) {
      setSystemNotice('Sign in to edit your post.');
      return;
    }

    setEditingFeedPost(post);
    setCurrentScreen('editPost');
    setSystemNotice('');
  };

  const handleDeleteFeedPost = async (post: FeedPost) => {
    if (!currentUserAuthorKey) {
      setSystemNotice('Sign in to delete your post.');
      return;
    }

    const shouldDelete = window.confirm('Delete this post permanently?');
    if (!shouldDelete) {
      return;
    }

    setIsPostActionInProgress(true);
    try {
      await deleteFeedPost(post.id, currentUserAuthorKey);
      setFeedPosts((previous) => previous.filter((currentPost) => currentPost.id !== post.id));
      setSentRequestPostIds((previous) => previous.filter((postId) => postId !== post.id));
      if (editingFeedPost?.id === post.id) {
        setEditingFeedPost(null);
      }
      await loadPostStatsFromDatabase(currentUserAuthorKey);
      void loadSelfTripsForHost();
      setCurrentScreen('home');
      setActiveView('feed');
      setSystemNotice('Post deleted successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete post right now.';
      setSystemNotice(message);
    } finally {
      setIsPostActionInProgress(false);
    }
  };

  const handleCompleteFeedPost = async (post: FeedPost) => {
    if (!currentUserAuthorKey) {
      setSystemNotice('Sign in to complete your post.');
      return;
    }

    if (post.status === 'Completed') {
      setSystemNotice('Post is already completed.');
      return;
    }

    const shouldComplete = window.confirm('Mark this post as completed? It will be removed from Main Feed.');
    if (!shouldComplete) {
      return;
    }

    setIsPostActionInProgress(true);
    try {
      await updateFeedPostStatus(post.id, 'Completed', currentUserAuthorKey);
      setFeedPosts((previous) => previous.filter((currentPost) => currentPost.id !== post.id));
      setSentRequestPostIds((previous) => previous.filter((postId) => postId !== post.id));
      if (editingFeedPost?.id === post.id) {
        setEditingFeedPost(null);
      }
      await loadPostStatsFromDatabase(currentUserAuthorKey);
      void loadSelfTripsForHost();
      setCurrentScreen('home');
      setActiveView('feed');
      setSystemNotice('Post marked as completed and removed from Main Feed.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete post right now.';
      setSystemNotice(message);
    } finally {
      setIsPostActionInProgress(false);
    }
  };

  const handleCancelFeedPost = async (post: FeedPost) => {
    if (!currentUserAuthorKey) {
      setSystemNotice('Sign in to cancel your post.');
      return;
    }

    if (post.status === 'Cancelled') {
      setSystemNotice('Post is already cancelled.');
      return;
    }

    const shouldCancel = window.confirm('Cancel this post? Its dates will be freed immediately.');
    if (!shouldCancel) {
      return;
    }

    setIsPostActionInProgress(true);
    try {
      await updateFeedPostStatus(post.id, 'Cancelled', currentUserAuthorKey);
      setFeedPosts((previous) => previous.filter((currentPost) => currentPost.id !== post.id));
      setSentRequestPostIds((previous) => previous.filter((postId) => postId !== post.id));
      if (editingFeedPost?.id === post.id) {
        setEditingFeedPost(null);
      }
      await loadPostStatsFromDatabase(currentUserAuthorKey);
      void loadSelfTripsForHost();
      setCurrentScreen('home');
      setActiveView('feed');
      setSystemNotice('Post cancelled. Those trip dates are now available again.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to cancel post right now.';
      setSystemNotice(message);
    } finally {
      setIsPostActionInProgress(false);
    }
  };

  const handleSaveEditedPost = async (payload: CreateTripPayload) => {
    if (!currentUserAuthorKey) {
      setSystemNotice('Sign in to edit your post.');
      return;
    }

    const currentPost = editingFeedPost
      ? feedPosts.find((post) => post.id === editingFeedPost.id) ?? editingFeedPost
      : null;
    if (!currentPost) {
      setSystemNotice('Post not found.');
      return;
    }

    const journeyDateRange = createJourneyDateRange(payload.startJourneyDate, payload.endJourneyDate);
    if (!journeyDateRange) {
      setSystemNotice('Please choose a valid start and end journey date.');
      return;
    }

    const conflictingBooking = findConflictingBookedTrip(
      bookedTripPosts,
      journeyDateRange.startDate,
      journeyDateRange.endDate,
      currentPost.id,
    );
    if (conflictingBooking) {
      setSystemNotice(TRIP_OVERLAP_NOTICE);
      return;
    }

    setIsPostActionInProgress(true);
    try {
      const updatedPost = await updateFeedPost(currentPost.id, {
        authorKey: currentUserAuthorKey,
        status: currentPost.status,
        onlyVerifiedUsers: payload.onlyVerifiedUsers,
        title: currentPost.title,
        hostName: currentPost.hostName,
        isVerified: currentPost.isVerified,
        imageUrl: payload.posterImageUrls[0] ?? currentPost.imageUrl,
        location: payload.location,
        cost: payload.budget,
        durationDays: journeyDateRange.durationDays,
        requiredPeople: payload.peopleRequired,
        spotsFilledPercent: currentPost.spotsFilledPercent,
        expectations: payload.expectations,
        travelerType: payload.travelerType,
        startDate: journeyDateRange.startDate.toISOString(),
        endDate: journeyDateRange.endDate.toISOString(),
      });

      setFeedPosts((previous) =>
        previous.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
      );
      setEditingFeedPost(null);
      setCurrentScreen('home');
      setActiveView('feed');
      setSystemNotice('Post updated successfully.');
      void loadSelfTripsForHost();
      await loadPostStatsFromDatabase(currentUserAuthorKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update post right now.';
      setSystemNotice(message);
    } finally {
      setIsPostActionInProgress(false);
    }
  };

  const handleCancelEditPost = () => {
    setEditingFeedPost(null);
    setCurrentScreen('home');
    setActiveView('feed');
    setSystemNotice('');
  };

  const handleAuthFieldChange = (field: keyof AuthForm, value: string) => {
    setAuthForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSocialLogin = (provider: SocialProvider) => {
    if (provider === 'Google') {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
      const redirectUri =
        (import.meta.env.VITE_GOOGLE_REDIRECT_URI as string | undefined) ?? window.location.origin;

      if (!clientId) {
        const redirectTarget = postAuthRedirectScreen;
        setPostAuthRedirectScreen(null);
        setUserSession(createSession('Google User', 'Google'));
        setActiveView('feed');
        setCurrentScreen(redirectTarget === 'createTrip' ? 'createTrip' : 'home');
        setSystemNotice(
          redirectTarget === 'createTrip'
            ? 'Google demo login successful. Continue creating your trip.'
            : 'VITE_GOOGLE_CLIENT_ID missing. Logged in with demo Google session.',
        );
        return;
      }

      const stateToken = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('google_oauth_state', stateToken);

      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', clientId);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', 'openid email profile');
      oauthUrl.searchParams.set('state', stateToken);
      oauthUrl.searchParams.set('prompt', 'select_account');

      window.location.assign(oauthUrl.toString());
      return;
    }

    const providerLoginUrls: Record<'Microsoft' | 'Facebook', string> = {
      Microsoft: 'https://login.live.com/',
      Facebook: 'https://www.facebook.com/login/',
    };

    window.open(providerLoginUrls[provider], '_blank', 'noopener,noreferrer');
    const redirectTarget = postAuthRedirectScreen;
    setPostAuthRedirectScreen(null);
    setUserSession(createSession(`${provider} User`, provider));
    setActiveView('feed');
    setCurrentScreen(redirectTarget === 'createTrip' ? 'createTrip' : 'home');
    setSystemNotice(
      redirectTarget === 'createTrip'
        ? `${provider} login started. Continue creating your trip.`
        : `${provider} login page opened in a new tab. Main Feed unlocked.`,
    );
  };

  const validateAuth = (): boolean => {
    const errors: AuthErrors = {};

    if (!authForm.userId.trim()) {
      errors.userId = 'Enter your id.';
    }

    if (!authForm.password.trim()) {
      errors.password = 'Enter password.';
    } else if (authForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (authMode === 'signup') {
      if (!authForm.confirmPassword.trim()) {
        errors.confirmPassword = 'Confirm your password.';
      } else if (authForm.confirmPassword !== authForm.password) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    }

    setAuthErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateAuth()) {
      setAuthMessage('Please fix the validation errors.');
      return;
    }

    setIsAuthLoading(true);
    setAuthMessage('');

    try {
      if (authMode === 'signin') {
        const loginResponse = await loginWithCredentials({
          userId: authForm.userId.trim(),
          password: authForm.password,
        });

        window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, loginResponse.token);
        const baseSession: UserSession = {
          ...createSession(loginResponse.user.userId, 'Email'),
          id: loginResponse.user.id,
          isVerified: Boolean(loginResponse.user.isVerified),
        };
        let nextSession = baseSession;
        try {
          nextSession = await loadProfileFromDatabase(loginResponse.token, baseSession);
        } catch {
          // Keep minimal session if profile fetch fails.
        }

        const redirectTarget = postAuthRedirectScreen;
        setPostAuthRedirectScreen(null);
        setHydratedProfileToken(loginResponse.token);
        setUserSession(nextSession);
        setAuthForm({ userId: '', password: '', confirmPassword: '' });
        setActiveView('feed');
        setCurrentScreen(redirectTarget === 'createTrip' ? 'createTrip' : 'home');
        setSystemNotice(
          redirectTarget === 'createTrip'
            ? 'Sign in successful. Continue creating your trip.'
            : 'Sign in successful. Welcome to your Main Feed.',
        );
        return;
      }

      await registerWithCredentials({
        userId: authForm.userId.trim(),
        password: authForm.password,
      });

      setAuthMessage(`Account created for ${authForm.userId}. You can now sign in.`);
      setAuthMode('signin');
      setAuthForm((previous) => ({ ...previous, password: '', confirmPassword: '' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication request failed.';
      setAuthMessage(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    clearStoredAuthState();
    setHydratedProfileToken(null);
    setUserSession(null);
    setAuthMode('signin');
    setAuthErrors({});
    setAuthMessage('');
    setPostAuthRedirectScreen(null);
    setAuthForm({ userId: '', password: '', confirmPassword: '' });
    setActiveView('feed');
    setFeedPosts([]);
    setEditingFeedPost(null);
    setDnaMatchByPostId({});
    setDnaMatchLoadingPostIds([]);
    setSentRequestPostIds([]);
    setSelfTripSummaries([]);
    setPendingRequestCountByTripId({});
    setHostRequestsByTripId({});
    setActiveRequestModalPost(null);
    setIsRequestModalLoading(false);
    setIsRequestActionInProgress(false);
    setPostStats(EMPTY_POST_STATS);
    setIsPostActionInProgress(false);
    setCurrentScreen('home');
    setIsAccountPanelOpen(false);
    setActiveGroupTripId(null);
    setVerificationDocumentFile(null);
    setVerificationDocumentError('');
    setIsVerificationUploading(false);
    setIsProfileSaving(false);
    setIsEmergencyAlertActive(false);
    setEmergencyMessage('');
    setSystemNotice('Signed out.');
  };

  const handleOnboardingComplete = async (dna: UserDNA) => {
    const normalizedDNA = normalizeTravelDNA(dna);
    setUserSession((previous) => (previous ? { ...previous, dna: normalizedDNA } : previous));

    const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!authToken) {
      setCurrentScreen('verification');
      setSystemNotice('Travel DNA saved locally. Continue to verification.');
      return;
    }

    try {
      const response = await updateTravelDNA(normalizedDNA, authToken);
      setUserSession((previous) => (previous ? { ...previous, dna: response.travelDNA } : previous));
      setCurrentScreen('verification');
      setSystemNotice(response.message ?? 'Travel DNA saved. Continue to verification.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Travel DNA save failed.';
      setCurrentScreen('verification');
      setSystemNotice(`${message} Using local DNA for now.`);
    }
  };

  const handleVerificationComplete = () => {
    const nextAuthorKeys = getSessionAuthorKeys(userSession);
    const nextUserId = userSession?.id ?? null;
    setUserSession((previous) => (previous ? { ...previous, isVerified: true } : previous));
    syncOwnPostsVerificationStatus(nextAuthorKeys, nextUserId, true);
    setCurrentScreen('home');
    setSystemNotice('Verification completed. Verified Badge granted.');
  };

  const handleDashboardVerificationStatusSync = (isVerified: boolean) => {
    if (!userSession || userSession.isVerified === isVerified) {
      return;
    }

    const nextAuthorKeys = getSessionAuthorKeys(userSession);
    const nextUserId = userSession?.id ?? null;
    setUserSession((previous) => (previous ? { ...previous, isVerified } : previous));
    syncOwnPostsVerificationStatus(nextAuthorKeys, nextUserId, isVerified);
  };

  const handleProfileFieldChange = (field: EditableProfileField, value: string) => {
    setProfileForm((previous) => ({ ...previous, [field]: value }));
    setProfileErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleMobileNumberChange = (value: string) => {
    const formattedValue = formatMobileNumber(value);
    setProfileForm((previous) => ({ ...previous, mobileNumber: formattedValue }));
    setProfileErrors((previous) => ({ ...previous, mobileNumber: undefined }));
  };

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setProfileErrors((previous) => ({ ...previous, profileImageDataUrl: 'Please select a valid image file.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageDataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (!imageDataUrl) {
        setProfileErrors((previous) => ({ ...previous, profileImageDataUrl: 'Unable to load selected image.' }));
        return;
      }

      setProfileForm((previous) => ({ ...previous, profileImageDataUrl: imageDataUrl }));
      setProfileErrors((previous) => ({ ...previous, profileImageDataUrl: undefined }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleVerificationDocumentSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_VERIFICATION_DOCUMENT_BYTES) {
      setVerificationDocumentFile(null);
      setVerificationDocumentError('Document must be 5MB or less.');
      event.target.value = '';
      return;
    }

    setVerificationDocumentFile(file);
    setVerificationDocumentError('');
    event.target.value = '';
  };

  const handleUploadVerificationDocument = async () => {
    if (!userSession) {
      return;
    }

    if (!verificationDocumentFile) {
      setVerificationDocumentError('Please select a document to upload.');
      return;
    }

    const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!authToken) {
      setVerificationDocumentError('You are not authenticated. Please sign in again.');
      return;
    }

    setIsVerificationUploading(true);
    setVerificationDocumentError('');

    try {
      const documentDataUrl = await fileToDataUrl(verificationDocumentFile);
      const uploadResponse = await uploadVerificationDocument(
        {
          documentName: verificationDocumentFile.name,
          mimeType: verificationDocumentFile.type || 'application/octet-stream',
          documentDataUrl,
          documentSize: verificationDocumentFile.size,
        },
        authToken,
      );

      setUserSession((previous) =>
        previous
          ? {
              ...previous,
              isVerified: Boolean(uploadResponse.user.isVerified),
            }
          : previous,
      );
      setVerificationDocumentFile(null);
      setSystemNotice(uploadResponse.message);
      const nextIsVerified = Boolean(uploadResponse.user.isVerified);
      const nextAuthorKeys = getSessionAuthorKeys(userSession);
      const nextAuthorKey = nextAuthorKeys[0] ?? null;
      syncOwnPostsVerificationStatus(nextAuthorKeys, userSession?.id ?? null, nextIsVerified);
      await loadActiveFeedPosts(false, {
        viewerVerified: nextIsVerified,
        viewerAuthorKey: nextAuthorKey,
      });
      await loadPostStatsFromDatabase(nextAuthorKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Document upload failed.';
      setVerificationDocumentError(message);
    } finally {
      setIsVerificationUploading(false);
    }
  };

  const validateProfileForm = (): boolean => {
    const errors: ProfileErrors = {};
    const firstName = profileForm.firstName.trim();
    const lastName = profileForm.lastName.trim();
    const countryCode = profileForm.countryCode.trim();
    const mobileNumber = profileForm.mobileNumber.trim();
    const email = profileForm.email.trim();

    if (!firstName) {
      errors.firstName = 'First name is required.';
    }

    if (!lastName) {
      errors.lastName = 'Last name is required.';
    }

    if (!countryCode) {
      errors.countryCode = 'Country code is required.';
    }

    if (!mobileNumber) {
      errors.mobileNumber = 'Mobile number is required.';
    } else if (!US_MOBILE_PATTERN.test(mobileNumber)) {
      errors.mobileNumber = 'Use format (xxx)-xxx-xxxx.';
    }

    if (!email) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = 'Enter a valid email address.';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileEdit = () => {
    if (!userSession) {
      return;
    }

    setProfileForm(createProfileForm(userSession));
    setProfileErrors({});
    setIsProfileEditing(true);
  };

  const handleProfileCancel = () => {
    if (isProfileSaving) {
      return;
    }

    setProfileForm(createProfileForm(userSession));
    setProfileErrors({});
    setIsProfileEditing(false);
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userSession) {
      return;
    }

    if (!isProfileEditing) {
      return;
    }

    if (!validateProfileForm()) {
      setSystemNotice('Please fix profile validation errors.');
      return;
    }

    const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!authToken) {
      setSystemNotice('You are not authenticated. Please sign in again.');
      return;
    }

    const firstName = profileForm.firstName.trim();
    const lastName = profileForm.lastName.trim();
    const countryCode = profileForm.countryCode.trim();
    const mobileNumber = profileForm.mobileNumber.trim();
    const email = profileForm.email.trim().toLowerCase();
    const profilePayload: UpdateProfileRequest = {
      firstName,
      lastName,
      countryCode,
      mobileNumber,
      email,
      profileImageDataUrl: profileForm.profileImageDataUrl,
    };

    setIsProfileSaving(true);
    try {
      const profileResponse = await updateUserProfile(profilePayload, authToken);
      setUserSession((previous) =>
        previous
          ? mergeSessionWithProfile(
              previous,
              profileResponse.profile,
              Boolean(profileResponse.user.isVerified),
            )
          : previous,
      );
      setHydratedProfileToken(authToken);
      setProfileForm(profileToForm(profileResponse.profile));
      setProfileErrors({});
      setIsProfileEditing(false);
      setSystemNotice(profileResponse.message ?? 'Profile saved successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save profile right now.';
      setSystemNotice(message);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleCommitAndPay = () => {
    if (!activeGroupTrip || !activeGroupRuntime) {
      return;
    }

    if (activeGroupRuntime.status !== 'Introductory') {
      return;
    }

    if (activeGroupRuntime.introEndsAt && activeGroupRuntime.introEndsAt > Date.now()) {
      setSystemNotice('Commit & Pay stays locked during the 24-hour intro period.');
      return;
    }

    setTripRuntimeById((previous) => ({
      ...previous,
      [activeGroupTrip.id]: {
        ...previous[activeGroupTrip.id],
        status: 'Locked',
        escrowSummary: calculateEscrowSummary(activeGroupTrip.priceShare),
      },
    }));
    setSystemNotice('Escrow payment complete. Trip is now locked.');
  };

  const handleReleaseCheckIn = () => {
    if (!activeGroupTripId) {
      return;
    }

    let didRelease = false;
    setTripRuntimeById((previous) => {
      const runtime = previous[activeGroupTripId];
      if (!runtime || !runtime.escrowSummary || runtime.hasReleasedCheckInFunds) {
        return previous;
      }

      didRelease = true;
      return {
        ...previous,
        [activeGroupTripId]: {
          ...runtime,
          escrowSummary: releaseCheckInFunds(runtime.escrowSummary),
          hasReleasedCheckInFunds: true,
        },
      };
    });

    if (didRelease) {
      setSystemNotice('Check-in confirmed. 50% of funds released to organizer.');
    }
  };

  const handleOpenReview = () => {
    if (!activeGroupTripId) {
      return;
    }

    setCurrentScreen('reviews');
  };

  const handleSubmitReview = (organizerRating: number, travelerRating: number) => {
    if (!activeGroupTripId || !activeGroupTrip || !userSession) {
      return;
    }

    const runtime = tripRuntimeById[activeGroupTripId];
    if (!runtime || runtime.hasReviewed) {
      setSystemNotice('Review has already been submitted for this trip.');
      return;
    }

    setTripRuntimeById((previous) => ({
      ...previous,
      [activeGroupTripId]: {
        ...previous[activeGroupTripId],
        status: 'Completed',
        hasReviewed: true,
      },
    }));

    setPublicProfiles((previous) => {
      const organizerProfile = previous[activeGroupTrip.hostName];
      if (!organizerProfile) {
        return previous;
      }

      const { nextAverage, nextCount } = updateAverageRating(
        organizerProfile.ratingAverage,
        organizerProfile.ratingCount,
        organizerRating,
      );

      return {
        ...previous,
        [activeGroupTrip.hostName]: {
          ...organizerProfile,
          toursCompleted: organizerProfile.toursCompleted + 1,
          ratingAverage: nextAverage,
          ratingCount: nextCount,
        },
      };
    });

    setUserSession((previous) => {
      if (!previous) {
        return previous;
      }

      const { nextAverage, nextCount } = updateAverageRating(
        previous.ratingAverage,
        previous.ratingCount,
        travelerRating,
      );

      return {
        ...previous,
        toursCompleted: previous.toursCompleted + 1,
        ratingAverage: nextAverage,
        ratingCount: nextCount,
      };
    });

    setCurrentScreen('profile');
    setSystemNotice('Review submitted. Tours completed and ratings updated.');
  };

  const handleSplitExpenseSubmit = async () => {
    const currentAuthToken =
      typeof window === 'undefined' ? authToken : window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim() || authToken;

    if (!currentAuthToken) {
      setTripExpenseError('Sign in again to split an expense.');
      return;
    }

    if (!tripExpenseSummary?.trip.id) {
      setTripExpenseError('No active trip is available to split an expense right now.');
      return;
    }

    const normalizedDescription = splitExpenseDescription.trim();
    if (normalizedDescription.length < 2) {
      setTripExpenseError('Enter a short description for the expense.');
      return;
    }

    const parsedAmount = Number.parseFloat(splitExpenseAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setTripExpenseError('Enter a valid amount greater than 0.');
      return;
    }

    if (selectedSplitDebtorIds.length === 0) {
      setTripExpenseError('Select at least one trip member who owes part of this bill.');
      return;
    }

    setIsTripExpenseSubmitting(true);
    setTripExpenseError('');
    setIsSplitExpenseSuccessVisible(false);

    try {
      const summary = await splitTripExpense(
        {
          tripId: tripExpenseSummary.trip.id,
          description: normalizedDescription,
          amount: parsedAmount,
          debtorIds: selectedSplitDebtorIds,
        },
        currentAuthToken,
      );
      setTripExpenseSummary(summary);
      const nextWalletSummary = await fetchWalletSummary(currentAuthToken);
      setWalletSummary(nextWalletSummary);
      setSplitExpenseDescription('');
      setSplitExpenseAmount('');
      setSelectedSplitDebtorIds(
        summary.members.filter((member) => member.id !== userSession?.id).map((member) => member.id),
      );
      setIsSplitExpenseSuccessVisible(true);
      setSystemNotice('Bill Split!');
    } catch (error) {
      const isUnauthorized = error instanceof Error && error.message === 'Unauthorized request.';
      if (isUnauthorized) {
        clearStoredAuthState();
        setHydratedProfileToken(null);
        setUserSession(null);
        setCurrentScreen('auth');
        setSystemNotice('Your session expired. Please sign in again.');
        setTripExpenseError('Please sign in again to add an expense.');
        return;
      }

      setTripExpenseError(error instanceof Error ? error.message : 'Unable to split this expense right now.');
    } finally {
      setIsTripExpenseSubmitting(false);
    }
  };

  const handleExpenseUpdateSubmit = async () => {
    const currentAuthToken =
      typeof window === 'undefined' ? authToken : window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim() || authToken;

    if (!currentAuthToken || !editingExpenseId) {
      setTripExpenseError('Sign in again to update this expense.');
      return;
    }

    const normalizedDescription = editingExpenseDescription.trim();
    if (normalizedDescription.length < 2) {
      setTripExpenseError('Enter a short description for the expense.');
      return;
    }

    const parsedAmount = Number.parseFloat(editingExpenseAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setTripExpenseError('Enter a valid amount greater than 0.');
      return;
    }

    if (editingExpenseDebtorIds.length === 0) {
      setTripExpenseError('Select at least one trip member who owes part of this bill.');
      return;
    }

    setIsExpenseUpdateSubmitting(true);
    setTripExpenseError('');

    try {
      const summary = await updateTripExpense(
        editingExpenseId,
        {
          description: normalizedDescription,
          amount: parsedAmount,
          debtorIds: editingExpenseDebtorIds,
        },
        currentAuthToken,
      );
      setTripExpenseSummary(summary);
      const nextWalletSummary = await fetchWalletSummary(currentAuthToken);
      setWalletSummary(nextWalletSummary);
      handleCloseExpenseEdit();
      setSystemNotice('Expense updated.');
    } catch (error) {
      const isUnauthorized = error instanceof Error && error.message === 'Unauthorized request.';
      if (isUnauthorized) {
        clearStoredAuthState();
        setHydratedProfileToken(null);
        setUserSession(null);
        setCurrentScreen('auth');
        setSystemNotice('Your session expired. Please sign in again.');
        setTripExpenseError('Please sign in again to update this expense.');
        return;
      }

      setTripExpenseError(error instanceof Error ? error.message : 'Unable to update this expense right now.');
    } finally {
      setIsExpenseUpdateSubmitting(false);
    }
  };

  const handleExpenseDelete = async (expenseId: string) => {
    const currentAuthToken =
      typeof window === 'undefined' ? authToken : window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim() || authToken;

    if (!currentAuthToken) {
      setTripExpenseError('Sign in again to delete this expense.');
      return;
    }

    setDeletingExpenseId(expenseId);
    setTripExpenseError('');

    try {
      const summary = await deleteTripExpense(expenseId, currentAuthToken);
      setTripExpenseSummary(summary);
      const nextWalletSummary = await fetchWalletSummary(currentAuthToken);
      setWalletSummary(nextWalletSummary);
      if (editingExpenseId === expenseId) {
        handleCloseExpenseEdit();
      }
      setSystemNotice('Expense deleted.');
    } catch (error) {
      const isUnauthorized = error instanceof Error && error.message === 'Unauthorized request.';
      if (isUnauthorized) {
        clearStoredAuthState();
        setHydratedProfileToken(null);
        setUserSession(null);
        setCurrentScreen('auth');
        setSystemNotice('Your session expired. Please sign in again.');
        setTripExpenseError('Please sign in again to delete this expense.');
        return;
      }

      setTripExpenseError(error instanceof Error ? error.message : 'Unable to delete this expense right now.');
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleWalletRelease = (entry: WalletSummaryEntry) => {
    setActiveWalletPanel(null);
    setWalletReleaseEntry(entry);
    setWalletReleaseAmount(entry.amount.toFixed(2));
    setWalletError('');
  };

  const handleWalletParticipantSelect = (participantEntry: {
    userId: string;
    payableEntry: WalletSummaryEntry | null;
    name: string;
    avatar: string | null;
    tripId: string;
    tripTitle: string;
    totalOwesAmount: number;
    netBalanceAmount: number;
  }) => {
    if (participantEntry.netBalanceAmount <= 0) {
      setWalletError(`No payable amount is available for ${participantEntry.name} right now.`);
      return;
    }

    handleWalletRelease(
      {
        id: `paid:${participantEntry.tripId}:${participantEntry.userId}`,
        tripId: participantEntry.tripId,
        tripTitle: participantEntry.tripTitle,
        recipientUserId: participantEntry.userId,
        recipientName: participantEntry.name,
        recipientAvatar: participantEntry.avatar,
        amount: participantEntry.netBalanceAmount,
      },
    );
  };

  const handleWalletReleaseConfirm = async () => {
    const currentAuthToken =
      typeof window === 'undefined' ? authToken : window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim() || authToken;
    const entry = walletReleaseEntry;

    if (!currentAuthToken || !entry) {
      setWalletError('Please sign in again to release this payment.');
      return;
    }

    const parsedAmount = Number.parseFloat(walletReleaseAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setWalletError('Enter a valid release amount greater than 0.');
      return;
    }

    if (parsedAmount > entry.amount) {
      setWalletError('Release amount exceeds the total payable.');
      return;
    }

    setWalletReleaseKey(entry.id);
    setWalletError('');

    try {
      const nextSummary = await releaseWalletPayment(
        {
          tripId: entry.tripId,
          recipientUserId: entry.recipientUserId,
          amount: parsedAmount,
        },
        currentAuthToken,
      );
      setWalletSummary(nextSummary);
      setWalletReleaseEntry(null);
      setWalletReleaseAmount('');
      setSystemNotice(`Paid $${parsedAmount.toFixed(2)} to ${entry.recipientName}. Your wallet balance has been updated.`);
    } catch (error) {
      const isUnauthorized = error instanceof Error && error.message === 'Unauthorized request.';
      if (isUnauthorized) {
        clearStoredAuthState();
        setHydratedProfileToken(null);
        setUserSession(null);
        setCurrentScreen('auth');
        setSystemNotice('Your session expired. Please sign in again.');
        return;
      }

      setWalletError(error instanceof Error ? error.message : 'Unable to release this payment right now.');
    } finally {
      setWalletReleaseKey(null);
    }
  };

  const handleSOS = () => {
    const triggerEmergency = (message: string) => {
      setIsEmergencyAlertActive(true);
      setEmergencyMessage(message);
    };

    if (!navigator.geolocation) {
      triggerEmergency('Emergency Alert: GPS not supported on this device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('SOS GPS coordinates:', { latitude, longitude });
        triggerEmergency(`Emergency Alert active at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}.`);
      },
      (error) => {
        console.log('SOS GPS error:', error.message);
        triggerEmergency(`Emergency Alert active. GPS unavailable: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const totalSharedCost = useMemo(
    () => expenseCategories.reduce((total, category) => total + costs[category], 0),
    [costs],
  );

  const isSocialExperienceScreen =
    currentScreen === 'home' || currentScreen === 'discovery' || currentScreen === 'dashboard';

  const isWorkspaceScreen =
    currentScreen === 'dashboard' || currentScreen === 'expenses' || currentScreen === 'chat';

  const sidebarTargetById: Record<string, ScreenName> = {
    'my-trips': 'dashboard',
    wallet: 'wallet',
    support: 'chat',
    'safety-center': 'dashboard',
  };

  const getTopNavClass = (screen: ScreenName) => {
    const isSocialActive =
      userSession && isSocialExperienceScreen
        ? (screen === 'discovery' && activeView === 'feed') || (screen === 'dashboard' && activeView === 'dashboard')
        : false;

    return currentScreen === screen || isSocialActive
      ? 'border-b-2 border-accent text-accent'
      : 'border-b-2 border-transparent text-primary/80 transition hover:text-primary';
  };
  const getSocialTopNavClass = (view: ActiveView) =>
    userSession && isSocialExperienceScreen && activeView === view
      ? 'border-b-2 border-accent text-accent'
      : 'border-b-2 border-transparent text-primary/80 transition hover:text-primary';

  const getSidebarClass = (screen: ScreenName) =>
    currentScreen === screen
      ? 'flex w-full items-center gap-3 rounded-card bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-sm'
      : 'flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5';

  const renderProfileScreen = () => {
    const displayName = getDisplayName(profileForm.firstName, profileForm.lastName, userSession?.name ?? 'Traveler');
    const profileInitial = displayName.charAt(0).toUpperCase() || 'T';
    const inputClassName =
      'interactive-input w-full rounded-card border border-primary/15 bg-background/80 px-4 py-3 text-sm text-primary outline-none disabled:cursor-not-allowed disabled:bg-background/40 disabled:text-primary/70';

    return (
      <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
        <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Profile</p>
              <h2 className="mt-1 text-3xl font-black text-primary">{displayName}</h2>
              <p className="mt-1 text-sm text-primary/80">Update your profile details from the side menu.</p>
            </div>
            {userSession?.isVerified ? (
              <span className="rounded-full bg-success/20 px-4 py-2 text-sm font-semibold text-primary ring-1 ring-success/40">
                Verified User
              </span>
            ) : (
              <span className="rounded-full bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                Pending Verification
              </span>
            )}
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleProfileSubmit} noValidate>
            <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-1 ring-primary/20">
                    {profileForm.profileImageDataUrl ? (
                      <img
                        src={profileForm.profileImageDataUrl}
                        alt="Profile preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-black text-primary">{profileInitial}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">Profile Picture</p>
                    <p className="text-xs text-primary/75">Select and upload from gallery.</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  disabled={!isProfileEditing}
                  className="text-sm text-primary file:mr-3 file:rounded-card file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              {profileErrors.profileImageDataUrl ? (
                <p className="mt-2 text-xs font-medium text-red-600">{profileErrors.profileImageDataUrl}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-primary">First Name</span>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(event) => handleProfileFieldChange('firstName', event.target.value)}
                  disabled={!isProfileEditing}
                  className={inputClassName}
                  placeholder="Enter first name"
                />
                {profileErrors.firstName ? (
                  <p className="mt-1 text-xs font-medium text-red-600">{profileErrors.firstName}</p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-primary">Last Name</span>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(event) => handleProfileFieldChange('lastName', event.target.value)}
                  disabled={!isProfileEditing}
                  className={inputClassName}
                  placeholder="Enter last name"
                />
                {profileErrors.lastName ? (
                  <p className="mt-1 text-xs font-medium text-red-600">{profileErrors.lastName}</p>
                ) : null}
              </label>

              <div className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-primary">Mobile Number</span>
                <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                  <div>
                    <select
                      value={profileForm.countryCode}
                      onChange={(event) => handleProfileFieldChange('countryCode', event.target.value)}
                      disabled={!isProfileEditing}
                      className={inputClassName}
                    >
                      {countryCodeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {profileErrors.countryCode ? (
                      <p className="mt-1 text-xs font-medium text-red-600">{profileErrors.countryCode}</p>
                    ) : null}
                  </div>

                  <div>
                    <input
                      type="tel"
                      value={profileForm.mobileNumber}
                      onChange={(event) => handleMobileNumberChange(event.target.value)}
                      disabled={!isProfileEditing}
                      className={inputClassName}
                      placeholder="(xxx)-xxx-xxxx"
                    />
                    {profileErrors.mobileNumber ? (
                      <p className="mt-1 text-xs font-medium text-red-600">{profileErrors.mobileNumber}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-primary">Email</span>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => handleProfileFieldChange('email', event.target.value)}
                  disabled={!isProfileEditing}
                  className={inputClassName}
                  placeholder="Enter email address"
                />
                {profileErrors.email ? (
                  <p className="mt-1 text-xs font-medium text-red-600">{profileErrors.email}</p>
                ) : null}
              </label>
            </div>

            <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
              <p className="text-sm font-semibold text-primary">Verified Document</p>
              {userSession?.isVerified ? (
                <p className="mt-2 rounded-card bg-success/20 px-3 py-2 text-sm font-semibold text-primary ring-1 ring-success/40">
                  Your document is verified.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-primary/75">
                    Upload an identity document. Successful upload marks your profile as verified.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      accept=".pdf,image/*,.doc,.docx"
                      onChange={handleVerificationDocumentSelect}
                      disabled={isVerificationUploading}
                      className="text-sm text-primary file:mr-3 file:rounded-card file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleUploadVerificationDocument}
                      disabled={isVerificationUploading || !verificationDocumentFile}
                      className="interactive-btn rounded-card bg-success px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isVerificationUploading ? 'Uploading...' : 'Upload Document'}
                    </button>
                  </div>
                  {verificationDocumentFile ? (
                    <p className="mt-2 text-xs text-primary/80">Selected: {verificationDocumentFile.name}</p>
                  ) : null}
                  {verificationDocumentError ? (
                    <p className="mt-2 text-xs font-medium text-red-600">{verificationDocumentError}</p>
                  ) : null}
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {isProfileEditing ? (
                <>
                  <button
                    type="submit"
                    disabled={isProfileSaving}
                    className="interactive-btn rounded-card bg-accent px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    {isProfileSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={handleProfileCancel}
                    disabled={isProfileSaving}
                    className="interactive-btn rounded-card border border-primary/20 bg-background/80 px-5 py-2.5 text-sm font-semibold text-primary"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    handleProfileEdit();
                  }}
                  className="interactive-btn rounded-card bg-primary px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Edit
                </button>
              )}
            </div>
          </form>
        </article>
      </section>
    );
  };

  const renderHistoryScreen = () => {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
        <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Trip Archive</p>
          <h2 className="mt-1 text-3xl font-black text-primary">Completed Journeys</h2>
          <p className="mt-2 text-sm text-primary/80">Archived completed trips: {completedTripsCount}</p>

          <div className="mt-6 space-y-3">
            {archivedMyPosts.length > 0 ? (
              archivedMyPosts.map((post) => (
                <div key={post.id} className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-primary">{post.title}</p>
                    <span className="rounded-full bg-success/20 px-3 py-1 text-xs font-semibold text-primary">
                      Archived
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-primary/80">{post.location}</p>
                  <p className="mt-2 text-xs text-primary/70">
                    {new Date(post.startDate).toLocaleDateString()} to {new Date(post.endDate).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-card bg-background/80 p-4 text-sm text-primary/80 ring-1 ring-primary/10">
                No completed trips in your archive yet.
              </div>
            )}
          </div>
        </article>
      </section>
    );
  };

  const renderWalletScreenLegacy = () => null;
  /*
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
      <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Wallet</p>
        <h2 className="mt-1 text-3xl font-black text-primary">Escrow, Payments, and Split Bills</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-card bg-primary p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Total Paid</p>
            <p className="mt-1 text-2xl font-black">${escrowStats.totalPaid.toFixed(2)}</p>
          </div>
          <div className="rounded-card bg-success p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Released</p>
            <p className="mt-1 text-2xl font-black">${escrowStats.totalReleased.toFixed(2)}</p>
          </div>
          <div className="rounded-card bg-accent p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Still in Escrow</p>
            <p className="mt-1 text-2xl font-black">${escrowStats.inEscrow.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-card border border-primary/10 bg-background/55 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Split Bill By Trip</p>
            <h3 className="mt-1 text-xl font-bold text-primary">Add a shared expense</h3>
            <p className="mt-2 text-sm text-primary/75">
              Hosts and joined users can split an expense equally across everyone in the trip.
            </p>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-primary">Trip ID</span>
              <input
                type="text"
                value={splitTripId}
                onChange={(event) => setSplitTripId(event.target.value)}
                className="w-full rounded-card border border-primary/15 bg-white px-3 py-2.5 text-sm text-primary outline-none ring-accent/30 transition focus:ring-2"
                placeholder="Enter trip id"
              />
            </label>

            {splitEligiblePosts.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {splitEligiblePosts.slice(0, 8).map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setSplitTripId(post.id)}
                    className={
                      splitTripId === post.id
                        ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white'
                        : 'rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/15'
                    }
                  >
                    {post.title}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-primary/65">No joined or hosted active trips are loaded yet.</p>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-[1.5fr_1fr]">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-primary">Description</span>
                <input
                  type="text"
                  value={splitExpenseDescription}
                  onChange={(event) => setSplitExpenseDescription(event.target.value)}
                  className="w-full rounded-card border border-primary/15 bg-white px-3 py-2.5 text-sm text-primary outline-none ring-accent/30 transition focus:ring-2"
                  placeholder="Dinner, Gas, Airbnb"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-primary">Amount</span>
                <div className="flex rounded-card border border-primary/15 bg-white px-3 py-2.5">
                  <span className="mr-2 text-sm font-semibold text-primary/70">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={splitExpenseAmount}
                    onChange={(event) => setSplitExpenseAmount(event.target.value)}
                    className="w-full bg-transparent text-sm text-primary outline-none"
                    placeholder="0.00"
                  />
                </div>
              </label>
            </div>

            <button
              type="button"
              onClick={() => void handleSplitExpenseSubmit()}
              disabled={isTripExpenseSubmitting || isTripExpenseLoading}
              className="interactive-btn mt-4 rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isTripExpenseSubmitting ? 'Splitting...' : 'Add Expense'}
            </button>

            {tripExpenseError ? (
              <p className="mt-3 rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {tripExpenseError}
              </p>
            ) : null}

            {tripExpenseSummary ? (
              <>
                <div className="mt-6 overflow-hidden rounded-card border border-primary/10 bg-white shadow-sm">
                  {tripExpenseSummary.trip.imageUrl ? (
                    <img
                      src={tripExpenseSummary.trip.imageUrl}
                      alt={tripExpenseSummary.trip.title}
                      className="h-40 w-full object-cover"
                    />
                  ) : null}
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Selected Trip</p>
                    <h4 className="mt-1 text-lg font-bold text-primary">{tripExpenseSummary.trip.title}</h4>
                    <p className="mt-1 text-sm text-primary/75">{tripExpenseSummary.trip.location}</p>
                    <p className="mt-2 text-xs text-primary/60">Trip ID: {tripExpenseSummary.trip.id}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-sm font-semibold text-primary">Equal split preview</p>
                  <div className="mt-3 space-y-2">
                    {splitPreviewMembers.length > 0 ? (
                      splitPreviewMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-card border border-primary/10 bg-white px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {member.avatar ? (
                                <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                              ) : (
                                member.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-primary">{member.name}</p>
                              <p className="text-xs text-primary/65">{member.isHost ? 'Host' : 'Trip member'}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-red-600">Owes: ${member.owesAmount.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-card bg-white px-3 py-2 text-sm text-primary/70 ring-1 ring-primary/10">
                        Enter an amount to preview how this expense will be split.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : isTripExpenseLoading ? (
              <p className="mt-4 text-sm text-primary/70">Loading trip split summary...</p>
            ) : null}
          </section>

          <section className="space-y-4">
            <article className="rounded-card border border-primary/10 bg-background/55 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Total Settlement</p>
              <h3 className="mt-1 text-xl font-bold text-primary">Who owes whom</h3>
              <div className="mt-4 space-y-3">
                {tripExpenseSummary && tripExpenseSummary.settlementSummary.length > 0 ? (
                  tripExpenseSummary.settlementSummary.map((settlement) => (
                    <div
                      key={`${settlement.fromUserId}-${settlement.toUserId}`}
                      className="flex items-center justify-between rounded-card border border-primary/10 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-red-600">{settlement.fromName}</p>
                        <p className="text-xs text-primary/70">owes {settlement.toName}</p>
                      </div>
                      <span className="text-sm font-bold text-green-700">${settlement.amount.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-card bg-white px-4 py-3 text-sm text-primary/70 ring-1 ring-primary/10">
                    Add the first expense to generate a settlement summary for this trip.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-card border border-primary/10 bg-background/55 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Trip Expenses</p>
                  <h3 className="mt-1 text-xl font-bold text-primary">Recorded split bills</h3>
                </div>
                <div className="rounded-card bg-primary px-3 py-2 text-right text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">Total</p>
                  <p className="text-lg font-black">${tripExpenseSummary?.totalExpenses.toFixed(2) ?? '0.00'}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {tripExpenseSummary && tripExpenseSummary.expenses.length > 0 ? (
                  tripExpenseSummary.expenses.map((expense) => (
                    <div key={expense.id} className="rounded-card border border-primary/10 bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-primary">{expense.description}</p>
                          <p className="text-xs text-primary/70">
                            Paid by {expense.paidBy.name} / Split ${expense.splitAmount.toFixed(2)} each
                          </p>
                        </div>
                        <span className="text-sm font-bold text-primary">${expense.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-card bg-white px-4 py-3 text-sm text-primary/70 ring-1 ring-primary/10">
                    No expenses recorded for this trip yet.
                  </p>
                )}
              </div>
            </article>
          </section>
        </div>
      </article>
    </section>
  );
  */

  void renderWalletScreenLegacy;

  const renderWalletScreen = () => (
    <section className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-8 sm:px-6">
      <article className="overflow-hidden rounded-[38px] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,251,244,0.9))] p-5 shadow-[0_38px_120px_-58px_rgba(25,33,52,0.75)] ring-1 ring-white/60 backdrop-blur-2xl sm:p-7 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/78 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/55 shadow-sm shadow-slate-950/5">
              <Sparkles className="h-3.5 w-3.5" />
              Split Bills
            </div>
            <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-primary sm:text-4xl">
              Split expenses with a premium travel ledger.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-primary/65 sm:text-[15px]">
              Your active trip stays loaded automatically, and the split preview updates live as you choose the travelers who were in on it.
            </p>
          </div>

          <div className="grid gap-3 pl-1 pr-3 sm:grid-cols-3 sm:pl-2 sm:pr-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveWalletPanel((previous) => (previous === 'payables' ? null : 'payables'))}
                className="interactive-btn w-full min-w-[210px] rounded-[28px] bg-[linear-gradient(145deg,rgba(61,64,91,0.98),rgba(90,96,136,0.9))] px-4 py-4 text-center text-white shadow-xl shadow-primary/20 sm:text-left"
              >
                <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70 sm:justify-start">
                  <WalletCards className="h-4 w-4" />
                  Total Due
                </div>
                <AnimatedAmount className="mt-3 block text-2xl font-black" value={tripScopedPayableAmount} />
              </button>

              <AnimatePresence>
                {activeWalletPanel === 'payables' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 z-20 mt-3 w-[340px] max-w-[90vw] rounded-[30px] bg-white/94 p-4 shadow-[0_32px_80px_-36px_rgba(17,24,39,0.55)] backdrop-blur-2xl"
                  >
                    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45">
                      Trip joiners and balances
                    </p>
                    <div className="mt-3 space-y-2.5">
                      {selectedTripParticipantEntries.length ? (
                        selectedTripParticipantEntries.map((entry) => (
                          <div key={entry.id} className="rounded-[24px] bg-background/65 px-3.5 py-3 shadow-sm shadow-slate-950/5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">
                                {entry.avatar ? (
                                  <img src={entry.avatar} alt={entry.name} className="h-full w-full object-cover" />
                                ) : (
                                  entry.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-primary">{entry.name}</p>
                                <p className="truncate text-xs text-primary/55">{entry.tripTitle}</p>
                              </div>
                              <span className="text-sm font-black text-red-600">{formatCurrency(entry.netBalanceAmount)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-[24px] bg-background/65 px-3.5 py-3 text-sm text-primary/65">
                          No joiners with payable balances right now.
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveWalletPanel((previous) => (previous === 'release' ? null : 'release'))}
                className="interactive-btn w-full min-w-[210px] rounded-[28px] bg-[linear-gradient(145deg,rgba(129,178,154,0.98),rgba(98,149,126,0.95))] px-4 py-4 text-center text-white shadow-xl shadow-success/20"
              >
                <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                  <Coins className="h-4 w-4" />
                  Settle Up
                </div>
                <AnimatedAmount className="mt-3 block text-2xl font-black" value={tripScopedPayableAmount} />
              </button>

              <AnimatePresence>
                {activeWalletPanel === 'release' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 z-20 mt-3 w-[340px] max-w-[90vw] rounded-[30px] bg-white/94 p-4 shadow-[0_32px_80px_-36px_rgba(17,24,39,0.55)] backdrop-blur-2xl"
                  >
                    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45">
                      Choose a traveler to settle
                    </p>
                    <div className="mt-3 space-y-2.5">
                      {selectedTripParticipantEntries.length ? (
                        selectedTripParticipantEntries.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => handleWalletParticipantSelect(entry)}
                            className="interactive-btn w-full rounded-[24px] bg-background/65 px-3.5 py-3 text-left shadow-sm shadow-slate-950/5"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-success/15 text-sm font-bold text-primary">
                                {entry.avatar ? (
                                  <img src={entry.avatar} alt={entry.name} className="h-full w-full object-cover" />
                                ) : (
                                  entry.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-primary">{entry.name}</p>
                                <p className="truncate text-xs text-primary/55">{entry.tripTitle}</p>
                              </div>
                              <span className="text-sm font-black text-success">{formatCurrency(entry.netBalanceAmount)}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="rounded-[24px] bg-background/65 px-3.5 py-3 text-sm text-primary/65">
                          No joiners with payable balances right now.
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="min-w-[210px] rounded-[28px] bg-[linear-gradient(145deg,rgba(224,122,95,0.98),rgba(227,154,98,0.92))] px-4 py-4 text-center text-white shadow-xl shadow-accent/20 sm:text-right">
              <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72 sm:justify-end">
                <CircleDollarSign className="h-4 w-4" />
                Escrow
              </div>
              <AnimatedAmount className="mt-3 block text-2xl font-black" value={escrowStats.inEscrow} />
            </div>
          </div>
        </div>

        {walletError ? (
          <p className="mt-5 rounded-[24px] bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg shadow-red-200/50">{walletError}</p>
        ) : null}
        {isWalletLoading ? <p className="mt-5 text-sm text-primary/60">Refreshing wallet balances...</p> : null}

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <section className="space-y-6">
            <article className="overflow-hidden rounded-[36px] bg-[linear-gradient(145deg,rgba(61,64,91,0.14),rgba(129,178,154,0.18),rgba(255,255,255,0.8))] p-1 shadow-[0_36px_95px_-52px_rgba(28,37,58,0.8)]">
              {tripExpenseSummary ? (
                <div className="relative overflow-hidden rounded-[32px] bg-white/34 px-5 py-6 backdrop-blur-2xl sm:px-6 sm:py-7">
                  {tripExpenseSummary.trip.imageUrl ? (
                    <>
                      <img
                        src={tripExpenseSummary.trip.imageUrl}
                        alt={tripExpenseSummary.trip.title}
                        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-20"
                      />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_55%),linear-gradient(180deg,rgba(255,251,244,0.68),rgba(255,255,255,0.72))]" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,178,154,0.24),transparent_30%),radial-gradient(circle_at_top_right,rgba(224,122,95,0.22),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,251,244,0.88))]" />
                  )}

                  <div className="relative z-10">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/50 shadow-sm shadow-slate-950/5">
                          <ReceiptText className="h-3.5 w-3.5" />
                          Active Trip
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45 shadow-sm shadow-slate-950/5">
                          <MapPin className="h-3.5 w-3.5" />
                          {tripExpenseSummary.trip.location}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45 shadow-sm shadow-slate-950/5">
                          <Users className="h-3.5 w-3.5" />
                          {tripExpenseSummary.members.length} travelers
                        </span>
                      </div>

                      <h3 className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-primary sm:text-4xl">
                        {tripExpenseSummary.trip.title}
                      </h3>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-primary/62">
                        A calm, live snapshot of your shared spend. Add one bill and everyone sees the split before you save it.
                      </p>
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-6 xl:flex-row xl:justify-center xl:gap-10">
                      <div className="min-w-[220px] rounded-[34px] bg-white/72 px-7 py-6 text-center shadow-xl shadow-slate-950/10 backdrop-blur-xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/45">Trip Total</p>
                        <AnimatedAmount className="mt-3 block text-4xl font-black tracking-tight text-primary" value={tripExpenseSummary.totalExpenses} />
                        <p className="mt-3 text-xs font-medium text-primary/50">
                          Across {tripExpenseSummary.expenses.length} shared expense{tripExpenseSummary.expenses.length === 1 ? '' : 's'}
                        </p>
                      </div>

                      <LiquidSplitMeter
                        fillRatio={splitHeroLiquidRatio}
                        label={splitPreviewAmount > 0 ? `Previewing ${formatCurrency(splitPreviewAmount)}` : 'Waiting for an amount'}
                        valueLabel={`${Math.round(splitHeroLiquidRatio * 100)}% full`}
                      />

                      <div className="min-w-[220px] rounded-[34px] bg-white/72 px-7 py-6 text-center shadow-xl shadow-slate-950/10 backdrop-blur-xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/45">Split Share</p>
                        <AnimatedAmount className="mt-3 block text-4xl font-black tracking-tight text-primary" value={splitPreviewShareAmount} />
                        <p className="mt-3 text-xs font-medium text-primary/50">
                          Per selected traveler in this current split preview
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-4 lg:grid-cols-[1.45fr_0.95fr]">
                      <FloatingLabelField
                        label="Description"
                        value={splitExpenseDescription}
                        onChange={(event) => setSplitExpenseDescription(event.target.value)}
                      />
                      <FloatingLabelField
                        badge="USD"
                        inputMode="decimal"
                        label="Amount"
                        min={0}
                        step="0.01"
                        type="number"
                        value={splitExpenseAmount}
                        onChange={(event) => setSplitExpenseAmount(event.target.value)}
                      />
                    </div>

                    <div className="mt-5">
                      <ExpenseParticipantChecklist
                        title="Tap the travelers joining this split"
                        helperText="Avatar chips animate in with a physical press so you can see exactly who is included before you save."
                        items={splitParticipantChips}
                        onToggle={handleSplitParticipantToggle}
                        selectedCountLabel={`${selectedSplitDebtorIds.length + 1} selected`}
                      />
                    </div>

                    <div className="mt-5 flex flex-col gap-4 rounded-[32px] bg-white/68 px-5 py-4 shadow-xl shadow-slate-950/8 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45">Split Preview</p>
                        <p className="mt-2 text-sm text-primary/68">
                          {splitPreviewAmount > 0 && splitSelectedMemberCount > 0
                            ? `${splitSelectedMemberCount} travelers are sharing ${formatCurrency(splitPreviewAmount)} and each checked traveler owes ${formatCurrency(splitPreviewShareAmount)}.`
                            : 'Enter an amount, then tap the travelers who should be included in this shared expense.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleSplitExpenseSubmit()}
                        disabled={isTripExpenseSubmitting || isTripExpenseLoading}
                        className={`interactive-btn inline-flex items-center justify-center gap-2 rounded-[24px] px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-950/15 transition disabled:cursor-not-allowed disabled:opacity-55 ${
                          isSplitExpenseSuccessVisible
                            ? 'bg-[linear-gradient(145deg,rgba(129,178,154,1),rgba(104,154,130,0.96))]'
                            : 'bg-[linear-gradient(145deg,rgba(61,64,91,1),rgba(73,78,121,0.96))]'
                        }`}
                      >
                        {isTripExpenseSubmitting ? (
                          'Saving...'
                        ) : isSplitExpenseSuccessVisible ? (
                          <>
                            <BadgeCheck className="h-4 w-4" />
                            Bill Split!
                          </>
                        ) : (
                          <>
                            Save expense
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : isTripExpenseLoading ? (
                <div className="rounded-[32px] bg-white/65 px-5 py-8 text-sm text-primary/70">Loading trip split summary...</div>
              ) : (
                <div className="rounded-[32px] bg-white/65 px-5 py-8 shadow-xl shadow-slate-950/8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45">No Active Trip</p>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-primary/65">
                    No active trip is available right now. Once a trip is live for today, this screen will load it automatically.
                  </p>
                </div>
              )}

              {tripExpenseError ? (
                <p className="mt-4 rounded-[24px] bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg shadow-red-200/55">
                  {tripExpenseError}
                </p>
              ) : null}
            </article>
          </section>

          <section className="space-y-6">
            <article className="rounded-[34px] bg-white/88 p-5 shadow-[0_28px_80px_-42px_rgba(17,24,39,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45">Balances</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-primary">Who should pay whom</h3>
                </div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/6 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {tripExpenseSummary && tripExpenseSummary.settlementSummary.length > 0 ? (
                  tripExpenseSummary.settlementSummary.map((settlement) => (
                    <div
                      key={`${settlement.fromUserId}-${settlement.toUserId}`}
                      className="rounded-[26px] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(249,246,236,0.98))] px-4 py-4 shadow-lg shadow-slate-950/8"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary">{settlement.fromName}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-primary/45">owes {settlement.toName}</p>
                        </div>
                        <div className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-bold text-red-600">
                          {formatCurrency(settlement.amount)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <ExpenseEmptyState
                    title="Settlements will appear here"
                    description="As soon as the first shared expense lands, we'll show who should pay whom in a cleaner settlement flow."
                  />
                )}
              </div>
            </article>

            <article className="rounded-[34px] bg-white/88 p-5 shadow-[0_28px_80px_-42px_rgba(17,24,39,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45">Member Summary</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-primary">Net balances</h3>
                </div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-success/12 text-success">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {tripExpenseSummary && tripExpenseSummary.balances.length > 0 ? (
                  tripExpenseSummary.balances.map((balance) => {
                    const magnitude = Math.max(Math.abs(balance.netBalance), balance.totalOwed, balance.totalReceivable, 0);
                    const widthPercent = Math.max(12, Math.round((magnitude / maxTripBalanceMagnitude) * 100));
                    const isPositive = balance.netBalance >= 0;

                    return (
                      <div
                        key={balance.userId}
                        className="rounded-[28px] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(249,246,236,0.98))] px-4 py-4 shadow-lg shadow-slate-950/8"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">
                              {balance.avatar ? (
                                <img src={balance.avatar} alt={balance.name} className="h-full w-full object-cover" />
                              ) : (
                                balance.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-primary">{balance.name}</p>
                              <p className="text-xs text-primary/55">
                                Spent {formatCurrency(balance.totalSpent ?? 0)} / Equal share {formatCurrency(balance.equalShare ?? 0)}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${
                              isPositive ? 'bg-success/15 text-green-700' : 'bg-red-50 text-red-600'
                            }`}
                          >
                            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {isPositive ? '+' : '-'}
                            {formatCurrency(Math.abs(balance.netBalance))}
                          </div>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary/8">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${widthPercent}%` }}
                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                            className={`h-full rounded-full ${
                              isPositive
                                ? 'bg-[linear-gradient(90deg,rgba(129,178,154,0.95),rgba(172,214,195,0.95))]'
                                : 'bg-[linear-gradient(90deg,rgba(224,122,95,0.92),rgba(246,185,166,0.9))]'
                            }`}
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-primary/52">
                          <span>{isPositive ? 'Should receive' : 'Still owes'} {formatCurrency(Math.abs(balance.netBalance))}</span>
                          <span>{balance.totalReceivable > 0 ? `Receivable ${formatCurrency(balance.totalReceivable)}` : `Owes ${formatCurrency(balance.totalOwed)}`}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <ExpenseEmptyState
                    title="No balance data yet"
                    description="Member balances will animate into view after the first shared expense, complete with visual bars for who owes and who should receive."
                  />
                )}
              </div>
            </article>

            <article className="rounded-[34px] bg-white/88 p-5 shadow-[0_28px_80px_-42px_rgba(17,24,39,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45">Recent Expenses</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-primary">Trip activity</h3>
                </div>
                <div className="rounded-[24px] bg-[linear-gradient(145deg,rgba(61,64,91,1),rgba(73,78,121,0.96))] px-4 py-3 text-right text-white shadow-lg shadow-primary/20">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">Total</p>
                  <AnimatedAmount className="mt-2 block text-xl font-black" value={tripExpenseSummary?.totalExpenses ?? 0} />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <AnimatePresence mode="popLayout">
                  {tripExpenseSummary && tripExpenseSummary.expenses.length > 0
                    ? tripExpenseSummary.expenses.map((expense) => (
                        <ExpenseItem
                          key={expense.id}
                          expense={expense}
                          currentUserId={userSession?.id}
                          canEdit={Boolean(userSession?.id)}
                          isDeleting={deletingExpenseId === expense.id}
                          onDelete={(expenseId) => void handleExpenseDelete(expenseId)}
                          onEdit={handleOpenExpenseEdit}
                        />
                      ))
                    : null}
                </AnimatePresence>

                {tripExpenseSummary && tripExpenseSummary.expenses.length === 0 ? (
                  <ExpenseEmptyState
                    title="No expenses recorded yet"
                    description="Your shared receipts will land here with a soft pop animation, so the ledger stays playful instead of feeling like a spreadsheet."
                  />
                ) : null}
              </div>
            </article>
          </section>
        </div>

	        {editingExpenseId && tripExpenseSummary ? (
	          <div className="fixed inset-0 z-30 flex items-center justify-center bg-primary/30 px-4 backdrop-blur-sm">
	            <div className="w-full max-w-2xl overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,250,244,0.94))] shadow-[0_40px_120px_-58px_rgba(17,24,39,0.75)] ring-1 ring-white/60">
              <div className="bg-[linear-gradient(135deg,rgba(61,64,91,0.98),rgba(129,178,154,0.95))] px-6 py-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Edit Expense</p>
                    <h3 className="mt-2 text-2xl font-black">Adjust the bill details</h3>
                    <p className="mt-1 text-sm text-white/80">
                      Any trip participant can edit the split. The last editor is stored in the audit trail.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseExpenseEdit}
                    className="rounded-full bg-white/10 p-2 text-white ring-1 ring-white/20 transition hover:bg-white/15"
                    aria-label="Close expense editor"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

	              <div className="space-y-5 p-6">
	                <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
	                  <FloatingLabelField
	                    autoFocus
	                    label="Description"
	                    value={editingExpenseDescription}
	                    onChange={(event) => setEditingExpenseDescription(event.target.value)}
	                  />
	                  <FloatingLabelField
	                    badge="USD"
	                    inputMode="decimal"
	                    label="Amount"
	                    min={0}
	                    step="0.01"
	                    type="number"
	                    value={editingExpenseAmount}
	                    onChange={(event) => setEditingExpenseAmount(event.target.value)}
	                  />
	                </div>

	                <ExpenseParticipantChecklist
	                  title="Adjust who belongs in this split"
	                  helperText="The chip interactions match the main screen, so you can refine the edit without losing the live split context."
	                  items={editingExpenseParticipantChips}
	                  onToggle={handleEditExpenseParticipantToggle}
	                  selectedCountLabel={`${editingExpenseDebtorIds.length + 1} selected`}
	                />

	                <div className="flex flex-col gap-3 rounded-[28px] bg-white/72 px-5 py-4 shadow-xl shadow-slate-950/8 sm:flex-row sm:items-center sm:justify-between">
	                  <p className="max-w-xl text-sm text-primary/65">
	                    {editingExpensePreviewAmount > 0 && editingExpenseSelectedMemberCount > 0
	                      ? `Each checked traveler owes ${formatCurrency(editingExpenseShareAmount)}.`
	                      : 'Enter the amount, then tap the travelers who should stay included in this expense.'}
	                  </p>
	                  <div className="flex flex-wrap gap-3">
	                    <button
	                      type="button"
	                      onClick={handleCloseExpenseEdit}
	                      className="interactive-btn rounded-[22px] bg-white px-4 py-3 text-sm font-semibold text-primary shadow-lg shadow-slate-950/8"
	                    >
	                      Cancel
	                    </button>
	                    <button
	                      type="button"
	                      onClick={() => void handleExpenseUpdateSubmit()}
	                      disabled={isExpenseUpdateSubmitting}
	                      className="interactive-btn rounded-[22px] bg-[linear-gradient(145deg,rgba(61,64,91,1),rgba(73,78,121,0.96))] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-55"
	                    >
	                      {isExpenseUpdateSubmitting ? 'Saving...' : 'Save Changes'}
	                    </button>
	                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {walletReleaseEntry ? (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-primary/30 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-primary/10">
              <div className="bg-[linear-gradient(135deg,rgba(61,64,91,0.98),rgba(129,178,154,0.95))] px-6 py-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Confirm Payment</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/15 text-lg font-black text-white ring-1 ring-white/20">
                    {walletReleaseEntry.recipientAvatar ? (
                      <img
                        src={walletReleaseEntry.recipientAvatar}
                        alt={walletReleaseEntry.recipientName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      walletReleaseEntry.recipientName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-2xl font-black">{walletReleaseEntry.recipientName}</h3>
                    <p className="truncate text-sm text-white/80">{walletReleaseEntry.tripTitle}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div className="grid gap-4 rounded-[28px] bg-background/55 p-4 ring-1 ring-primary/10 sm:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/55">You are paying</p>
                    <div className="mt-2 rounded-2xl bg-white px-4 py-4 ring-1 ring-primary/10">
                      <p className="text-3xl font-black text-primary">
                        ${Number.parseFloat(walletReleaseAmount || '0').toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-primary/60">This amount will be deducted from your wallet balance.</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/55">Payment Summary</p>
                    <div className="mt-2 space-y-3 rounded-2xl bg-white px-4 py-4 ring-1 ring-primary/10">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-primary/60">Recipient</span>
                        <span className="font-semibold text-primary">{walletReleaseEntry.recipientName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-primary/60">Trip</span>
                        <span className="truncate text-right font-semibold text-primary">{walletReleaseEntry.tripTitle}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-primary/60">Total owed</span>
                        <span className="font-semibold text-primary">${walletReleaseEntry.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-primary">Adjust amount</span>
                  <div className="flex items-center rounded-2xl border border-primary/15 bg-background/70 px-4 py-3 shadow-sm">
                    <span className="mr-3 text-base font-bold text-primary/60">$</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={walletReleaseAmount}
                      onChange={(event) => setWalletReleaseAmount(event.target.value)}
                      className="w-full bg-transparent text-base font-semibold text-primary outline-none"
                    />
                  </div>
                  <p className="mt-2 text-xs text-primary/60">
                    Enter a partial amount or keep the full balance for this payment.
                  </p>
                </label>

                <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-primary/80">
                  Confirming will move the amount from your wallet to {walletReleaseEntry.recipientName}&apos;s account immediately.
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setWalletReleaseEntry(null);
                      setWalletReleaseAmount('');
                    }}
                    disabled={walletReleaseKey === walletReleaseEntry.id}
                    className="rounded-2xl border border-primary/15 bg-white px-5 py-3 text-sm font-semibold text-primary transition hover:bg-background/70 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleWalletReleaseConfirm()}
                    disabled={walletReleaseKey === walletReleaseEntry.id}
                    className="interactive-btn rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {walletReleaseKey === walletReleaseEntry.id ? 'Paying...' : 'Confirm Pay'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </article>
    </section>
  );

  const renderCreateTripScreen = () =>
    userSession ? (
      <CreateTripView
        hostName={userSession.name}
        onTripCreated={handleCreateTrip}
      />
    ) : (
      renderAuthScreen()
    );

  const renderSocialExperience = () => (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-6">
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <Sidebar
          activeView={activeView}
          onChangeView={setActiveView}
          userName={userSession?.firstName || userSession?.name || 'Traveler'}
          profileImageDataUrl={userProfileImageSrc}
          badgeProgress={Math.min(100, Math.round((postStats.activeCount / 6) * 100) || 0)}
          onSettingsClick={() => handleNavigation('profile')}
          onLogoutClick={handleSignOut}
        />
        <section className="rounded-card border border-primary/10 bg-white/85 p-4 shadow-lg sm:p-5">
          {activeView === 'dashboard' ? (
            <DashboardView
              authToken={authToken}
              onStartFirstJourney={() => handleNavigation('createTrip')}
              onVerificationStatusSync={handleDashboardVerificationStatusSync}
            />
          ) : (
            <MainFeed
              mode={activeView === 'myPosts' ? 'mine' : 'main'}
              posts={activeView === 'myPosts' ? myFeedPosts : mainFeedPosts}
              sentRequestPostIds={sentRequestPostIds}
              currentUserAuthorKey={currentUserAuthorKey ?? undefined}
              currentUserId={userSession?.id ?? null}
              currentUserIsVerified={Boolean(userSession?.isVerified)}
              pendingRequestCountByPostId={pendingRequestCountByTripId}
              joinConflictMessageByPostId={activeView === 'myPosts' ? myPostConflictMessageByPostId : joinConflictMessageByPostId}
              activePostIds={activeMyPostIds}
              isPostActionInProgress={isPostActionInProgress}
              dnaMatchByPostId={dnaMatchByPostId}
              dnaMatchLoadingPostIds={dnaMatchLoadingPostIds}
              onJoinRequest={handleFeedJoinRequest}
              onOpenTripChat={handleJoinedTripChat}
              onManageRequests={handleOpenManageRequests}
              onSharePost={handleFeedShare}
              onDismissPost={handleFeedDismiss}
              onEditPost={handleEditFeedPost}
              onDeletePost={handleDeleteFeedPost}
              onCompletePost={handleCompleteFeedPost}
              onCancelPost={handleCancelFeedPost}
            />
          )}
        </section>
      </div>
    </section>
  );

  const renderAuthScreen = () => {
    return (
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <div className="auth-enter relative overflow-hidden rounded-[30px] border border-primary/10 bg-white/90 shadow-2xl backdrop-blur-xl">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-success/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative grid lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-t-[30px] bg-gradient-to-br from-primary via-primary to-accent p-8 text-white sm:p-10 lg:rounded-l-[30px] lg:rounded-tr-none">
              <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
                SplitNGo Access
              </p>
              <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                Travel Better With Verified Group Experiences
              </h2>
              <p className="mt-3 text-sm text-white/90 sm:text-base">
                Continue with Google to access discovery, hosting, and collaboration features in one secure flow.
              </p>

              <ul className="mt-6 space-y-2 text-sm text-white/90">
                <li>Smart traveler matching based on trip vibe.</li>
                <li>Host tools with clear expectations and budget.</li>
                <li>Verification-aware onboarding and support.</li>
              </ul>
            </article>

            <article className="rounded-b-[30px] bg-white/95 p-8 sm:p-10 lg:rounded-b-none lg:rounded-r-[30px]">
              <div className="inline-flex rounded-card border border-primary/15 bg-background/70 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthErrors({});
                    setAuthMessage('');
                  }}
                  className={
                    authMode === 'signin'
                      ? 'rounded-card bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm'
                      : 'rounded-card px-4 py-2 text-sm font-semibold text-primary/75'
                  }
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthErrors({});
                    setAuthMessage('');
                  }}
                  className={
                    authMode === 'signup'
                      ? 'rounded-card bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm'
                      : 'rounded-card px-4 py-2 text-sm font-semibold text-primary/75'
                  }
                >
                  Sign Up
                </button>
              </div>

              <h3 className="mt-4 text-3xl font-black text-primary">
                {authMode === 'signin' ? 'Sign In With Email' : 'Create Your Account'}
              </h3>
              <p className="mt-2 text-sm text-primary/80">
                {authMode === 'signin'
                  ? 'Enter your Email ID and Password to continue.'
                  : 'Use your Email ID and Password to create your account.'}
              </p>

              <form className="mt-5 space-y-4" onSubmit={handleAuthSubmit} noValidate>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-primary">Enter your Email ID</span>
                  <input
                    type="email"
                    value={authForm.userId}
                    onChange={(event) => handleAuthFieldChange('userId', event.target.value)}
                    disabled={isAuthLoading}
                    className="interactive-input w-full rounded-card border border-primary/15 bg-white px-4 py-3 text-sm text-primary outline-none"
                    placeholder="you@example.com"
                  />
                  {authErrors.userId ? <p className="mt-1 text-xs font-medium text-red-600">{authErrors.userId}</p> : null}
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-primary">Enter your Password</span>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(event) => handleAuthFieldChange('password', event.target.value)}
                    disabled={isAuthLoading}
                    className="interactive-input w-full rounded-card border border-primary/15 bg-white px-4 py-3 text-sm text-primary outline-none"
                    placeholder="Enter password"
                  />
                  {authErrors.password ? <p className="mt-1 text-xs font-medium text-red-600">{authErrors.password}</p> : null}
                </label>

                {authMode === 'signup' ? (
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-primary">Confirm Password</span>
                    <input
                      type="password"
                      value={authForm.confirmPassword}
                      onChange={(event) => handleAuthFieldChange('confirmPassword', event.target.value)}
                      disabled={isAuthLoading}
                      className="interactive-input w-full rounded-card border border-primary/15 bg-white px-4 py-3 text-sm text-primary outline-none"
                      placeholder="Re-enter password"
                    />
                    {authErrors.confirmPassword ? (
                      <p className="mt-1 text-xs font-medium text-red-600">{authErrors.confirmPassword}</p>
                    ) : null}
                  </label>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  {authMode === 'signin' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const email = authForm.userId.trim();
                        if (!email || !EMAIL_PATTERN.test(email)) {
                          setAuthMessage('Enter a valid email to reset password.');
                          return;
                        }
                        setAuthMessage(`Password reset link sent to ${email} (demo message).`);
                      }}
                      className="interactive-btn text-xs font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
                    >
                      Forgot Password?
                    </button>
                  ) : (
                    <span />
                  )}

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="interactive-btn rounded-card bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {isAuthLoading ? 'Please wait...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                  </button>
                </div>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-primary/15" />
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/55">Or</span>
                <div className="h-px flex-1 bg-primary/15" />
              </div>

              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                disabled={isAuthLoading}
                className="interactive-btn mt-4 flex w-full items-center justify-center gap-3 rounded-card border border-primary/15 bg-white px-4 py-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-background/70 disabled:cursor-not-allowed disabled:opacity-65"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-base font-bold text-primary ring-1 ring-primary/15">
                  G
                </span>
                Continue with Google
              </button>

              {authMessage ? (
                <p
                  className={`mt-4 text-sm font-medium ${
                    authMessage.includes('Account created') || authMessage.includes('Password reset link sent')
                      ? 'text-primary'
                      : 'text-red-600'
                  }`}
                >
                  {authMessage}
                </p>
              ) : null}
            </article>
          </div>
        </div>
      </section>
    );
  };

  const renderMainContent = () => {
    switch (currentScreen) {
      case 'home':
        return <HeroView onExploreTrip={handleOpenTrip} onHostTrip={handleHostTrip} />;
      case 'discovery':
        return (
          <DiscoveryFeedView
            trips={matchedTrips}
            currentUserId={userSession?.id ?? null}
            currentUserName={userSession?.name ?? 'Traveler'}
            authToken={authToken}
            onViewTrip={handleOpenTrip}
            onJoinChat={handleJoinChat}
          />
        );
      case 'aboutUs':
        return <AboutUsView />;
      case 'contactUs':
        return <ContactUsView />;
      case 'createTrip':
        return renderCreateTripScreen();
      case 'editPost':
        return editingFeedPost && userSession ? (
          <CreateTripView
            mode="edit"
            hostName={userSession.name}
            initialPayload={toCreateTripPayloadFromFeedPost(editingFeedPost)}
            isSubmitting={isPostActionInProgress}
            onTripCreated={handleSaveEditedPost}
            onCancel={handleCancelEditPost}
          />
        ) : (
          renderSocialExperience()
        );
      case 'onboarding':
        return userSession ? (
          <OnboardingQuizView
            userName={userSession.name}
            initialDNA={userSession.dna ?? defaultUserDNA}
            onComplete={handleOnboardingComplete}
          />
        ) : (
          renderAuthScreen()
        );
      case 'verification':
        return userSession ? (
          <VerificationGateView isVerified={userSession.isVerified} onVerify={handleVerificationComplete} />
        ) : (
          renderAuthScreen()
        );
      case 'groupChat':
        return activeGroupTrip && activeGroupRuntime ? (
          <GroupChatView
            trip={activeGroupTrip}
            messages={chatMessages}
            introEndsAt={activeGroupRuntime.introEndsAt}
            status={activeGroupRuntime.status}
            escrowSummary={activeGroupRuntime.escrowSummary}
            hasReleasedCheckInFunds={activeGroupRuntime.hasReleasedCheckInFunds}
            onBack={() => setCurrentScreen(userSession ? 'home' : 'discovery')}
            onCommitAndPay={handleCommitAndPay}
            onReleaseCheckInFunds={handleReleaseCheckIn}
            onOpenReview={handleOpenReview}
          />
        ) : (
          <DiscoveryFeedView
            trips={matchedTrips}
            currentUserId={userSession?.id ?? null}
            currentUserName={userSession?.name ?? 'Traveler'}
            authToken={authToken}
            onViewTrip={handleOpenTrip}
            onJoinChat={handleJoinChat}
          />
        );
      case 'reviews':
        return activeGroupTrip && activeGroupRuntime && userSession ? (
          <ReviewSystemView
            trip={activeGroupTrip}
            currentUserName={userSession.name}
            hasAlreadyReviewed={activeGroupRuntime.hasReviewed}
            onSubmitReview={handleSubmitReview}
          />
        ) : (
          <DiscoveryFeedView
            trips={matchedTrips}
            currentUserId={userSession?.id ?? null}
            currentUserName={userSession?.name ?? 'Traveler'}
            authToken={authToken}
            onViewTrip={handleOpenTrip}
            onJoinChat={handleJoinChat}
          />
        );
      case 'expenses':
        return (
          <ExpenseTrackerView
            categories={expenseCategories}
            activeCategory={activeCategory}
            costs={costs}
            totalSharedCost={totalSharedCost}
            onCategoryChange={setActiveCategory}
            onCostChange={handleCostChange}
          />
        );
      case 'chat':
        return <ChatInterfaceView messages={chatMessages} />;
      case 'auth':
        return renderAuthScreen();
      case 'tripDetails':
        return selectedTrip ? (
          <TripDetailView trip={selectedTrip} onBack={() => handleNavigation('discovery')} />
        ) : (
          <DiscoveryFeedView
            trips={matchedTrips}
            currentUserId={userSession?.id ?? null}
            currentUserName={userSession?.name ?? 'Traveler'}
            authToken={authToken}
            onViewTrip={handleOpenTrip}
            onJoinChat={handleJoinChat}
          />
        );
      case 'profile':
        return renderProfileScreen();
      case 'history':
        return renderHistoryScreen();
      case 'wallet':
        return renderWalletScreen();
      case 'dashboard':
      default:
        return (
          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <ChatInterfaceView messages={chatMessages} />
            <ExpenseTrackerView
              categories={expenseCategories}
              activeCategory={activeCategory}
              costs={costs}
              totalSharedCost={totalSharedCost}
              onCategoryChange={setActiveCategory}
              onCostChange={handleCostChange}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/75 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 text-primary">
          <button
            type="button"
            onClick={() => handleNavigation('home')}
            className="text-xl font-black tracking-tight"
          >
            SocialTravel
          </button>

          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <button
              type="button"
              onClick={() => {
                if (userSession) {
                  setActiveView('feed');
                  setCurrentScreen('home');
                  return;
                }
                handleNavigation('discovery');
              }}
              className={userSession ? getSocialTopNavClass('feed') : getTopNavClass('discovery')}
            >
              Discover
            </button>
            {userSession ? (
              <button
                type="button"
                onClick={() => {
                  setActiveView('myPosts');
                  setCurrentScreen('home');
                }}
                className={getSocialTopNavClass('myPosts')}
              >
                My Posts
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => handleNavigation('aboutUs')}
              className={getTopNavClass('aboutUs')}
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => handleNavigation('contactUs')}
              className={getTopNavClass('contactUs')}
            >
              Contact Us
            </button>
            <button
              type="button"
              onClick={() => {
                if (userSession) {
                  setActiveView('dashboard');
                  setCurrentScreen('dashboard');
                  return;
                }
                handleNavigation('dashboard');
              }}
              className={userSession ? getSocialTopNavClass('dashboard') : getTopNavClass('dashboard')}
            >
              Trips
            </button>
          </div>

          {userSession ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAccountPanelOpen((previous) => !previous)}
                className="interactive-btn flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white"
                aria-label="Open account menu"
              >
                {userProfileImageSrc ? (
                  <img
                    src={userProfileImageSrc}
                    alt={`${userSession.name} profile`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  userSession.name.charAt(0).toUpperCase()
                )}
              </button>
              {userSession.isVerified ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-success text-[10px] font-bold text-white">
                  V
                </span>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleNavigation('auth')}
              className={
                currentScreen === 'auth'
                  ? 'rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-card bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90'
              }
            >
              Sign In
            </button>
          )}
        </nav>
      </header>

      {systemNotice ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[140] w-[min(92vw,760px)] -translate-x-1/2 px-2">
          <div className="pointer-events-auto flex items-start justify-between gap-3 rounded-card border border-slate-700/80 bg-slate-900/95 px-4 py-3 text-sm text-white shadow-2xl ring-1 ring-black/40 backdrop-blur-sm">
            <p>{systemNotice}</p>
            <button
              type="button"
              onClick={() => setSystemNotice('')}
              className="interactive-btn rounded-card border border-white/35 bg-white/15 px-2 py-1 text-xs font-semibold text-white hover:bg-white/25"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <main>
        {userSession && isSocialExperienceScreen ? (
          renderSocialExperience()
        ) : isWorkspaceScreen ? (
          <section id="trips" className="mx-auto w-full max-w-7xl px-6 pb-16 pt-6">
            <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
              <aside className="rounded-card bg-white/95 p-4 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-primary/70">Workspace</p>
                <nav>
                  <ul className="space-y-2">
                    {navItems.map((item) => {
                      const target = sidebarTargetById[item.id] ?? 'dashboard';
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleNavigation(target)}
                            className={getSidebarClass(target)}
                          >
                            {renderSidebarIcon(item.icon)}
                            <span>{item.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </aside>

              <section className="rounded-card bg-white/95 p-5 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
                <header className="mb-5 border-b border-primary/10 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Group Hub</p>
                  <h2 className="text-2xl font-bold text-primary">Plan, Chat, and Split Costs</h2>
                </header>
                {renderMainContent()}
              </section>
            </div>
          </section>
        ) : (
          renderMainContent()
        )}
      </main>

      <RequestModal
        isOpen={Boolean(activeRequestModalPost)}
        tripTitle={activeRequestModalPost?.title ?? 'Trip Requests'}
        requests={activeRequestModalPost ? hostRequestsByTripId[activeRequestModalPost.id] ?? [] : []}
        isLoading={isRequestModalLoading}
        isActionInProgress={isRequestActionInProgress}
        onClose={handleCloseRequestModal}
        onAccept={(requestItem) => {
          void handleReviewTripRequest(requestItem, 'accepted');
        }}
        onReject={(requestItem) => {
          void handleReviewTripRequest(requestItem, 'rejected');
        }}
      />

      {userSession ? (
        <button
          type="button"
          onClick={handleSOS}
          className="interactive-btn fixed bottom-6 right-6 z-[70] rounded-full bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-xl hover:bg-red-700"
        >
          SOS
        </button>
      ) : null}

      {isEmergencyAlertActive ? (
        <div className="fixed bottom-20 right-6 z-[70] w-full max-w-xs rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xl">
          <p className="font-semibold">Emergency Alert</p>
          <p className="mt-1">{emergencyMessage}</p>
          <button
            type="button"
            onClick={() => setIsEmergencyAlertActive(false)}
            className="interactive-btn mt-3 rounded-card border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
          >
            Acknowledge
          </button>
        </div>
      ) : null}

      {userSession && isAccountPanelOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            onClick={() => setIsAccountPanelOpen(false)}
            className="absolute inset-0 bg-primary/25 backdrop-blur-[2px]"
            aria-label="Close account panel"
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-sm overflow-hidden border-l border-primary/15 bg-gradient-to-b from-white/95 via-[#faf6e8] to-[#f4f1de] shadow-2xl ring-1 ring-primary/10">
            <div className="flex h-full flex-col">
              <div className="border-b border-primary/10 bg-white/60 px-6 pb-5 pt-6 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                      {userProfileImageSrc ? (
                        <img
                          src={userProfileImageSrc}
                          alt={`${userSession.name} profile`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <UserCircle2 className="h-7 w-7" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Account</p>
                      <h3 className="mt-1 flex items-center gap-1.5 text-lg font-bold text-primary">
                        {userProfileImageSrc ? (
                          <span className="inline-flex h-4 w-4 overflow-hidden rounded-full ring-1 ring-primary/20">
                            <img
                              src={userProfileImageSrc}
                              alt={`${userSession.name} profile`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </span>
                        ) : (
                          <UserCircle2 className="h-4 w-4 text-primary/80" />
                        )}
                        <span className="truncate">{userSession.name}</span>
                      </h3>
                      <p className="truncate text-xs text-primary/75">{userSession.email || 'Traveler profile'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAccountPanelOpen(false)}
                    className="interactive-btn inline-flex h-9 w-9 items-center justify-center rounded-card border border-primary/20 bg-white/70 text-primary"
                    aria-label="Close account panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Elite Traveler
                  </span>
                  {userSession.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-success/40">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified Badge
                    </span>
                  ) : null}
                </div>
              </div>

              <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
                <button
                  type="button"
                  onClick={() => handleNavigation('profile')}
                  className="interactive-btn group flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-primary hover:border-primary/20 hover:bg-white"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <UserCircle2 className="h-5 w-5" />
                  </span>
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigation('history')}
                  className="interactive-btn group flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-primary hover:border-primary/20 hover:bg-white"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <History className="h-5 w-5" />
                  </span>
                  <span>History</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigation('wallet')}
                  className="interactive-btn group flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-primary hover:border-primary/20 hover:bg-white"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <span>Wallet</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigation('onboarding')}
                  className="interactive-btn group flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-primary hover:border-primary/20 hover:bg-white"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <span>Travel DNA</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigation('verification')}
                  className="interactive-btn group flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-primary hover:border-primary/20 hover:bg-white"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <span>Verification</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigation('dashboard')}
                  className="interactive-btn group flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-primary hover:border-primary/20 hover:bg-white"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <LayoutDashboard className="h-5 w-5" />
                  </span>
                  <span>Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('myPosts');
                    setCurrentScreen('home');
                    setIsAccountPanelOpen(false);
                  }}
                  className="interactive-btn group flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-primary hover:border-primary/20 hover:bg-white"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span>My Posts</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigation('createTrip')}
                  className="interactive-btn group flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-primary hover:border-primary/20 hover:bg-white"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Plus className="h-5 w-5" />
                  </span>
                  <span>Create Trip</span>
                </button>
              </nav>

              <div className="border-t border-primary/10 px-4 py-4">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="interactive-btn flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default App;

