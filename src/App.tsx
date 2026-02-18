import React, { useEffect, useMemo, useState } from 'react';
import {
  chatMessages,
  expenseCategories,
  initialCosts,
  navItems,
  type ExpenseCategory,
  type NavIcon,
} from './models/dashboardModel';
import { defaultUserDNA, type UserDNA } from './models/dnaModel';
import { tripCatalog, type Trip } from './models/tripModel';
import { getMatchScore } from './utils/getMatchScore';
import {
  calculateEscrowSummary,
  releaseCheckInFunds,
  type EscrowSummary,
  type TripLifecycleStatus,
} from './utils/paymentProcessor';
import ChatInterfaceView from './views/ChatInterfaceView';
import DiscoveryFeedView from './views/DiscoveryFeedView';
import ExpenseTrackerView from './views/ExpenseTrackerView';
import GroupChatView from './views/GroupChatView';
import HeroView from './views/HeroView';
import OnboardingQuizView from './views/OnboardingQuizView';
import ReviewSystemView from './views/ReviewSystemView';
import TripDetailView from './views/TripDetailView';
import VerificationGateView from './views/VerificationGateView';

const DEFAULT_INTRO_PERIOD_MS = 24 * 60 * 60 * 1000;
const configuredIntroPeriod = Number(import.meta.env.VITE_INTRO_PERIOD_MS);
const INTRO_PERIOD_MS =
  Number.isFinite(configuredIntroPeriod) && configuredIntroPeriod > 0
    ? configuredIntroPeriod
    : DEFAULT_INTRO_PERIOD_MS;

type ScreenName =
  | 'home'
  | 'discovery'
  | 'auth'
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
  name: string;
  provider: 'Email' | SocialProvider;
  dna: UserDNA | null;
  isVerified: boolean;
  toursCompleted: number;
  ratingAverage: number;
  ratingCount: number;
};

type PublicProfile = {
  name: string;
  toursCompleted: number;
  ratingAverage: number;
  ratingCount: number;
  isVerified: boolean;
};

type TripRuntime = {
  status: TripLifecycleStatus;
  introEndsAt: number | null;
  escrowSummary: EscrowSummary | null;
  hasReleasedCheckInFunds: boolean;
  hasReviewed: boolean;
};

