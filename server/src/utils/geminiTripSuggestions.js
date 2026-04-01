import { env } from '../config/env.js';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const FALLBACK_SUGGESTION_BLUEPRINTS = [
    {
        nameSuffix: 'Old Town Walk',
        keyword: 'old town architecture walking tour',
        baseCost: 0,
        vibe: 88,
        buildReason: (input) => `A relaxed introduction to ${input.destination} that matches a ${input.collectiveMood.toLowerCase()} group vibe and keeps the day easy to coordinate.`,
    },
    {
        nameSuffix: 'Arts District Stop',
        keyword: 'arts district galleries murals',
        baseCost: 18,
        vibe: 84,
        buildReason: (input) => `This stop leans into ${input.interest.toLowerCase()} while giving the group something visual, social, and easy to enjoy together.`,
    },
    {
        nameSuffix: 'Local Food Crawl',
        keyword: 'food market cafes street food',
        baseCost: 24,
        vibe: 91,
        buildReason: (input) => `It fits the group's ${input.food.toLowerCase()} preference and creates a flexible meal stop that still feels memorable.`,
    },
    {
        nameSuffix: 'Garden And Quiet Corners',
        keyword: 'botanical garden quiet park hidden gem',
        baseCost: 12,
        vibe: 86,
        buildReason: (input) => `A quieter change of pace that works well for groups asking for ${input.crowds.toLowerCase()} experiences without losing the local feel.`,
    },
    {
        nameSuffix: 'Sunset Viewpoint',
        keyword: 'sunset viewpoint skyline waterfront',
        baseCost: 10,
        vibe: 89,
        buildReason: (input) => `It gives the group a simple shared highlight near the end of the day and keeps the plan practical for mixed travel styles.`,
    },
];
const normalizeSuggestionText = (value, fallback) => {
    if (typeof value !== 'string') {
        return fallback;
    }
    const normalizedValue = value.trim().replace(/\s+/g, ' ');
    return normalizedValue || fallback;
};
const normalizeSuggestionCost = (value) => {
    const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return 0;
    }
    return Number(numericValue.toFixed(2));
};
const normalizeVibeMatchPercent = (value) => {
    const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return 0;
    }
    return Math.max(0, Math.min(100, Math.round(numericValue)));
};
const buildFallbackUnsplashUrl = (placeName, destination) => {
    const query = encodeURIComponent(`${placeName} ${destination}`);
    return `https://source.unsplash.com/featured/800x600/?${query}`;
};
const normalizeSuggestionImageUrl = (value, placeName, destination) => {
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
    }
    catch {
        return buildFallbackUnsplashUrl(placeName, destination);
    }
};
const sanitizeGeneratedSuggestions = (value, destination) => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((item, index) => {
        const suggestion = item;
        const name = normalizeSuggestionText(suggestion.name, `Suggested stop ${index + 1}`);
        return {
            name,
            whyVisit: normalizeSuggestionText(suggestion.reason, 'A recommended stop that fits the group travel vibe and current destination.'),
            estimatedCostPerPerson: normalizeSuggestionCost(suggestion.estimated_cost),
            vibeMatchPercent: normalizeVibeMatchPercent(suggestion.vibe_match),
            imageUrl: normalizeSuggestionImageUrl(suggestion.image_url, name, destination),
        };
    })
        .filter((suggestion) => suggestion.name.length > 0)
        .slice(0, 5);
};
const normalizeBudgetLabel = (value) => value.trim().toLowerCase();
const getBudgetMultiplier = (budget) => {
    const normalizedBudget = normalizeBudgetLabel(budget);
    if (/(budget|cheap|low|save)/.test(normalizedBudget)) {
        return 0.7;
    }
    if (/(luxury|premium|high|splurge)/.test(normalizedBudget)) {
        return 1.45;
    }
    return 1;
};
const createFallbackSuggestions = (input) => {
    const budgetMultiplier = getBudgetMultiplier(input.budget);
    return FALLBACK_SUGGESTION_BLUEPRINTS.map((blueprint, index) => {
        const name = `${input.destination} ${blueprint.nameSuffix}`;
        const estimatedCostPerPerson = Number((blueprint.baseCost * budgetMultiplier).toFixed(2));
        return {
            name,
            whyVisit: blueprint.buildReason(input),
            estimatedCostPerPerson,
            vibeMatchPercent: Math.max(0, Math.min(100, blueprint.vibe + index)),
            imageUrl: buildFallbackUnsplashUrl(`${input.destination} ${blueprint.keyword}`, input.destination),
        };
    });
};
const parseGeminiApiError = async (response) => {
    const errorText = await response.text();
    const error = new Error(errorText || 'Gemini could not generate suggestions right now.');
    error.statusCode = response.status;
    return error;
};
const isFallbackWorthyGeminiError = (error) => {
    if (!(error instanceof Error)) {
        return false;
    }
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : null;
    const normalizedMessage = error.message.toLowerCase();
    if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
        return true;
    }
    return (normalizedMessage.includes('api key') ||
        normalizedMessage.includes('permission_denied') ||
        normalizedMessage.includes('reported as leaked') ||
        normalizedMessage.includes('quota') ||
        normalizedMessage.includes('unexpected format') ||
        normalizedMessage.includes('empty suggestions response') ||
        normalizedMessage.includes('required 5 suggestions') ||
        normalizedMessage.includes('fetch failed'));
};
const buildPrompt = (destination, travelerType, preferences) => [
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
export const generateTripSuggestions = async (input) => {
    const apiKey = env.geminiApiKey.trim();
    if (!apiKey) {
        console.warn('Gemini API key is not configured. Using local fallback trip suggestions.');
        return createFallbackSuggestions(input);
    }
    try {
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
            throw await parseGeminiApiError(response);
        }
        const payload = (await response.json());
        const responseText = payload.candidates
            ?.flatMap((candidate) => candidate.content?.parts ?? [])
            .map((part) => (typeof part.text === 'string' ? part.text : ''))
            .join('')
            .trim() ?? '';
        if (!responseText) {
            throw new Error('Gemini returned an empty suggestions response.');
        }
        let parsedValue;
        try {
            parsedValue = JSON.parse(responseText);
        }
        catch {
            throw new Error('Gemini returned suggestions in an unexpected format.');
        }
        const suggestions = sanitizeGeneratedSuggestions(parsedValue, input.destination);
        if (suggestions.length !== 5) {
            throw new Error('Gemini did not return the required 5 suggestions.');
        }
        return suggestions;
    }
    catch (error) {
        if (isFallbackWorthyGeminiError(error)) {
            const message = error instanceof Error ? error.message : 'Unknown Gemini error.';
            console.warn(`Gemini trip suggestions unavailable. Using local fallback suggestions instead. ${message}`);
            return createFallbackSuggestions(input);
        }
        throw error;
    }
};
