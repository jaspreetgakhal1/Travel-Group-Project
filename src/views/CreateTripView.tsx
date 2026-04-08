// Added by Codex: project documentation comment for src\views\CreateTripView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type InterestedInOption = 'Male' | 'Female' | 'Unspecified';
type TripCurrency = 'USD' | 'CAD' | 'EUR' | 'GBP' | 'INR' | 'AUD' | 'JPY';

type EmergencyContact = {
  name: string;
  phone: string;
};

export type CreateTripPayload = {
  title: string;
  posterImageUrls: string[];
  peopleRequired: number;
  expectedBudget: number;
  expectations: string[];
  interestedIn: InterestedInOption;
  onlyVerifiedUsers: boolean;
  startJourneyDate: string;
  endJourneyDate: string;
  location: string;
  travelerType: string;
  currency: TripCurrency;
  isPrivate: boolean;
  emergencyContact: EmergencyContact;
};

type ValidationField =
  | 'title'
  | 'posterImageUrls'
  | 'location'
  | 'startJourneyDate'
  | 'endJourneyDate'
  | 'expectedBudget'
  | 'travelerType'
  | 'currency'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'expectations';

type CreateTripViewProps = {
  hostName: string;
  mode?: 'create' | 'edit';
  initialPayload?: CreateTripPayload;
  isSubmitting?: boolean;
  onTripCreated: (payload: CreateTripPayload) => boolean | Promise<boolean>;
  onCancel?: () => void;
};

const MAX_POSTER_IMAGES = 4;
const MAX_PEOPLE_REQUIRED = 20;
const MAX_TRIP_DURATION_DAYS = 60;
const MIN_TRIP_TITLE_LENGTH = 3;
const MAX_TRIP_TITLE_LENGTH = 120;
const MAX_LOCATION_LENGTH = 160;
const MAX_EMERGENCY_CONTACT_NAME_LENGTH = 120;
const MAX_EMERGENCY_CONTACT_PHONE_LENGTH = 40;
const DEFAULT_EXPECTATION_OPTIONS = [
  'Shared cost transparency',
  'On-time meetup discipline',
  'Respectful communication',
  'Flexible itinerary mindset',
  'Active participation in trip plans',
];
const TRAVELER_TYPE_OPTIONS = [
  'Budget Backpacker',
  'Luxury Seeker',
  'Adventure Junkie',
  'Digital Nomad',
  'Culture Vulture',
  'Social Butterfly',
  'Slow Traveler',
  'Foodie Explorer',
  'Photo Enthusiast',
  'Minimalist',
] as const;
const CURRENCY_OPTIONS: TripCurrency[] = ['USD', 'CAD', 'EUR', 'GBP', 'INR', 'AUD', 'JPY'];
const TRAVELER_TYPE_PLACEHOLDER = 'Select your travel style';
const SQUARE_PANEL_CLASS_NAME = 'rounded-xl bg-background/80 p-4 ring-1 ring-primary/10';
const FIELD_CONTAINER_IDS: Record<ValidationField, string> = {
  title: 'create-trip-title-field',
  posterImageUrls: 'create-trip-poster-field',
  location: 'create-trip-location-field',
  startJourneyDate: 'create-trip-start-date-field',
  endJourneyDate: 'create-trip-end-date-field',
  expectedBudget: 'create-trip-expected-budget-field',
  travelerType: 'create-trip-traveler-type-field',
  currency: 'create-trip-currency-field',
  emergencyContactName: 'create-trip-emergency-contact-name-field',
  emergencyContactPhone: 'create-trip-emergency-contact-phone-field',
  expectations: 'create-trip-expectations-field',
};
const FIELD_SCROLL_ORDER: ValidationField[] = [
  'title',
  'posterImageUrls',
  'location',
  'startJourneyDate',
  'endJourneyDate',
  'expectedBudget',
  'travelerType',
  'currency',
  'emergencyContactName',
  'emergencyContactPhone',
  'expectations',
];

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Unable to read file contents.'));
    };
    reader.onerror = () => reject(new Error('Unable to read file contents.'));
    reader.readAsDataURL(file);
  });

