import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, BadgeCheck, CalendarDays, MapPin, Sparkles } from 'lucide-react';
import type { TripExpenseSummary } from '../services/expenseApi';
import type { TripSuggestion, TripSuggestionPreferences, TripSuggestionsSummary } from '../services/tripSuggestionsApi';

type AIExplorerProps = {
  tripSummary: TripExpenseSummary | null;
  suggestionsSummary: TripSuggestionsSummary | null;
  activeVoteId: string | null;
  activeVoteRoomSuggestionId: string | null;
  dateRangeLabel: string;
  error: string;
  isHost: boolean;
  isGenerating: boolean;
  isLoading: boolean;
  onBackToSplit: () => void;
  onAddToVote: (suggestion: TripSuggestion) => void;
  onGenerate: (userPreferences: TripSuggestionPreferences) => void;
  onOpenVoteRoom: (voteId: string) => void;
  onSplitCost: (suggestionName: string, estimatedCost: number) => void;
  onVote: (suggestionId: string) => void;
};

type PreferenceKey = keyof TripSuggestionPreferences;

type QuestionStep = {
  key: PreferenceKey;
  prompt: string;
  subtitle: string;
  options: Array<{
    emoji: string;
    label: string;
    value: string;
  }>;
};

const questionSteps: QuestionStep[] = [
  {
    key: 'collectiveMood',
    prompt: 'What is the collective mood?',
    subtitle: 'Start by choosing the shared energy your group wants to feel today.',
    options: [
      { emoji: '🧘', label: 'Peace & Zen', value: 'Peace & Zen' },
      { emoji: '💃', label: 'High Energy/Disco', value: 'High Energy/Disco' },
    ],
  },
  {
    key: 'interest',
    prompt: 'What peaks your interest today?',
    subtitle: 'This keeps the explorer focused on the kind of places your group actually wants to spend time in.',
    options: [
      { emoji: '🎨', label: 'Arts & Culture', value: 'Arts & Culture' },
      { emoji: '🌲', label: 'Nature/Outdoors', value: 'Nature/Outdoors' },
      { emoji: '🛍️', label: 'Shopping/Local Markets', value: 'Shopping/Local Markets' },
    ],
  },
  {
    key: 'budget',
    prompt: 'How are we feeling about spending?',
    subtitle: 'Gemini will tune the shortlist so it matches your budget comfort level for the day.',
    options: [
      { emoji: '💎', label: 'Luxury/Splurge', value: 'Luxury/Splurge' },
      { emoji: '🎒', label: 'Budget-Friendly', value: 'Budget-Friendly' },
      { emoji: '⚖️', label: 'Balanced', value: 'Balanced' },
    ],
  },
  {
    key: 'food',
    prompt: 'Hungry for what?',
    subtitle: 'Food preference helps the suggestions feel like a real day plan instead of a generic attraction list.',
    options: [
      { emoji: '☕', label: 'Coffee & Cafes', value: 'Coffee & Cafes' },
      { emoji: '🍽️', label: 'Fine Dining', value: 'Fine Dining' },
      { emoji: '🌮', label: 'Street Food', value: 'Street Food' },
    ],
  },
  {
    key: 'crowds',
    prompt: 'Social preference?',
    subtitle: 'Choose whether the group wants buzz and activity or something more tucked away.',
    options: [
      { emoji: '🗣️', label: 'Busy & Bustling', value: 'Busy & Bustling' },
      { emoji: '😶‍🌫️', label: 'Hidden Gems/Quiet', value: 'Hidden Gems/Quiet' },
    ],
  },
];

const buildFallbackImageUrl = (placeName: string, destination: string): string => {
  const query = encodeURIComponent(`${placeName} ${destination}`);
  return `https://source.unsplash.com/featured/800x600/?${query}`;
};

const ImageSkeleton = () => (
  <div className="absolute inset-0 overflow-hidden rounded-none bg-slate-200/80">
    <motion.div
      className="absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)]"
      animate={{ x: ['0%', '320%'] }}
      transition={{ duration: 1.2, ease: 'linear', repeat: Number.POSITIVE_INFINITY }}
    />
  </div>
);

