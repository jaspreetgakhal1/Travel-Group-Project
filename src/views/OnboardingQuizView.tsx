// Added by Codex: project documentation comment for src\views\OnboardingQuizView.tsx
import React, { useState } from 'react';
import TravelDNARadarChart from '../components/travel-dna/TravelDNARadarChart';
import VibeSlider from '../components/travel-dna/VibeSlider';
import {
  TRAVEL_DNA_DIMENSIONS,
  TRAVEL_ROLE_OPTIONS,
  defaultUserDNA,
  normalizeTravelDNA,
  type TravelRole,
  type UserDNA,
} from '../models/dnaModel';

type OnboardingQuizViewProps = {
  userName: string;
  initialDNA: UserDNA;
  onComplete: (dna: UserDNA) => void;
};

const OnboardingQuizView: React.FC<OnboardingQuizViewProps> = ({ userName, initialDNA, onComplete }) => {
  const [draftDNA, setDraftDNA] = useState<UserDNA>(normalizeTravelDNA(initialDNA));

  const handleDimensionChange = (fieldName: (typeof TRAVEL_DNA_DIMENSIONS)[number]['key'], value: number) => {
    setDraftDNA((previous) => ({
      ...previous,
      [fieldName]: Math.min(10, Math.max(1, Math.round(value))),
    }));
  };

  const handleRoleToggle = (role: TravelRole) => {
    setDraftDNA((previous) => {
      const hasRole = previous.travelRoles.includes(role);

      return {
        ...previous,
        travelRoles: hasRole
          ? previous.travelRoles.filter((currentRole) => currentRole !== role)
          : [...previous.travelRoles, role],
      };
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onComplete(draftDNA);
  };

  const handleReset = () => {
    setDraftDNA(defaultUserDNA);
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-8">
      <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Travel DNA Quiz</p>
        <h2 className="mt-1 text-3xl font-black text-primary">Welcome, {userName}</h2>
        <p className="mt-2 text-sm text-primary/80">
          Set your sliders from Sand to Deep Forest to map your travel vibe in real-time.
        </p>

        <form className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]" onSubmit={handleSubmit}>
          <div className="space-y-3">
            {TRAVEL_DNA_DIMENSIONS.map(({ key, label, lowLabel, highLabel }) => (
              <VibeSlider
                key={key}
                id={key}
                label={label}
                lowLabel={lowLabel}
                highLabel={highLabel}
                value={draftDNA[key]}
                onChange={(nextValue) => handleDimensionChange(key, nextValue)}
              />
            ))}

            <section className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
              <p className="text-sm font-semibold text-primary">Travel Roles</p>
              <p className="mt-1 text-xs text-primary/70">Pick one or more roles you naturally take in group trips.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TRAVEL_ROLE_OPTIONS.map((role) => {
                  const isSelected = draftDNA.travelRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleToggle(role)}
                      className={
                        isSelected
                          ? 'interactive-btn rounded-full border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-white'
                          : 'interactive-btn rounded-full border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary'
                      }
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-3">
            <TravelDNARadarChart
              primaryDNA={draftDNA}
              primaryLabel="Your Live DNA"
              primaryColor="#3D405B"
              className="sticky top-24"
            />
            <div className="rounded-card bg-background/80 p-3 text-xs text-primary/75 ring-1 ring-primary/10">
              Radar updates live as you move sliders.
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="interactive-btn rounded-card border border-primary/20 bg-background/60 px-4 py-2.5 text-sm font-semibold text-primary"
            >
              Reset DNA
            </button>

            <button
              type="submit"
              className="interactive-btn rounded-card bg-accent px-5 py-2.5 text-sm font-semibold text-white"
            >
              Save DNA & Continue
            </button>
          </div>
        </form>
      </article>
    </section>
  );
};

export default OnboardingQuizView;

