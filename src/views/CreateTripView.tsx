import React, { useMemo, useState } from 'react';

type InterestedInOption = 'Male' | 'Female' | 'Unspecified';

export type CreateTripPayload = {
  posterImageUrls: string[];
  peopleRequired: number;
  budget: number;
  expectations: string[];
  interestedIn: InterestedInOption;
  onlyVerifiedUsers: boolean;
};

type CreateTripViewProps = {
  hostName: string;
  onTripCreated: (payload: CreateTripPayload) => void;
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

const CreateTripView: React.FC<CreateTripViewProps> = ({ hostName, onTripCreated }) => {
  const [posterImageDataUrls, setPosterImageDataUrls] = useState<string[]>([]);
  const [peopleRequired, setPeopleRequired] = useState(4);
  const [budget, setBudget] = useState('');
  const [selectedExpectations, setSelectedExpectations] = useState<string[]>([]);
  const [customExpectations, setCustomExpectations] = useState<string[]>([]);
  const [expectationDraft, setExpectationDraft] = useState('');
  const [interestedIn, setInterestedIn] = useState<InterestedInOption>('Unspecified');
  const [onlyVerifiedUsers, setOnlyVerifiedUsers] = useState(false);
  const [formError, setFormError] = useState('');

  const expectationOptions = useMemo(
    () => [...DEFAULT_EXPECTATION_OPTIONS, ...customExpectations],
    [customExpectations],
  );

  const resetForm = () => {
    setPosterImageDataUrls([]);
    setPeopleRequired(4);
    setBudget('');
    setSelectedExpectations([]);
    setCustomExpectations([]);
    setExpectationDraft('');
    setInterestedIn('Unspecified');
    setOnlyVerifiedUsers(false);
    setFormError('');
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

  const handleCreateTripSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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

    onTripCreated({
      posterImageUrls: posterImageDataUrls,
      peopleRequired,
      budget: parsedBudget,
      expectations: selectedExpectations,
      interestedIn,
      onlyVerifiedUsers,
    });
    resetForm();
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
      <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Host A Trip</p>
        <h2 className="mt-1 text-3xl font-black text-primary">Create Trip</h2>
        <p className="mt-2 text-sm text-primary/80">
          Create your group trip post, set expectations, and define who can join. Host: {hostName}
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
                  onClick={() => handlePeopleCounterStep('decrement')}
                  className="interactive-btn h-8 w-8 rounded-card border border-primary/20 text-sm font-bold text-primary"
                >
                  -
                </button>
                <span className="min-w-8 text-center text-sm font-semibold text-primary">{peopleRequired}</span>
                <button
                  type="button"
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
                onChange={(event) => setBudget(event.target.value)}
                className="interactive-input w-full rounded-card border border-primary/15 bg-white px-4 py-3 text-sm text-primary outline-none"
                placeholder="Enter total budget"
              />
            </label>
          </div>

          <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
            <p className="text-sm font-semibold text-primary">Expectation Text box (Checklist)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                value={expectationDraft}
                onChange={(event) => setExpectationDraft(event.target.value)}
                className="interactive-input min-w-[220px] flex-1 rounded-card border border-primary/15 bg-white px-4 py-2.5 text-sm text-primary outline-none"
                placeholder="Add custom expectation"
              />
              <button
                type="button"
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
                        onChange={() => handleExpectationToggle(expectation)}
                        className="h-4 w-4 accent-accent"
                      />
                      <span className="text-sm text-primary">{expectation}</span>
                    </label>
                    {isCustomExpectation ? (
                      <button
                        type="button"
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
              onChange={(event) => setOnlyVerifiedUsers(event.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            <span className="text-sm font-semibold text-primary">Only verified user</span>
          </label>

          {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="interactive-btn rounded-card bg-accent px-5 py-2.5 text-sm font-semibold text-white"
            >
              Create Trip
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="interactive-btn rounded-card border border-primary/20 bg-background/80 px-5 py-2.5 text-sm font-semibold text-primary"
            >
              Reset
            </button>
          </div>
        </form>
      </article>
    </section>
  );
};

export default CreateTripView;