const createSession = (name: string, provider: 'Email' | SocialProvider): UserSession => ({
  name,
  provider,
  dna: null,
  isVerified: false,
  toursCompleted: 0,
  ratingAverage: 0,
  ratingCount: 0,
});

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
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory>('Transport');
  const [costs, setCosts] = useState<Record<ExpenseCategory, number>>(initialCosts);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [activeGroupTripId, setActiveGroupTripId] = useState<string | null>(null);

  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authForm, setAuthForm] = useState<AuthForm>({ userId: '', password: '', confirmPassword: '' });
  const [authErrors, setAuthErrors] = useState<AuthErrors>({});
  const [authMessage, setAuthMessage] = useState<string>('');
  const [systemNotice, setSystemNotice] = useState<string>('');

  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);

  const [publicProfiles, setPublicProfiles] = useState<Record<string, PublicProfile>>(() =>
    createInitialPublicProfiles(),
  );
  const [tripRuntimeById, setTripRuntimeById] = useState<Record<string, TripRuntime>>(() =>
    createInitialTripRuntime(),
  );

  const [isEmergencyAlertActive, setIsEmergencyAlertActive] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState('');

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

    setUserSession(createSession('Google User', 'Google'));
    setCurrentScreen('onboarding');
    setSystemNotice('Google login successful. Complete your Travel DNA onboarding.');
    sessionStorage.removeItem('google_oauth_state');
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const matchedTrips = useMemo(
    () =>
      tripCatalog.map((trip) => ({
        trip,
        matchScore: userSession?.dna ? getMatchScore(userSession.dna, trip.tripDNA) : trip.matchPercentage,
      })),
    [userSession?.dna],
  );

  const activeGroupTrip = useMemo(() => {
    if (!activeGroupTripId) {
      return null;
    }
    return tripCatalog.find((trip) => trip.id === activeGroupTripId) ?? null;
  }, [activeGroupTripId]);

  const activeGroupRuntime = useMemo(() => {
    if (!activeGroupTripId) {
      return null;
    }
    return tripRuntimeById[activeGroupTripId] ?? null;
  }, [activeGroupTripId, tripRuntimeById]);

  const hostProfiles = useMemo(
    () => Object.values(publicProfiles).sort((left, right) => right.toursCompleted - left.toursCompleted),
    [publicProfiles],
  );

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

    const requiresSession: ScreenName[] = [
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
      setCurrentScreen('auth');
      setSystemNotice('Please sign in to continue.');
      return;
    }

    if (targetScreen === 'verification' && userSession && !userSession.dna) {
      setCurrentScreen('onboarding');
      setSystemNotice('Complete Travel DNA first.');
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
    const foundTrip = tripCatalog.find((trip) => trip.id === tripId) ?? null;
    setSelectedTrip(foundTrip);
    setCurrentScreen('tripDetails');
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

    const trip = tripCatalog.find((item) => item.id === tripId);
    if (!trip) {
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

  const handleAuthFieldChange = (field: keyof AuthForm, value: string) => {
    setAuthForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSocialLogin = (provider: SocialProvider) => {
    if (provider === 'Google') {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
      const redirectUri =
        (import.meta.env.VITE_GOOGLE_REDIRECT_URI as string | undefined) ?? window.location.origin;

      if (!clientId) {
        setUserSession(createSession('Google User', 'Google'));
        setCurrentScreen('onboarding');
        setSystemNotice('VITE_GOOGLE_CLIENT_ID missing. Logged in with demo Google session.');
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
    setUserSession(createSession(`${provider} User`, provider));
    setCurrentScreen('onboarding');
    setSystemNotice(`${provider} login page opened in a new tab. Continue onboarding here.`);
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

  const handleAuthSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateAuth()) {
      setAuthMessage('Please fix the validation errors.');
      return;
    }

    if (authMode === 'signin') {
      setUserSession(createSession(authForm.userId, 'Email'));
      setAuthMessage('');
      setCurrentScreen('onboarding');
      setSystemNotice('Sign in successful. Complete onboarding and verification.');
      return;
    }

    setAuthMessage(`Account created for ${authForm.userId}. You can now sign in (demo).`);
    setAuthMode('signin');
    setAuthForm((previous) => ({ ...previous, confirmPassword: '' }));
  };

  const handleSignOut = () => {
    setUserSession(null);
    setAuthMode('signin');
    setAuthErrors({});
    setAuthMessage('');
    setAuthForm({ userId: '', password: '', confirmPassword: '' });
    setCurrentScreen('home');
    setIsAccountPanelOpen(false);
    setActiveGroupTripId(null);
    setIsEmergencyAlertActive(false);
    setEmergencyMessage('');
    setSystemNotice('Signed out.');
  };

  const handleOnboardingComplete = (dna: UserDNA) => {
    setUserSession((previous) => (previous ? { ...previous, dna } : previous));
    setCurrentScreen('verification');
    setSystemNotice('Travel DNA saved. Continue to verification.');
  };

  const handleVerificationComplete = () => {
    setUserSession((previous) => (previous ? { ...previous, isVerified: true } : previous));
    setCurrentScreen('home');
    setSystemNotice('Verification completed. Verified Badge granted.');
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

  const isWorkspaceScreen =
    currentScreen === 'dashboard' || currentScreen === 'expenses' || currentScreen === 'chat';

  const sidebarTargetById: Record<string, ScreenName> = {
    'my-trips': 'dashboard',
    wallet: 'wallet',
    support: 'chat',
    'safety-center': 'dashboard',
  };

  const getTopNavClass = (screen: ScreenName) =>
    currentScreen === screen
      ? 'border-b-2 border-accent text-accent'
      : 'border-b-2 border-transparent text-primary/80 transition hover:text-primary';

  const getSidebarClass = (screen: ScreenName) =>
    currentScreen === screen
      ? 'flex w-full items-center gap-3 rounded-card bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-sm'
      : 'flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5';

  const renderProfileScreen = () => (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
      <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Public Profile</p>
            <h2 className="mt-1 text-3xl font-black text-primary">{userSession?.name ?? 'Traveler'}</h2>
          </div>
          {userSession?.isVerified ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-success/20 px-4 py-2 text-sm font-semibold text-primary ring-1 ring-success/40">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success text-xs text-white">
                ?
              </span>
              Verified Badge
            </span>
          ) : (
            <span className="rounded-full bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
              Not Verified
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Tours Completed</p>
            <p className="mt-1 text-2xl font-black text-primary">{userSession?.toursCompleted ?? 0}</p>
          </div>
          <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Average Rating</p>
            <p className="mt-1 text-2xl font-black text-primary">
              {userSession?.ratingCount ? userSession.ratingAverage.toFixed(2) : 'N/A'}
            </p>
          </div>
          <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Provider</p>
            <p className="mt-1 text-2xl font-black text-primary">{userSession?.provider ?? 'Email'}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Community Reputation</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {hostProfiles.slice(0, 4).map((profile) => (
              <article key={profile.name} className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
                <p className="text-sm font-semibold text-primary">{profile.name}</p>
                <p className="mt-1 text-sm text-primary/80">Tours: {profile.toursCompleted}</p>
                <p className="text-sm text-primary/80">
                  Rating: {profile.ratingAverage.toFixed(2)} ({profile.ratingCount})
                </p>
              </article>
            ))}
          </div>
        </div>
      </article>
    </section>
  );

  const renderHistoryScreen = () => {
    const completedTrips = Object.entries(tripRuntimeById)
      .filter(([, runtime]) => runtime.status === 'Completed')
      .map(([tripId]) => tripCatalog.find((trip) => trip.id === tripId))
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

  const renderAuthScreen = () => {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
        <div className="auth-enter relative overflow-hidden rounded-[28px] border border-primary/10 bg-white/85 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="pointer-events-none absolute -left-20 -top-16 h-56 w-56 rounded-full bg-success/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-14 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/65">Account Access</p>
                  <h2 className="mt-1 text-3xl font-black text-primary">
                    {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <p className="mt-1 text-sm text-primary/75">
                    After sign in, you will complete the Travel DNA quiz and Identity Verification.
                  </p>
                </div>
                <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                </span>
              </div>

              <form className="space-y-4" onSubmit={handleAuthSubmit} noValidate>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-primary">Enter your id</span>
                  <input
                    type="text"
                    value={authForm.userId}
                    onChange={(event) => handleAuthFieldChange('userId', event.target.value)}
                    className="interactive-input w-full rounded-card border border-primary/15 bg-background/80 px-4 py-3 text-sm text-primary outline-none"
                    placeholder="your_id"
                  />
                  {authErrors.userId ? <p className="mt-1 text-xs font-medium text-red-600">{authErrors.userId}</p> : null}
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-primary">Password</span>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(event) => handleAuthFieldChange('password', event.target.value)}
                    className="interactive-input w-full rounded-card border border-primary/15 bg-background/80 px-4 py-3 text-sm text-primary outline-none"
                    placeholder="Enter password"
                  />
                  {authErrors.password ? (
                    <p className="mt-1 text-xs font-medium text-red-600">{authErrors.password}</p>
                  ) : null}
                </label>

                {authMode === 'signup' ? (
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-primary">Confirm Password</span>
                    <input
                      type="password"
                      value={authForm.confirmPassword}
                      onChange={(event) => handleAuthFieldChange('confirmPassword', event.target.value)}
                      className="interactive-input w-full rounded-card border border-primary/15 bg-background/80 px-4 py-3 text-sm text-primary outline-none"
                      placeholder="Re-enter password"
                    />
                    {authErrors.confirmPassword ? (
                      <p className="mt-1 text-xs font-medium text-red-600">{authErrors.confirmPassword}</p>
                    ) : null}
                  </label>
                ) : null}

                <button
                  type="submit"
                  className="interactive-btn w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white"
                >
                  {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setAuthErrors({});
                  setAuthMessage('');
                }}
                className="interactive-btn mt-4 text-sm font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
              >
                {authMode === 'signin' ? 'No account? Sign up here' : 'Already have an account? Sign in'}
              </button>

              {authMessage ? <p className="mt-4 text-sm font-medium text-primary">{authMessage}</p> : null}
            </article>

            <article className="rounded-card bg-primary p-8 text-white shadow-lg ring-1 ring-primary/20">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Quick Login</p>
              <h3 className="mt-1 text-2xl font-black">Continue With</h3>
              <p className="mt-1 text-sm text-white/80">
                Google uses OAuth redirect URL. Microsoft and Facebook open their login pages in a new tab.
              </p>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('Google')}
                  className="interactive-btn w-full rounded-card border border-white/20 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20"
                >
                  Login with Google
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('Microsoft')}
                  className="interactive-btn w-full rounded-card border border-white/20 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20"
                >
                  Login with Microsoft
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('Facebook')}
                  className="interactive-btn w-full rounded-card border border-white/20 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20"
                >
                  Login with Facebook
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>
    );
  };

  const renderMainContent = () => {
    switch (currentScreen) {
      case 'home':
        return <HeroView onExploreTrip={handleOpenTrip} />;
      case 'discovery':
        return <DiscoveryFeedView trips={matchedTrips} onViewTrip={handleOpenTrip} onJoinChat={handleJoinChat} />;
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
            onCommitAndPay={handleCommitAndPay}
            onReleaseCheckInFunds={handleReleaseCheckIn}
            onOpenReview={handleOpenReview}
          />
        ) : (
          <DiscoveryFeedView trips={matchedTrips} onViewTrip={handleOpenTrip} onJoinChat={handleJoinChat} />
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
          <DiscoveryFeedView trips={matchedTrips} onViewTrip={handleOpenTrip} onJoinChat={handleJoinChat} />
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
          <DiscoveryFeedView trips={matchedTrips} onViewTrip={handleOpenTrip} onJoinChat={handleJoinChat} />
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
              onClick={() => handleNavigation('discovery')}
              className={getTopNavClass('discovery')}
            >
              Discover
            </button>
            <button
              type="button"
              onClick={() => handleNavigation('dashboard')}
              className={getTopNavClass('dashboard')}
            >
              Trips
            </button>
          </div>

          {userSession ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAccountPanelOpen((previous) => !previous)}
                className="interactive-btn flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
                aria-label="Open account menu"
              >
                {userSession.name.charAt(0).toUpperCase()}
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
        <div className="mx-auto mt-4 w-full max-w-7xl px-6">
          <div className="flex items-start justify-between gap-3 rounded-card border border-primary/15 bg-white/95 px-4 py-3 text-sm text-primary shadow-sm">
            <p>{systemNotice}</p>
            <button
              type="button"
              onClick={() => setSystemNotice('')}
              className="interactive-btn rounded-card border border-primary/20 px-2 py-1 text-xs font-semibold text-primary"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <main>
        {isWorkspaceScreen ? (
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

          <aside className="absolute right-0 top-0 h-full w-full max-w-sm bg-white p-6 shadow-2xl ring-1 ring-primary/10">
            <div className="flex items-center justify-between border-b border-primary/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Account</p>
                <h3 className="text-lg font-bold text-primary">{userSession.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountPanelOpen(false)}
                className="interactive-btn rounded-card border border-primary/20 px-3 py-1.5 text-sm font-semibold text-primary"
              >
                Close
              </button>
            </div>

            <nav className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => handleNavigation('profile')}
                className="interactive-btn w-full rounded-card bg-background/80 px-4 py-3 text-left text-sm font-semibold text-primary ring-1 ring-primary/10"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => handleNavigation('history')}
                className="interactive-btn w-full rounded-card bg-background/80 px-4 py-3 text-left text-sm font-semibold text-primary ring-1 ring-primary/10"
              >
                History
              </button>
              <button
                type="button"
                onClick={() => handleNavigation('wallet')}
                className="interactive-btn w-full rounded-card bg-background/80 px-4 py-3 text-left text-sm font-semibold text-primary ring-1 ring-primary/10"
              >
                Wallet
              </button>
              <button
                type="button"
                onClick={() => handleNavigation('onboarding')}
                className="interactive-btn w-full rounded-card bg-background/80 px-4 py-3 text-left text-sm font-semibold text-primary ring-1 ring-primary/10"
              >
                Travel DNA
              </button>
              <button
                type="button"
                onClick={() => handleNavigation('verification')}
                className="interactive-btn w-full rounded-card bg-background/80 px-4 py-3 text-left text-sm font-semibold text-primary ring-1 ring-primary/10"
              >
                Verification
              </button>
              <button
                type="button"
                onClick={() => handleNavigation('dashboard')}
                className="interactive-btn w-full rounded-card bg-background/80 px-4 py-3 text-left text-sm font-semibold text-primary ring-1 ring-primary/10"
              >
                Dashboard
              </button>
            </nav>

            <button
              type="button"
              onClick={handleSignOut}
              className="interactive-btn mt-6 w-full rounded-card bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              Sign Out
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default App;