function AIExplorer({
  tripSummary,
  suggestionsSummary,
  activeVoteId,
  activeVoteRoomSuggestionId,
  dateRangeLabel,
  error,
  isHost,
  isGenerating,
  isLoading,
  onBackToSplit,
  onAddToVote,
  onGenerate,
  onOpenVoteRoom,
  onSplitCost,
  onVote,
}: AIExplorerProps) {
  const destinationLabel = suggestionsSummary?.destination ?? tripSummary?.trip.location ?? 'your active trip';
  const travelerTypeLabel = suggestionsSummary?.travelerType ?? 'group travelers';
  const totalTravelers = suggestionsSummary?.totalTravelers ?? tripSummary?.members.length ?? 0;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionDirection, setQuestionDirection] = useState(1);
  const [hasSubmittedQuestionnaire, setHasSubmittedQuestionnaire] = useState(false);
  const [loadedImageIds, setLoadedImageIds] = useState<Record<string, boolean>>({});
  const [userPreferences, setUserPreferences] = useState<TripSuggestionPreferences>({
    collectiveMood: '',
    interest: '',
    budget: '',
    food: '',
    crowds: '',
  });

  const currentQuestion = questionSteps[currentQuestionIndex];
  const isQuestionnaireComplete = questionSteps.every((step) => Boolean(userPreferences[step.key]));
  const shouldShowVoteFeed = Boolean(suggestionsSummary?.suggestions.length) || hasSubmittedQuestionnaire;
  const generatedPreferences = suggestionsSummary?.generatedPreferences;
  const questionProgressPercent = ((currentQuestionIndex + 1) / questionSteps.length) * 100;

  const currentSelections = useMemo(
    () =>
      questionSteps
        .map((step) => userPreferences[step.key])
        .filter((value): value is string => Boolean(value)),
    [userPreferences],
  );

  const handleOptionSelect = (key: PreferenceKey, value: string) => {
    setUserPreferences((previous) => ({
      ...previous,
      [key]: value,
    }));

    if (currentQuestionIndex < questionSteps.length - 1) {
      setQuestionDirection(1);
      setCurrentQuestionIndex((previous) => previous + 1);
    }
  };

  const handleBackQuestion = () => {
    if (currentQuestionIndex === 0) {
      return;
    }

    setQuestionDirection(-1);
    setCurrentQuestionIndex((previous) => previous - 1);
  };

  const handleGenerateSuggestions = () => {
    if (!isQuestionnaireComplete) {
      return;
    }

    setHasSubmittedQuestionnaire(true);
    onGenerate(userPreferences);
  };

  const handleRestartQuestionnaire = () => {
    setHasSubmittedQuestionnaire(false);
    setQuestionDirection(-1);
    setCurrentQuestionIndex(0);
    setLoadedImageIds({});
    setUserPreferences({
      collectiveMood: '',
      interest: '',
      budget: '',
      food: '',
      crowds: '',
    });
  };

  const markImageLoaded = (suggestionId: string) => {
    setLoadedImageIds((previous) => ({
      ...previous,
      [suggestionId]: true,
    }));
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <div className="overflow-hidden rounded-[40px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(251,248,242,0.88))] shadow-[0_38px_120px_-58px_rgba(25,33,52,0.75)] backdrop-blur-2xl">
        <div className="relative min-h-[320px] overflow-hidden">
          {tripSummary?.trip.imageUrl ? (
            <img
              src={tripSummary.trip.imageUrl}
              alt={tripSummary.trip.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,24,40,0.18),rgba(16,24,40,0.82)),radial-gradient(circle_at_top,rgba(255,255,255,0.26),transparent_44%)]" />

          <div className="relative z-10 flex min-h-[320px] flex-col justify-between px-6 py-6 text-white sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBackToSplit}
                className="interactive-btn inline-flex items-center gap-2 rounded-2xl bg-white/16 px-4 py-3 text-sm font-semibold backdrop-blur-md"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Split
              </button>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Explorer
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] backdrop-blur-md">
                  {totalTravelers} travelers
                </span>
              </div>
            </div>

            <div className="max-w-4xl">
              <p className="text-sm font-medium text-white/82">{destinationLabel}</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                {tripSummary?.trip.title ?? 'AI Destination Poll'}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/84 sm:text-[15px]">
                Answer five quick group questions, let Gemini build a tailored shortlist for {destinationLabel}, then vote on the best shared pick.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/85">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1.5 backdrop-blur-md">
                  <MapPin className="h-4 w-4" />
                  {destinationLabel}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1.5 backdrop-blur-md">
                  <CalendarDays className="h-4 w-4" />
                  {dateRangeLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-8">
          {error ? (
            <p className="rounded-[24px] border border-red-200/70 bg-red-50/92 px-4 py-3 text-sm text-red-700 shadow-lg shadow-red-200/35">
              {error}
            </p>
          ) : null}

          {!shouldShowVoteFeed ? (
            <div className="rounded-[34px] border border-white/20 bg-white/76 p-6 shadow-[0_30px_80px_-42px_rgba(17,24,39,0.32)] backdrop-blur-md sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45">
                    Question {currentQuestionIndex + 1} of {questionSteps.length}
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-primary">{currentQuestion.prompt}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-primary/62">{currentQuestion.subtitle}</p>
                </div>

                {currentSelections.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentSelections.map((selection) => (
                      <span
                        key={selection}
                        className="inline-flex rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-primary"
                      >
                        {selection}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-primary/8">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${questionProgressPercent}%` }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(61,64,91,1),rgba(129,178,154,0.92))]"
                />
              </div>

              <div className="mt-6 overflow-hidden">
                <AnimatePresence initial={false} mode="wait" custom={questionDirection}>
                  <motion.div
                    key={currentQuestion.key}
                    custom={questionDirection}
                    initial={{ opacity: 0, x: questionDirection > 0 ? 70 : -70 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: questionDirection > 0 ? -70 : 70 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                  >
                    {currentQuestion.options.map((option) => {
                      const isSelected = userPreferences[currentQuestion.key] === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleOptionSelect(currentQuestion.key, option.value)}
                          className={`interactive-btn rounded-xl border px-5 py-5 text-left shadow-lg transition ${
                            isSelected
                              ? 'border-primary bg-primary text-white shadow-primary/20'
                              : 'border-primary/10 bg-gray-100 text-primary hover:bg-white'
                          }`}
                        >
                          <div className="text-2xl">{option.emoji}</div>
                          <p className="mt-4 text-lg font-black">{option.label}</p>
                        </button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-6 flex flex-col gap-4 rounded-[28px] border border-white/20 bg-[linear-gradient(180deg,rgba(247,246,242,0.9),rgba(255,255,255,0.94))] px-5 py-5 shadow-lg shadow-slate-950/8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/45">Discovery Summary</p>
                  <p className="mt-2 text-sm text-primary/68">
                    {isQuestionnaireComplete
                      ? `${userPreferences.collectiveMood}, ${userPreferences.interest}, ${userPreferences.budget}, ${userPreferences.food}, and ${userPreferences.crowds}.`
                      : "Keep answering the question cards and we'll build the final prompt as you go."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleBackQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="interactive-btn rounded-[22px] bg-white px-4 py-3 text-sm font-semibold text-primary shadow-lg shadow-slate-950/8 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateSuggestions}
                    disabled={!isQuestionnaireComplete || isGenerating || isLoading}
                    className="interactive-btn inline-flex items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(145deg,rgba(61,64,91,1),rgba(73,78,121,0.96))] px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Suggestions'}
                    <Sparkles className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="mt-6 rounded-[28px] border border-white/20 bg-white/72 px-5 py-5 text-sm text-primary shadow-xl shadow-slate-950/8 backdrop-blur-md">
                  Building personalized AI suggestions for your group...
                </div>
              ) : null}
            </div>
          ) : null}

          {shouldShowVoteFeed && suggestionsSummary ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-[30px] border border-white/20 bg-white/74 px-5 py-5 shadow-xl shadow-slate-950/8 backdrop-blur-md md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45">Personalized Discovery Feed</p>
                  <p className="mt-2 text-sm leading-7 text-primary/68">
                    {generatedPreferences
                      ? `${generatedPreferences.collectiveMood}, ${generatedPreferences.interest}, ${generatedPreferences.budget}, ${generatedPreferences.food}, and ${generatedPreferences.crowds}.`
                      : `Tailored for ${travelerTypeLabel}.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRestartQuestionnaire}
                  className="interactive-btn rounded-[22px] bg-white px-4 py-3 text-sm font-semibold text-primary shadow-lg shadow-slate-950/8"
                >
                  Start Over
                </button>
              </div>

              {suggestionsSummary.generatedAt ? (
                <div className="flex justify-end">
                  <div className="rounded-2xl bg-primary/6 px-4 py-3 text-sm font-medium text-primary/72">
                    Updated {new Date(suggestionsSummary.generatedAt).toLocaleString()}
                  </div>
                </div>
              ) : null}

              {suggestionsSummary.suggestions.map((suggestion, index) => {
                const imageUrl = suggestion.imageUrl || buildFallbackImageUrl(suggestion.name, destinationLabel);
                const isImageLoaded = Boolean(loadedImageIds[suggestion.id]);

                return (
                  <article
                    key={suggestion.id}
                    className={`overflow-hidden rounded-[34px] border bg-white/74 shadow-[0_30px_80px_-42px_rgba(17,24,39,0.32)] backdrop-blur-md transition ${
                      suggestion.isLeader ? 'border-green-200/90 ring-1 ring-green-200/80' : 'border-white/20'
                    }`}
                  >
                    <div className="relative h-[260px] overflow-hidden sm:h-[320px]">
                      {!isImageLoaded ? <ImageSkeleton /> : null}
                      <img
                        src={imageUrl}
                        alt={suggestion.name}
                        className={`h-full w-full object-cover transition duration-500 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        loading="lazy"
                        onLoad={() => markImageLoaded(suggestion.id)}
                        onError={() => markImageLoaded(suggestion.id)}
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,24,40,0.06),rgba(16,24,40,0.78))]" />

                      <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-10 text-white sm:px-6 sm:pb-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-white/16 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md">
                            Stop {index + 1}
                          </span>
                          {suggestion.isLeader ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-green-700">
                              Current Leader
                            </span>
                          ) : null}
                        </div>
                        <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{suggestion.name}</h2>
                      </div>
                    </div>

                    <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                      <p className="text-sm leading-7 text-primary/68">{suggestion.whyVisit}</p>

                      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl bg-primary/6 px-4 py-3 text-center text-primary">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/48">Votes</p>
                              <p className="mt-2 text-2xl font-black">{suggestion.voteCount}</p>
                            </div>
                            <div className="rounded-xl bg-white/88 px-4 py-3 text-center text-primary shadow-lg shadow-slate-950/6 ring-1 ring-primary/10">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/48">Est. Cost</p>
                              <p className="mt-2 text-2xl font-black">{`$${suggestion.estimatedCostPerPerson.toFixed(2)}`}</p>
                            </div>
                            <div className="rounded-xl bg-gray-100 px-4 py-3 text-center text-primary">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/48">
                                {suggestion.voteRoom ? 'Vote Room' : 'Match'}
                              </p>
                              <p className="mt-2 text-2xl font-black">
                                {suggestion.voteRoom ? `${suggestion.voteRoom.votedCount}/${suggestion.voteRoom.requiredVotes}` : `${suggestion.vibeMatchPercent}%`}
                              </p>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary/54">
                              <span>
                                {suggestion.voteCount} of {totalTravelers} travelers
                              </span>
                              <span>{Math.round(suggestion.votePercent)}%</span>
                            </div>
                            <div className="mt-2 h-4 overflow-hidden rounded-full bg-primary/8">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(0, Math.min(100, suggestion.votePercent))}%` }}
                                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                                className={`h-full rounded-full ${
                                  suggestion.isLeader
                                    ? 'bg-[linear-gradient(90deg,rgba(129,178,154,0.98),rgba(184,225,206,0.96))]'
                                    : 'bg-[linear-gradient(90deg,rgba(61,64,91,0.96),rgba(129,178,154,0.84))]'
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 lg:justify-end">
                          {suggestion.voteRoom ? (
                            <button
                              type="button"
                              onClick={() => onOpenVoteRoom(suggestion.voteRoom!.id)}
                              className={`interactive-btn rounded-[22px] px-5 py-3 text-sm font-semibold shadow-lg transition ${
                                suggestion.voteRoom.status === 'decided'
                                  ? 'bg-success text-white shadow-success/20'
                                  : 'bg-[#F4F1DE] text-primary shadow-slate-950/8'
                              }`}
                            >
                              {suggestion.voteRoom.status === 'decided' ? 'View Decision' : 'Open Voting Room'}
                            </button>
                          ) : isHost ? (
                            <button
                              type="button"
                              onClick={() => onAddToVote(suggestion)}
                              disabled={activeVoteRoomSuggestionId === suggestion.id}
                              className="interactive-btn rounded-[22px] bg-[#E07A5F] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#E07A5F]/25 transition disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {activeVoteRoomSuggestionId === suggestion.id ? 'Creating Room...' : 'Add to Vote'}
                            </button>
                          ) : null}

                          {suggestion.isWinningSuggestion ? (
                            <button
                              type="button"
                              onClick={() => onSplitCost(suggestion.name, suggestion.estimatedCostPerPerson)}
                              className="interactive-btn inline-flex items-center justify-center gap-2 rounded-[22px] bg-success px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-success/20"
                            >
                              <BadgeCheck className="h-4 w-4" />
                              Split Cost
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => onVote(suggestion.id)}
                            disabled={activeVoteId === suggestion.id}
                            className={`interactive-btn rounded-[22px] px-5 py-3 text-sm font-semibold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-55 ${
                              suggestion.hasVoted ? 'bg-primary text-white shadow-primary/20' : 'bg-white text-primary shadow-slate-950/8'
                            }`}
                          >
                            {activeVoteId === suggestion.id ? 'Saving...' : suggestion.hasVoted ? 'Voted' : 'Vote'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default AIExplorer;
