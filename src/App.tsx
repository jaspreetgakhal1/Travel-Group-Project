import React, { useEffect, useMemo, useState } from 'react';
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
  fetchSelfTrips,
  fetchTripRequests,
  reviewJoinRequest,
  submitJoinRequest,
  type HostTripRequest,
  type HostTripSummary,
  type JoinRequestStatus,
} from './services/tripRequestApi';
import {
  BadgeCheck,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Wallet,
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

const getSessionAuthorKey = (session: UserSession | null): string | null => {
  if (!session) {
    return null;
  }

  const normalizedEmail = normalizeAuthorKey(session.email);
  if (normalizedEmail) {
    return normalizedEmail;
  }

  const normalizedName = normalizeAuthorKey(session.name);
  return normalizedName || null;
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
    return feedPosts.filter((post) => {
      const isOwnPostByAuthor =
        normalizedCurrentUserAuthorKey !== null && normalizeAuthorKey(post.authorKey) === normalizedCurrentUserAuthorKey;
      const isOwnPostById = selfTripIdSet.has(post.id);
      const isOwnPostByHostId = Boolean(userSession?.id && post.hostId && post.hostId === userSession.id);
      return !(isOwnPostByAuthor || isOwnPostById || isOwnPostByHostId);
    });
  }, [feedPosts, normalizedCurrentUserAuthorKey, selfTripIdSet, userSession?.id]);
  const myFeedPosts = useMemo(() => {
    const filteredPosts = feedPosts.filter((post) => {
      const isOwnPostByAuthor =
        normalizedCurrentUserAuthorKey !== null && normalizeAuthorKey(post.authorKey) === normalizedCurrentUserAuthorKey;
      const isOwnPostById = selfTripIdSet.has(post.id);
      const isOwnPostByHostId = Boolean(userSession?.id && post.hostId && post.hostId === userSession.id);
      return isOwnPostByAuthor || isOwnPostById || isOwnPostByHostId;
    });

    return filteredPosts.map((post) => ({
      ...post,
      pendingRequestCount: pendingRequestCountByTripId[post.id] ?? post.pendingRequestCount ?? 0,
    }));
  }, [feedPosts, normalizedCurrentUserAuthorKey, pendingRequestCountByTripId, selfTripIdSet, userSession?.id]);

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
      } catch {
        // Keep local session if profile sync fails.
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

  const escrowStats = useMemo(() => {
    const summaries = Object.values(tripRuntimeById)
      .map((runtime) => runtime.escrowSummary)
      .filter((summary): summary is EscrowSummary => summary !== null);

    const totalPaid = summaries.reduce((total, summary) => total + summary.totalAmount, 0);
    const totalReleased = summaries.reduce((total, summary) => total + summary.releasedToOrganizer, 0);

    return {
      totalPaid: Number(totalPaid.toFixed(2)),
      totalReleased: Number(totalReleased.toFixed(2)),
      inEscrow: Number((totalPaid - totalReleased).toFixed(2)),
    };
  }, [tripRuntimeById]);

  const completedTripsCount = useMemo(
    () => Object.values(tripRuntimeById).filter((runtime) => runtime.status === 'Completed').length,
    [tripRuntimeById],
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

    const createdTrip: Trip = {
      id: newTripId,
      title: `${userSession.firstName || userSession.name} Hosted Trip`,
      hostName: userSession.name,
      priceShare: payload.budget,
      matchPercentage: 82,
      tripDNA: hostDNA,
      imageUrl: payload.posterImageUrls[0],
      isVerified: Boolean(userSession.isVerified),
      route: 'Custom route',
      duration: '7 Days',
      totalExpectedFromPartner: payload.budget * payload.peopleRequired,
      partnerExpectations: payload.expectations,
      notes: `Preferred travelers: ${preferredTravelers}. ${
        payload.onlyVerifiedUsers ? 'Verified users only.' : 'Open to all users.'
      }`,
      highlights: payload.expectations.slice(0, 3),
    };

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() + 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
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
        location: 'Custom route',
        cost: payload.budget,
        durationDays: 7,
        requiredPeople: payload.peopleRequired,
        spotsFilledPercent: 0,
        expectations: payload.expectations,
        travelerType: payload.onlyVerifiedUsers
          ? 'Verification-first collaborative travelers'
          : 'Collaborative group travelers',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
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
        location: currentPost.location,
        cost: payload.budget,
        durationDays: currentPost.durationDays,
        requiredPeople: payload.peopleRequired,
        spotsFilledPercent: currentPost.spotsFilledPercent,
        expectations: payload.expectations,
        travelerType: payload.onlyVerifiedUsers
          ? 'Verification-first collaborative travelers'
          : 'Collaborative group travelers',
        startDate: currentPost.startDate,
        endDate: currentPost.endDate,
      });

      setFeedPosts((previous) =>
        previous.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
      );
      setEditingFeedPost(null);
      setCurrentScreen('home');
      setActiveView('feed');
      setSystemNotice('Post updated successfully.');
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
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
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
    setUserSession((previous) => (previous ? { ...previous, isVerified: true } : previous));
    setCurrentScreen('home');
    setSystemNotice('Verification completed. Verified Badge granted.');
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
      const nextAuthorKey = getSessionAuthorKey(userSession);
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
                Verified Badge
              </span>
            ) : (
              <span className="rounded-full bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                Not Verified
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
    const completedTrips = Object.entries(tripRuntimeById)
      .filter(([, runtime]) => runtime.status === 'Completed')
      .map(([tripId]) => allTrips.find((trip) => trip.id === tripId))
      .filter((trip): trip is Trip => trip !== undefined);

    return (
      <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
        <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Trip History</p>
          <h2 className="mt-1 text-3xl font-black text-primary">Completed Journeys</h2>
          <p className="mt-2 text-sm text-primary/80">Total completed in this demo profile: {completedTripsCount}</p>

          <div className="mt-6 space-y-3">
            {completedTrips.length > 0 ? (
              completedTrips.map((trip) => (
                <div key={trip.id} className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
                  <p className="text-sm font-semibold text-primary">{trip.title}</p>
                  <p className="mt-1 text-sm text-primary/80">Host: {trip.hostName}</p>
                </div>
              ))
            ) : (
              <div className="rounded-card bg-background/80 p-4 text-sm text-primary/80 ring-1 ring-primary/10">
                No completed trips yet. Finish escrow, check-in, and submit reviews.
              </div>
            )}
          </div>
        </article>
      </section>
    );
  };

  const renderWalletScreen = () => (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
      <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Wallet</p>
        <h2 className="mt-1 text-3xl font-black text-primary">Escrow & Payments</h2>

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
            />
          ) : (
            <MainFeed
              mode={activeView === 'myPosts' ? 'mine' : 'main'}
              posts={activeView === 'myPosts' ? myFeedPosts : mainFeedPosts}
              sentRequestPostIds={sentRequestPostIds}
              currentUserAuthorKey={currentUserAuthorKey ?? undefined}
              currentUserId={userSession?.id ?? null}
              pendingRequestCountByPostId={pendingRequestCountByTripId}
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
