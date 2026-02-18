import React, { useState } from 'react';
import type { TravelPace, UserDNA } from '../models/dnaModel';

type OnboardingQuizViewProps = {
  userName: string;
  initialDNA: UserDNA;
  onComplete: (dna: UserDNA) => void;
};

const stepTitles = ['Social Energy', 'Budget Range', 'Travel Pace'];

const OnboardingQuizView: React.FC<OnboardingQuizViewProps> = ({ userName, initialDNA, onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [draftDNA, setDraftDNA] = useState<UserDNA>(initialDNA);

  const isFinalStep = stepIndex === stepTitles.length - 1;

  const handlePaceChange = (pace: TravelPace) => {
    setDraftDNA((previous) => ({
      ...previous,
      pace,
    }));
  };

  const handleNext = () => {
    if (isFinalStep) {
      onComplete(draftDNA);
      return;
    }

    setStepIndex((previous) => previous + 1);
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-8">
      <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Travel DNA Quiz</p>
        <h2 className="mt-1 text-3xl font-black text-primary">Welcome, {userName}</h2>
        <p className="mt-2 text-sm text-primary/80">
          Tell us your vibe so the matchmaking engine can prioritize compatible groups.
        </p>

        <div className="mt-6 flex items-center justify-between gap-3">
          {stepTitles.map((title, index) => (
            <div key={title} className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">{title}</p>
              <div
                className={
                  index <= stepIndex
                    ? 'mt-1 h-2 rounded-full bg-accent'
                    : 'mt-1 h-2 rounded-full bg-primary/10'
                }
              />
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-card bg-background/80 p-6 ring-1 ring-primary/10">
          {stepIndex === 0 ? (
            <label className="block">
              <span className="text-sm font-semibold text-primary">How social are you on trips? ({draftDNA.socialEnergy}/10)</span>
              <input
                type="range"
                min={1}
                max={10}
                value={draftDNA.socialEnergy}
                onChange={(event) =>
                  setDraftDNA((previous) => ({
                    ...previous,
                    socialEnergy: Number(event.target.value),
                  }))
                }
                className="mt-3 w-full accent-accent"
              />
            </label>
          ) : null}

          {stepIndex === 1 ? (
            <label className="block">
              <span className="text-sm font-semibold text-primary">Your budget comfort level? ({draftDNA.budgetRange}/10)</span>
              <input
                type="range"
                min={1}
                max={10}
                value={draftDNA.budgetRange}
                onChange={(event) =>
                  setDraftDNA((previous) => ({
                    ...previous,
                    budgetRange: Number(event.target.value),
                  }))
                }
                className="mt-3 w-full accent-accent"
              />
            </label>
          ) : null}

          {stepIndex === 2 ? (
            <div>
              <p className="text-sm font-semibold text-primary">Choose your pace</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handlePaceChange('Active')}
                  className={
                    draftDNA.pace === 'Active'
                      ? 'interactive-btn rounded-card border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white'
                      : 'interactive-btn rounded-card border border-primary/20 bg-white px-4 py-3 text-sm font-semibold text-primary'
                  }
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => handlePaceChange('Chill')}
                  className={
                    draftDNA.pace === 'Chill'
                      ? 'interactive-btn rounded-card border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white'
                      : 'interactive-btn rounded-card border border-primary/20 bg-white px-4 py-3 text-sm font-semibold text-primary'
                  }
                >
                  Chill
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStepIndex((previous) => Math.max(0, previous - 1))}
            disabled={stepIndex === 0}
            className="interactive-btn rounded-card border border-primary/20 px-4 py-2.5 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="interactive-btn rounded-card bg-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            {isFinalStep ? 'Save DNA & Continue' : 'Next'}
          </button>
        </div>
      </article>
    </section>
  );
};

export default OnboardingQuizView;
