import { env } from '../config/env.js';

export type GeneratedTripSuggestion = {
  name: string;
  whyVisit: string;
  estimatedCostPerPerson: number;
  vibeMatchPercent: number;
  imageUrl: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const normalizeSuggestionText = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalizedValue = value.trim().replace(/\s+/g, ' ');
  return normalizedValue || fallback;
};

const normalizeSuggestionCost = (value: unknown): number => {
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }

  return Number(numericValue.toFixed(2));
};

const normalizeVibeMatchPercent = (value: unknown): number => {
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)));
};

const buildFallbackUnsplashUrl = (placeName: string, destination: string): string => {
  const query = encodeURIComponent(`${placeName} ${destination}`);
  return `https://source.unsplash.com/featured/800x600/?${query}`;
};

const normalizeSuggestionImageUrl = (value: unknown, placeName: string, destination: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    return buildFallbackUnsplashUrl(placeName, destination);
  }

  try {
    const url = new URL(value.trim());
    if (!/unsplash\.com$/i.test(url.hostname) && !/images\.unsplash\.com$/i.test(url.hostname) && !/source\.unsplash\.com$/i.test(url.hostname)) {
      return buildFallbackUnsplashUrl(placeName, destination);
    }

    if (/images\.unsplash\.com$/i.test(url.hostname)) {
      url.searchParams.set('w', '400');
      url.searchParams.set('q', '60');
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'crop');
      return url.toString();
    }

    if (/source\.unsplash\.com$/i.test(url.hostname)) {
      return url.toString();
    }

    url.searchParams.set('w', '400');
    url.searchParams.set('q', '60');
    return url.toString();
  } catch {
    return buildFallbackUnsplashUrl(placeName, destination);
  }
};

const sanitizeGeneratedSuggestions = (value: unknown, destination: string): GeneratedTripSuggestion[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const suggestion = item as {
        name?: unknown;
        reason?: unknown;
        estimated_cost?: unknown;
        vibe_match?: unknown;
        image_url?: unknown;
      };

      const name = normalizeSuggestionText(suggestion.name, `Suggested stop ${index + 1}`);
      return {
        name,
        whyVisit: normalizeSuggestionText(
          suggestion.reason,
          'A recommended stop that fits the group travel vibe and current destination.',
        ),
        estimatedCostPerPerson: normalizeSuggestionCost(suggestion.estimated_cost),
        vibeMatchPercent: normalizeVibeMatchPercent(suggestion.vibe_match),
        imageUrl: normalizeSuggestionImageUrl(suggestion.image_url, name, destination),
      };
    })
    .filter((suggestion) => suggestion.name.length > 0)
    .slice(0, 5);
};

const buildPrompt = (
  destination: string,
  travelerType: string,
  preferences: {
    collectiveMood: string;
    interest: string;
    budget: string;
    food: string;
    crowds: string;
  },
): string =>
  [
    `You are a local guide in ${destination}.`,
    `The group type is ${travelerType}.`,
    `Based on these 5 specific group preferences: collective mood = ${preferences.collectiveMood}; interest = ${preferences.interest}; budget = ${preferences.budget}; food = ${preferences.food}; crowds = ${preferences.crowds}.`,
    `Suggest exactly 5 specific locations to visit in ${destination}.`,
    'Keep every suggestion practical, distinct, and believable for a real day plan.',
    'Return valid JSON only.',
    'Each item must include:',
    '1. name',
    '2. reason: exactly 1 sentence',
    '3. estimated_cost: cost per person in USD as a realistic number',
    '4. vibe_match: percentage from 0 to 100 showing how well the place fits the requested preferences',
    '5. image_url: a small, fast-loading Unsplash image URL optimized for mobile using parameters like w=400 and q=60',
  ].join('\n');

export const generateTripSuggestions = async (input: {
  destination: string;
  travelerType: string;
  collectiveMood: string;
  interest: string;
  budget: string;
  food: string;
  crowds: string;
}): Promise<GeneratedTripSuggestion[]> => {
  const apiKey = env.geminiApiKey.trim();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const model = env.geminiModel.trim() || DEFAULT_GEMINI_MODEL;
  const response = await fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildPrompt(input.destination, input.travelerType, {
                collectiveMood: input.collectiveMood,
                interest: input.interest,
                budget: input.budget,
                food: input.food,
                crowds: input.crowds,
              }),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'array',
          minItems: 5,
          maxItems: 5,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'reason', 'estimated_cost', 'vibe_match', 'image_url'],
            properties: {
              name: {
                type: 'string',
                description: 'The name of the location or activity stop.',
              },
              reason: {
                type: 'string',
                description: 'One sentence explaining why this group should visit.',
              },
              estimated_cost: {
                type: 'number',
                description: 'Estimated cost per person in USD.',
              },
              vibe_match: {
                type: 'number',
                description: 'Percentage match from 0 to 100 for the requested preferences.',
              },
              image_url: {
                type: 'string',
                description: 'A mobile-optimized Unsplash image URL for the location.',
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Gemini could not generate suggestions right now.');
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const responseText =
    payload.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim() ?? '';

  if (!responseText) {
    throw new Error('Gemini returned an empty suggestions response.');
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(responseText);
  } catch {
    throw new Error('Gemini returned suggestions in an unexpected format.');
  }

  const suggestions = sanitizeGeneratedSuggestions(parsedValue, input.destination);
  if (suggestions.length !== 5) {
    throw new Error('Gemini did not return the required 5 suggestions.');
  }

  return suggestions;
};
