// Added by Codex: project documentation comment for src\views\CreateTripView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type InterestedInOption = 'Male' | 'Female' | 'Unspecified';

export type CreateTripPayload = {
  posterImageUrls: string[];
  peopleRequired: number;
  budget: number;
  expectations: string[];
  interestedIn: InterestedInOption;
  onlyVerifiedUsers: boolean;
  startJourneyDate: string;
  endJourneyDate: string;
  location: string;
  travelerType: string;
};

type CreateTripViewProps = {
  hostName: string;
  mode?: 'create' | 'edit';
  initialPayload?: CreateTripPayload;
  isSubmitting?: boolean;
  onTripCreated: (payload: CreateTripPayload) => void | Promise<void>;
  onCancel?: () => void;
};

const MAX_POSTER_IMAGES = 4;
const MAX_PEOPLE_REQUIRED = 20;
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
const TRAVELER_TYPE_PLACEHOLDER = 'Select your travel style';
const SELECT_INPUT_CLASS_NAME =
  'interactive-input w-full appearance-none rounded-card border border-primary/15 bg-white px-4 py-3 pr-11 text-sm text-primary outline-none transition focus:border-[#81B29A] focus:ring-2 focus:ring-[#81B29A]/20';

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
  const [posterImageDataUrls, setPosterImageDataUrls] = useState<string[]>([]);
  const [peopleRequired, setPeopleRequired] = useState(4);
  const [budget, setBudget] = useState('');
  const [selectedExpectations, setSelectedExpectations] = useState<string[]>([]);
  const [customExpectations, setCustomExpectations] = useState<string[]>([]);
  const [expectationDraft, setExpectationDraft] = useState('');
  const [interestedIn, setInterestedIn] = useState<InterestedInOption>('Unspecified');
  const [onlyVerifiedUsers, setOnlyVerifiedUsers] = useState(false);
  const [startJourneyDate, setStartJourneyDate] = useState('');
  const [endJourneyDate, setEndJourneyDate] = useState('');
  const [location, setLocation] = useState('');
  const [travelerType, setTravelerType] = useState('');
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
      posterImageUrls: [],
      peopleRequired: 4,
      budget: 0,
      expectations: [],
      interestedIn: 'Unspecified' as InterestedInOption,
      onlyVerifiedUsers: false,
      ...defaultJourneyDates,
      location: '',
      travelerType: '',
    };
    const customFromPayload = sourcePayload.expectations.filter(
      (expectation) =>
        !DEFAULT_EXPECTATION_OPTIONS.some(
          (defaultExpectation) => normalizeExpectation(defaultExpectation) === normalizeExpectation(expectation),
        ),
    );

    setPosterImageDataUrls(sourcePayload.posterImageUrls);
    setPeopleRequired(sourcePayload.peopleRequired);
    setBudget(sourcePayload.budget > 0 ? sourcePayload.budget.toString() : '');
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

    if (posterImageDataUrls.length === 0) {
      setFormError('Please add at least one poster image.');
      return;
    }

    const parsedBudget = Number(budget);
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setFormError('Please enter a valid budget amount.');
      return;
    }

    if (selectedExpectations.length === 0) {
      setFormError('Select at least one expectation from the checklist.');
      return;
    }

    const normalizedLocation = location.trim();
    if (!normalizedLocation) {
      setFormError('Location is required.');
      return;
    }

    if (!travelerType) {
      setFormError('Please select your traveler type.');
      return;
    }

    if (!startJourneyDate || !endJourneyDate) {
      setFormError('Please choose both journey start and end dates.');
      return;
    }

    if (new Date(`${endJourneyDate}T23:59:59`).getTime() < new Date(`${startJourneyDate}T00:00:00`).getTime()) {
      setFormError('End journey date cannot be earlier than start journey date.');
      return;
    }

    setIsLocalSubmitting(true);
    try {
      await onTripCreated({
        posterImageUrls: posterImageDataUrls,
        peopleRequired,
        budget: parsedBudget,
        expectations: selectedExpectations,
        interestedIn,
        onlyVerifiedUsers,
        startJourneyDate,
        endJourneyDate,
        location: normalizedLocation,
        travelerType,
      });

      if (!isEditMode) {
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
          <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <p className="text-sm font-semibold text-primary">Poster Image (max 4 photos)</p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePosterImageChange}
              className="mt-3 text-sm text-primary file:mr-3 file:rounded-card file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            <p className="mt-2 text-xs text-primary/75">
              {posterImageDataUrls.length} / {MAX_POSTER_IMAGES} selected
            </p>

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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
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

            <label className="block rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
              <span className="mb-1 block text-sm font-semibold text-primary">Budget</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={budget}
                disabled={isBusy}
                onChange={(event) => setBudget(event.target.value)}
                className="interactive-input w-full rounded-card border border-primary/15 bg-white px-4 py-3 text-sm text-primary outline-none"
                placeholder="Enter total budget"
              />
            </label>
          </div>

          <label className="block rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <span className="mb-1 block text-sm font-semibold text-primary">Location</span>
            <input
              type="text"
              value={location}
              disabled={isBusy}
              onChange={(event) => setLocation(event.target.value)}
              className="interactive-input w-full rounded-card border border-primary/15 bg-white px-4 py-3 text-sm text-primary outline-none"
              placeholder="Enter trip location"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
              <span className="mb-1 block text-sm font-semibold text-primary">Start Journey Date</span>
              <input
                type="date"
                value={startJourneyDate}
                disabled={isBusy}
                onChange={(event) => setStartJourneyDate(event.target.value)}
                className="interactive-input w-full rounded-card border border-primary/15 bg-white px-4 py-3 text-sm text-primary outline-none"
              />
            </label>

            <label className="block rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
              <span className="mb-1 block text-sm font-semibold text-primary">End Journey Date</span>
              <input
                type="date"
                value={endJourneyDate}
                disabled={isBusy}
                min={startJourneyDate || undefined}
                onChange={(event) => setEndJourneyDate(event.target.value)}
                className="interactive-input w-full rounded-card border border-primary/15 bg-white px-4 py-3 text-sm text-primary outline-none"
              />
            </label>
          </div>

          <label className="block rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <span className="mb-1 block text-sm font-semibold text-primary">Traveler Type</span>
            <div className="relative">
              <select
                value={travelerType}
                disabled={isBusy}
                onChange={(event) => setTravelerType(event.target.value)}
                className={SELECT_INPUT_CLASS_NAME}
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
          </label>

          <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
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