const normalizeExpectation = (value: string): string => value.trim().toLowerCase();
const formatDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInputClassName = (hasError: boolean, extraClassName = ''): string =>
  `interactive-input w-full rounded-xl border bg-white px-4 py-3 text-sm text-primary outline-none transition ${
    hasError
      ? 'border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.12)] focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : 'border-primary/15 focus:border-[#81B29A] focus:ring-2 focus:ring-[#81B29A]/20'
  } ${extraClassName}`.trim();

const buildDefaultJourneyDates = (): Pick<CreateTripPayload, 'startJourneyDate' | 'endJourneyDate'> => {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() + 7);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  return {
    startJourneyDate: formatDateInputValue(startDate),
    endJourneyDate: formatDateInputValue(endDate),
  };
};

const CreateTripView: React.FC<CreateTripViewProps> = ({
  hostName,
  mode = 'create',
  initialPayload,
  isSubmitting = false,
  onTripCreated,
  onCancel,
}) => {
  const isEditMode = mode === 'edit';
  const [tripTitle, setTripTitle] = useState('');
  const [posterImageDataUrls, setPosterImageDataUrls] = useState<string[]>([]);
  const [peopleRequired, setPeopleRequired] = useState(4);
  const [expectedBudget, setExpectedBudget] = useState('');
  const [selectedExpectations, setSelectedExpectations] = useState<string[]>([]);
  const [customExpectations, setCustomExpectations] = useState<string[]>([]);
  const [expectationDraft, setExpectationDraft] = useState('');
  const [interestedIn, setInterestedIn] = useState<InterestedInOption>('Unspecified');
  const [onlyVerifiedUsers, setOnlyVerifiedUsers] = useState(false);
  const [startJourneyDate, setStartJourneyDate] = useState('');
  const [endJourneyDate, setEndJourneyDate] = useState('');
  const [location, setLocation] = useState('');
  const [travelerType, setTravelerType] = useState('');
  const [currency, setCurrency] = useState<TripCurrency>('USD');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ValidationField, string>>>({});
  const [formError, setFormError] = useState('');
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);
  const isBusy = isSubmitting || isLocalSubmitting;

  const expectationOptions = useMemo(
    () => [...DEFAULT_EXPECTATION_OPTIONS, ...customExpectations],
    [customExpectations],
  );

  const applyPayloadToForm = (payload?: CreateTripPayload) => {
    const defaultJourneyDates = buildDefaultJourneyDates();
    const sourcePayload = payload ?? {
      title: '',
      posterImageUrls: [],
      peopleRequired: 4,
      expectedBudget: 0,
      expectations: [],
      interestedIn: 'Unspecified' as InterestedInOption,
      onlyVerifiedUsers: false,
      ...defaultJourneyDates,
      location: '',
      travelerType: '',
      currency: 'USD' as TripCurrency,
      isPrivate: false,
      emergencyContact: {
        name: '',
        phone: '',
      },
    };
    const customFromPayload = sourcePayload.expectations.filter(
      (expectation) =>
        !DEFAULT_EXPECTATION_OPTIONS.some(
          (defaultExpectation) => normalizeExpectation(defaultExpectation) === normalizeExpectation(expectation),
        ),
    );

    setTripTitle(sourcePayload.title ?? '');
    setPosterImageDataUrls(sourcePayload.posterImageUrls);
    setPeopleRequired(sourcePayload.peopleRequired);
    setExpectedBudget(typeof sourcePayload.expectedBudget === 'number' && sourcePayload.expectedBudget > 0 ? sourcePayload.expectedBudget.toString() : '');
    setSelectedExpectations(sourcePayload.expectations);
    setCustomExpectations(customFromPayload);
    setExpectationDraft('');
    setInterestedIn(sourcePayload.interestedIn);
    setOnlyVerifiedUsers(sourcePayload.onlyVerifiedUsers);
    setStartJourneyDate(sourcePayload.startJourneyDate || defaultJourneyDates.startJourneyDate);
    setEndJourneyDate(sourcePayload.endJourneyDate || defaultJourneyDates.endJourneyDate);
    setLocation(sourcePayload.location ?? '');
    setTravelerType(
      TRAVELER_TYPE_OPTIONS.find(
        (travelerTypeOption) => travelerTypeOption.toLowerCase() === (sourcePayload.travelerType ?? '').toLowerCase(),
      ) ?? '',
    );
    setCurrency(CURRENCY_OPTIONS.includes(sourcePayload.currency) ? sourcePayload.currency : 'USD');
    setEmergencyContactName(sourcePayload.emergencyContact?.name ?? '');
    setEmergencyContactPhone(sourcePayload.emergencyContact?.phone ?? '');
    setFieldErrors({});
    setFormError('');
  };

  useEffect(() => {
    applyPayloadToForm(initialPayload);
  }, [initialPayload]);

  const resetForm = () => {
    if (isEditMode) {
      applyPayloadToForm(initialPayload);
      return;
    }

    applyPayloadToForm(undefined);
  };

  const handlePosterImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (selectedFiles.length === 0) {
      return;
    }

    const imageFiles = selectedFiles.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setFormError('Please select image files only for poster photos.');
      return;
    }

    const remainingSlots = MAX_POSTER_IMAGES - posterImageDataUrls.length;
    if (remainingSlots <= 0) {
      setFormError(`You can upload up to ${MAX_POSTER_IMAGES} poster photos.`);
      return;
    }

    const filesToAdd = imageFiles.slice(0, remainingSlots);

    try {
      const dataUrls = await Promise.all(filesToAdd.map((file) => readFileAsDataUrl(file)));
      setPosterImageDataUrls((previous) => [...previous, ...dataUrls]);
      setFieldErrors((previous) => {
        if (!previous.posterImageUrls) {
          return previous;
        }

        const nextErrors = { ...previous };
        delete nextErrors.posterImageUrls;
        return nextErrors;
      });

      if (imageFiles.length > remainingSlots || imageFiles.length !== selectedFiles.length) {
        setFormError(`Only ${MAX_POSTER_IMAGES} poster images are allowed and they must be image files.`);
        return;
      }

      setFormError('');
    } catch {
      setFormError('Unable to read selected images. Please try again.');
    }
  };

  const handleRemovePosterImage = (index: number) => {
    setPosterImageDataUrls((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
    setFieldErrors((previous) => {
      if (!previous.posterImageUrls) {
        return previous;
      }

      const nextErrors = { ...previous };
      delete nextErrors.posterImageUrls;
      return nextErrors;
    });
  };

  const handlePeopleCounterStep = (direction: 'increment' | 'decrement') => {
    setPeopleRequired((previous) =>
      direction === 'increment' ? Math.min(MAX_PEOPLE_REQUIRED, previous + 1) : Math.max(1, previous - 1),
    );
  };

  const handleExpectationToggle = (expectation: string) => {
    setSelectedExpectations((previous) =>
      previous.includes(expectation)
        ? previous.filter((currentExpectation) => currentExpectation !== expectation)
        : [...previous, expectation],
    );
    setFieldErrors((previous) => {
      if (!previous.expectations) {
        return previous;
      }

      const nextErrors = { ...previous };
      delete nextErrors.expectations;
      return nextErrors;
    });
  };

  const handleAddCustomExpectation = () => {
    const normalizedExpectation = expectationDraft.trim();
    if (!normalizedExpectation) {
      setFormError('Enter an expectation before adding to checklist.');
      return;
    }

    const isDuplicate = expectationOptions.some(
      (expectation) => expectation.toLowerCase() === normalizedExpectation.toLowerCase(),
    );
    if (isDuplicate) {
      setFormError('This expectation is already in your checklist.');
      return;
    }

    setCustomExpectations((previous) => [...previous, normalizedExpectation]);
    setSelectedExpectations((previous) => [...previous, normalizedExpectation]);
    setExpectationDraft('');
    setFieldErrors((previous) => {
      if (!previous.expectations) {
        return previous;
      }

      const nextErrors = { ...previous };
      delete nextErrors.expectations;
      return nextErrors;
    });
    setFormError('');
  };

  const handleRemoveCustomExpectation = (expectationToRemove: string) => {
    setCustomExpectations((previous) =>
      previous.filter((expectation) => expectation !== expectationToRemove),
    );
    setSelectedExpectations((previous) =>
      previous.filter((expectation) => expectation !== expectationToRemove),
    );
  };

  const handleCreateTripSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFieldErrors: Partial<Record<ValidationField, string>> = {};
    const normalizedTitle = tripTitle.trim();
    const normalizedLocation = location.trim();
    const normalizedExpectedBudget = expectedBudget.trim();
    const normalizedEmergencyContactName = emergencyContactName.trim();
    const normalizedEmergencyContactPhone = emergencyContactPhone.trim();

    if (!normalizedTitle) {
      nextFieldErrors.title = 'This field is required.';
    } else if (normalizedTitle.length < MIN_TRIP_TITLE_LENGTH) {
      nextFieldErrors.title = `Trip title must be at least ${MIN_TRIP_TITLE_LENGTH} characters.`;
    } else if (normalizedTitle.length > MAX_TRIP_TITLE_LENGTH) {
      nextFieldErrors.title = `Trip title must be ${MAX_TRIP_TITLE_LENGTH} characters or fewer.`;
    }

    if (posterImageDataUrls.length === 0) {
      nextFieldErrors.posterImageUrls = 'This field is required.';
    }

    if (!normalizedLocation) {
      nextFieldErrors.location = 'This field is required.';
    } else if (normalizedLocation.length > MAX_LOCATION_LENGTH) {
      nextFieldErrors.location = `Destination must be ${MAX_LOCATION_LENGTH} characters or fewer.`;
    }

    if (!startJourneyDate) {
      nextFieldErrors.startJourneyDate = 'This field is required.';
    }

    if (!endJourneyDate) {
      nextFieldErrors.endJourneyDate = 'This field is required.';
    }

    if (!normalizedExpectedBudget) {
      nextFieldErrors.expectedBudget = 'This field is required.';
    }

    if (!travelerType) {
      nextFieldErrors.travelerType = 'This field is required.';
    }

    if (!currency) {
      nextFieldErrors.currency = 'This field is required.';
    }

    if (!normalizedEmergencyContactName) {
      nextFieldErrors.emergencyContactName = 'This field is required.';
    } else if (normalizedEmergencyContactName.length > MAX_EMERGENCY_CONTACT_NAME_LENGTH) {
      nextFieldErrors.emergencyContactName = `Emergency contact name must be ${MAX_EMERGENCY_CONTACT_NAME_LENGTH} characters or fewer.`;
    }

    if (!normalizedEmergencyContactPhone) {
      nextFieldErrors.emergencyContactPhone = 'This field is required.';
    } else if (normalizedEmergencyContactPhone.length > MAX_EMERGENCY_CONTACT_PHONE_LENGTH) {
      nextFieldErrors.emergencyContactPhone = `Emergency contact phone must be ${MAX_EMERGENCY_CONTACT_PHONE_LENGTH} characters or fewer.`;
    }

    if (selectedExpectations.length === 0) {
      nextFieldErrors.expectations = 'This field is required.';
    }

    const parsedExpectedBudget = Number(normalizedExpectedBudget);
    if (normalizedExpectedBudget && (!Number.isFinite(parsedExpectedBudget) || parsedExpectedBudget < 1)) {
      nextFieldErrors.expectedBudget = 'Expected budget must be at least 1.';
    }

    if (
      startJourneyDate &&
      endJourneyDate &&
      new Date(`${endJourneyDate}T23:59:59`).getTime() < new Date(`${startJourneyDate}T00:00:00`).getTime()
    ) {
      nextFieldErrors.endJourneyDate = 'End date must be on or after start date.';
    } else if (startJourneyDate && endJourneyDate) {
      const startDate = new Date(`${startJourneyDate}T00:00:00`);
      const endDate = new Date(`${endJourneyDate}T23:59:59`);
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      const durationDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerDay));

      if (durationDays > MAX_TRIP_DURATION_DAYS) {
        nextFieldErrors.endJourneyDate = `Trips can be at most ${MAX_TRIP_DURATION_DAYS} days long.`;
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setFormError('');

      const firstFieldWithError = FIELD_SCROLL_ORDER.find((fieldKey) => nextFieldErrors[fieldKey]);
      if (firstFieldWithError && typeof document !== 'undefined') {
        const fieldContainer = document.getElementById(FIELD_CONTAINER_IDS[firstFieldWithError]);
        fieldContainer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => {
          const focusableElement = fieldContainer?.querySelector('input, select, textarea, button');
          if (focusableElement instanceof HTMLElement) {
            focusableElement.focus({ preventScroll: true });
          }
        }, 180);
      }
      return;
    }

    setFieldErrors({});
    setFormError('');

    setIsLocalSubmitting(true);
    try {
      const wasSaved = await onTripCreated({
        title: normalizedTitle,
        posterImageUrls: posterImageDataUrls,
        peopleRequired,
        expectedBudget: parsedExpectedBudget,
        expectations: selectedExpectations,
        interestedIn,
        onlyVerifiedUsers,
        startJourneyDate,
        endJourneyDate,
        location: normalizedLocation,
        travelerType,
        currency,
        isPrivate: Boolean(initialPayload?.isPrivate),
        emergencyContact: {
          name: normalizedEmergencyContactName,
          phone: normalizedEmergencyContactPhone,
        },
      });

      if (wasSaved && !isEditMode) {
        resetForm();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save trip right now.';
      setFormError(message);
    } finally {
      setIsLocalSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
      <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Host A Trip</p>
        <h2 className="mt-1 text-3xl font-black text-primary">{isEditMode ? 'Edit Trip' : 'Create Trip'}</h2>
        <p className="mt-2 text-sm text-primary/80">
          {isEditMode
            ? `Update your group trip post details and expectations. Host: ${hostName}`
            : `Create your group trip post, set expectations, and define who can join. Host: ${hostName}`}
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleCreateTripSubmit} noValidate>
          <label id={FIELD_CONTAINER_IDS.title} className={`block ${SQUARE_PANEL_CLASS_NAME}`}>
            <span className="mb-1 block text-sm font-semibold text-primary">
              Trip Title <span className="text-red-500">*</span>
            </span>
            <input
              id="create-trip-title"
              type="text"
              value={tripTitle}
              minLength={MIN_TRIP_TITLE_LENGTH}
              maxLength={MAX_TRIP_TITLE_LENGTH}
              disabled={isBusy}
              onChange={(event) => {
                setTripTitle(event.target.value);
                setFieldErrors((previous) => {
                  if (!previous.title) {
                    return previous;
                  }

                  const nextErrors = { ...previous };
                  delete nextErrors.title;
                  return nextErrors;
                });
              }}
              className={getInputClassName(Boolean(fieldErrors.title))}
              placeholder="Name your trip"
              aria-invalid={Boolean(fieldErrors.title)}
            />
            {fieldErrors.title ? <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.title}</p> : null}
          </label>

          <div id={FIELD_CONTAINER_IDS.posterImageUrls} className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <p className="text-sm font-semibold text-primary">Poster Image (max 4 photos)</p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePosterImageChange}
              className="mt-3 text-sm text-primary file:mr-3 file:rounded-card file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              aria-invalid={Boolean(fieldErrors.posterImageUrls)}
            />
            <p className="mt-2 text-xs text-primary/75">
              {posterImageDataUrls.length} / {MAX_POSTER_IMAGES} selected
            </p>
            {fieldErrors.posterImageUrls ? (
              <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.posterImageUrls}</p>
            ) : null}

            {posterImageDataUrls.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {posterImageDataUrls.map((imageDataUrl, index) => (
                  <div key={`poster-${index}`} className="relative overflow-hidden rounded-card ring-1 ring-primary/10">
                    <img src={imageDataUrl} alt={`Trip poster ${index + 1}`} className="h-24 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePosterImage(index)}
                      className="interactive-btn absolute right-2 top-2 rounded-card bg-black/70 px-2 py-1 text-[11px] font-semibold text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={SQUARE_PANEL_CLASS_NAME}>
              <p className="text-sm font-semibold text-primary">Number Of people Required</p>
              <div className="mt-3 inline-flex items-center gap-3 rounded-card border border-primary/15 bg-white px-3 py-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handlePeopleCounterStep('decrement')}
                  className="interactive-btn h-8 w-8 rounded-card border border-primary/20 text-sm font-bold text-primary"
                >
                  -
                </button>
                <span className="min-w-8 text-center text-sm font-semibold text-primary">{peopleRequired}</span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handlePeopleCounterStep('increment')}
                  className="interactive-btn h-8 w-8 rounded-card border border-primary/20 text-sm font-bold text-primary"
                >
                  +
                </button>
              </div>
            </div>

            <label id={FIELD_CONTAINER_IDS.expectedBudget} className={`block ${SQUARE_PANEL_CLASS_NAME}`}>
              <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary">
                Expected Budget <span className="text-red-500">*</span>
                <span
                  title="This is the total estimated cost for the whole group. We will use this to track your spending and calculate the final liquidation."
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/20 bg-white text-[11px] font-bold text-primary/65"
                >
                  ?
                </span>
              </span>
              <input
                type="number"
                min={1}
                step="0.01"
                value={expectedBudget}
                disabled={isBusy}
                onChange={(event) => {
                  setExpectedBudget(event.target.value);
                  setFieldErrors((previous) => {
                    if (!previous.expectedBudget) {
                      return previous;
                    }

                    const nextErrors = { ...previous };
                    delete nextErrors.expectedBudget;
                    return nextErrors;
                  });
                }}
                className={getInputClassName(Boolean(fieldErrors.expectedBudget))}
                placeholder="Enter the full trip budget"
                aria-invalid={Boolean(fieldErrors.expectedBudget)}
              />
              <p className="mt-2 text-xs text-primary/65">Required for budget tracking, settlement, and liquidation progress.</p>
              {fieldErrors.expectedBudget ? (
                <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.expectedBudget}</p>
              ) : null}
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-1">
            <label id={FIELD_CONTAINER_IDS.currency} className={`block ${SQUARE_PANEL_CLASS_NAME}`}>
              <span className="mb-1 block text-sm font-semibold text-primary">Currency</span>
              <div className="relative">
                <select
                  value={currency}
                  disabled={isBusy}
                  onChange={(event) => {
                    setCurrency(event.target.value as TripCurrency);
                    setFieldErrors((previous) => {
                      if (!previous.currency) {
                        return previous;
                      }

                      const nextErrors = { ...previous };
                      delete nextErrors.currency;
                      return nextErrors;
                    });
                  }}
                  className={getInputClassName(Boolean(fieldErrors.currency), 'appearance-none pr-11')}
                  aria-invalid={Boolean(fieldErrors.currency)}
                >
                  {CURRENCY_OPTIONS.map((currencyOption) => (
                    <option key={currencyOption} value={currencyOption}>
                      {currencyOption}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/55" />
              </div>
              {fieldErrors.currency ? <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.currency}</p> : null}
            </label>
          </div>

          <label id={FIELD_CONTAINER_IDS.location} className="block rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <span className="mb-1 block text-sm font-semibold text-primary">
              Destination <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={location}
              maxLength={MAX_LOCATION_LENGTH}
              disabled={isBusy}
              onChange={(event) => {
                setLocation(event.target.value);
                setFieldErrors((previous) => {
                  if (!previous.location) {
                    return previous;
                  }

                  const nextErrors = { ...previous };
                  delete nextErrors.location;
                  return nextErrors;
                });
              }}
              className={getInputClassName(Boolean(fieldErrors.location))}
              placeholder="Enter trip destination"
              aria-invalid={Boolean(fieldErrors.location)}
            />
            {fieldErrors.location ? <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.location}</p> : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label id={FIELD_CONTAINER_IDS.startJourneyDate} className="block rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
              <span className="mb-1 block text-sm font-semibold text-primary">
                Start Date <span className="text-red-500">*</span>
              </span>
              <input
                type="date"
                value={startJourneyDate}
                disabled={isBusy}
                onChange={(event) => {
                  setStartJourneyDate(event.target.value);
                  setFieldErrors((previous) => {
                    if (!previous.startJourneyDate) {
                      return previous;
                    }

                    const nextErrors = { ...previous };
                    delete nextErrors.startJourneyDate;
                    return nextErrors;
                  });
                }}
                className={getInputClassName(Boolean(fieldErrors.startJourneyDate))}
                aria-invalid={Boolean(fieldErrors.startJourneyDate)}
              />
              {fieldErrors.startJourneyDate ? (
                <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.startJourneyDate}</p>
              ) : null}
            </label>

            <label id={FIELD_CONTAINER_IDS.endJourneyDate} className="block rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
              <span className="mb-1 block text-sm font-semibold text-primary">
                End Date <span className="text-red-500">*</span>
              </span>
              <input
                type="date"
                value={endJourneyDate}
                disabled={isBusy}
                min={startJourneyDate || undefined}
                onChange={(event) => {
                  setEndJourneyDate(event.target.value);
                  setFieldErrors((previous) => {
                    if (!previous.endJourneyDate) {
                      return previous;
                    }

                    const nextErrors = { ...previous };
                    delete nextErrors.endJourneyDate;
                    return nextErrors;
                  });
                }}
                className={getInputClassName(Boolean(fieldErrors.endJourneyDate))}
                aria-invalid={Boolean(fieldErrors.endJourneyDate)}
              />
              {fieldErrors.endJourneyDate ? (
                <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.endJourneyDate}</p>
              ) : null}
            </label>
          </div>

          <label id={FIELD_CONTAINER_IDS.travelerType} className={`block ${SQUARE_PANEL_CLASS_NAME}`}>
            <span className="mb-1 block text-sm font-semibold text-primary">Traveler Type</span>
            <div className="relative">
              <select
                value={travelerType}
                disabled={isBusy}
                onChange={(event) => {
                  setTravelerType(event.target.value);
                  setFieldErrors((previous) => {
                    if (!previous.travelerType) {
                      return previous;
                    }

                    const nextErrors = { ...previous };
                    delete nextErrors.travelerType;
                    return nextErrors;
                  });
                }}
                className={getInputClassName(Boolean(fieldErrors.travelerType), 'appearance-none pr-11')}
                aria-invalid={Boolean(fieldErrors.travelerType)}
              >
                <option value="">{TRAVELER_TYPE_PLACEHOLDER}</option>
                {TRAVELER_TYPE_OPTIONS.map((travelerTypeOption) => (
                  <option key={travelerTypeOption} value={travelerTypeOption}>
                    {travelerTypeOption}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/55" />
            </div>
            {fieldErrors.travelerType ? (
              <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.travelerType}</p>
            ) : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label id={FIELD_CONTAINER_IDS.emergencyContactName} className={`block ${SQUARE_PANEL_CLASS_NAME}`}>
              <span className="mb-1 block text-sm font-semibold text-primary">Emergency Contact Name</span>
              <input
                type="text"
                value={emergencyContactName}
                maxLength={MAX_EMERGENCY_CONTACT_NAME_LENGTH}
                disabled={isBusy}
                onChange={(event) => {
                  setEmergencyContactName(event.target.value);
                  setFieldErrors((previous) => {
                    if (!previous.emergencyContactName) {
                      return previous;
                    }

                    const nextErrors = { ...previous };
                    delete nextErrors.emergencyContactName;
                    return nextErrors;
                  });
                }}
                className={getInputClassName(Boolean(fieldErrors.emergencyContactName))}
                placeholder="Enter emergency contact name"
                aria-invalid={Boolean(fieldErrors.emergencyContactName)}
              />
              {fieldErrors.emergencyContactName ? (
                <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.emergencyContactName}</p>
              ) : null}
            </label>

            <label id={FIELD_CONTAINER_IDS.emergencyContactPhone} className={`block ${SQUARE_PANEL_CLASS_NAME}`}>
              <span className="mb-1 block text-sm font-semibold text-primary">Emergency Contact Phone</span>
              <input
                type="tel"
                value={emergencyContactPhone}
                maxLength={MAX_EMERGENCY_CONTACT_PHONE_LENGTH}
                disabled={isBusy}
                onChange={(event) => {
                  setEmergencyContactPhone(event.target.value);
                  setFieldErrors((previous) => {
                    if (!previous.emergencyContactPhone) {
                      return previous;
                    }

                    const nextErrors = { ...previous };
                    delete nextErrors.emergencyContactPhone;
                    return nextErrors;
                  });
                }}
                className={getInputClassName(Boolean(fieldErrors.emergencyContactPhone))}
                placeholder="Enter emergency contact phone"
                aria-invalid={Boolean(fieldErrors.emergencyContactPhone)}
              />
              {fieldErrors.emergencyContactPhone ? (
                <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.emergencyContactPhone}</p>
              ) : null}
            </label>
          </div>

          <div id={FIELD_CONTAINER_IDS.expectations} className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <p className="text-sm font-semibold text-primary">Expectation Text box (Checklist)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                value={expectationDraft}
                disabled={isBusy}
                onChange={(event) => setExpectationDraft(event.target.value)}
                className="interactive-input min-w-[220px] flex-1 rounded-card border border-primary/15 bg-white px-4 py-2.5 text-sm text-primary outline-none"
                placeholder="Add custom expectation"
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={handleAddCustomExpectation}
                className="interactive-btn rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-white"
              >
                Add
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {expectationOptions.map((expectation) => {
                const isCustomExpectation = customExpectations.includes(expectation);

                return (
                  <div key={expectation} className="flex items-center gap-2 rounded-card bg-white px-3 py-2 ring-1 ring-primary/10">
                    <label className="flex flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedExpectations.includes(expectation)}
                        disabled={isBusy}
                        onChange={() => handleExpectationToggle(expectation)}
                        className="h-4 w-4 accent-accent"
                      />
                      <span className="text-sm text-primary">{expectation}</span>
                    </label>
                    {isCustomExpectation ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRemoveCustomExpectation(expectation)}
                        className="interactive-btn rounded-card border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {fieldErrors.expectations ? (
              <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.expectations}</p>
            ) : null}
          </div>

          <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <p className="text-sm font-semibold text-primary">Interested In</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {(['Male', 'Female', 'Unspecified'] as InterestedInOption[]).map((option) => (
                <label key={option} className="flex items-center gap-2 rounded-card bg-white px-3 py-2 ring-1 ring-primary/10">
                  <input
                    type="radio"
                    name="interestedIn"
                    value={option}
                    checked={interestedIn === option}
                    disabled={isBusy}
                    onChange={() => setInterestedIn(option)}
                    className="h-4 w-4 accent-accent"
                  />
                  <span className="text-sm text-primary">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <input
              type="checkbox"
              checked={onlyVerifiedUsers}
              disabled={isBusy}
              onChange={(event) => setOnlyVerifiedUsers(event.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            <span className="text-sm font-semibold text-primary">Only verified user</span>
          </label>

          {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isBusy}
              className="interactive-btn rounded-card bg-accent px-5 py-2.5 text-sm font-semibold text-white"
            >
              {isBusy ? (isEditMode ? 'Saving...' : 'Creating...') : isEditMode ? 'Save Changes' : 'Create Trip'}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={isEditMode ? (onCancel ?? resetForm) : resetForm}
              className="interactive-btn rounded-card border border-primary/20 bg-background/80 px-5 py-2.5 text-sm font-semibold text-primary"
            >
              {isEditMode ? 'Cancel' : 'Reset'}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
};

export default CreateTripView;

