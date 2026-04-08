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
const CURATED_DESTINATION_FALLBACKS = [
    {
        aliases: ['toronto', 'toronto canada'],
        suggestions: [
            {
                name: 'Distillery Historic District',
                imageKeyword: 'distillery historic district toronto',
                baseCost: 0,
                vibe: 92,
                buildReason: (input) => `This Toronto favorite matches a ${input.collectiveMood.toLowerCase()} mood with cobblestone lanes, galleries, cafes, and an easy group walking pace.`,
            },
            {
                name: 'CN Tower and Ripley\'s Aquarium',
                imageKeyword: 'cn tower ripley aquarium toronto',
                baseCost: 42,
                vibe: 88,
                buildReason: (input) => `It gives the group a high-impact Toronto landmark stop with skyline views and a crowd-pleasing indoor experience that works well for ${input.interest.toLowerCase()} energy.`,
            },
            {
                name: 'Kensington Market',
                imageKeyword: 'kensington market toronto',
                baseCost: 18,
                vibe: 91,
                buildReason: (input) => `Kensington fits a ${input.food.toLowerCase()} plan with casual local eats, vintage corners, and a social street atmosphere that still feels flexible.`,
            },
            {
                name: 'Toronto Islands',
                imageKeyword: 'toronto islands waterfront',
                baseCost: 14,
                vibe: 89,
                buildReason: (input) => `The islands are ideal when the group wants ${input.crowds.toLowerCase()} moments, open waterfront views, and a softer break from downtown.`,
            },
            {
                name: 'St. Lawrence Market',
                imageKeyword: 'st lawrence market toronto',
                baseCost: 20,
                vibe: 87,
                buildReason: (_input) => 'This is one of the easiest Toronto stops for sharing local snacks, picking up quick bites, and keeping the day practical for a group.',
            },
        ],
    },
    {
        aliases: ['bali', 'ubud', 'seminyak', 'canggu', 'uluwatu'],
        suggestions: [
            {
                name: 'Tegallalang Rice Terrace',
                imageKeyword: 'tegallalang rice terrace bali',
                baseCost: 10,
                vibe: 91,
                buildReason: (input) => `This is a strong Bali opener for a ${input.collectiveMood.toLowerCase()} group, with iconic scenery, photo moments, and an easy half-day rhythm.`,
            },
            {
                name: 'Uluwatu Temple',
                imageKeyword: 'uluwatu temple bali',
                baseCost: 16,
                vibe: 90,
                buildReason: (input) => `Uluwatu blends cliff views and Balinese culture in a way that fits ${input.interest.toLowerCase()} travelers without feeling overly rushed.`,
            },
            {
                name: 'Ubud Art Market and Palace Walk',
                imageKeyword: 'ubud art market bali',
                baseCost: 18,
                vibe: 88,
                buildReason: (input) => `This stop works well for groups who want shopping, local design, and a central Bali base that still feels authentic and easy to explore together.`,
            },
            {
                name: 'Batu Bolong Beach, Canggu',
                imageKeyword: 'batu bolong beach canggu bali',
                baseCost: 12,
                vibe: 89,
                buildReason: (input) => `Canggu gives the group a casual Bali social scene with sunset energy, cafe access, and enough space to match a ${input.crowds.toLowerCase()} preference.`,
            },
            {
                name: 'Tirta Empul Temple',
                imageKeyword: 'tirta empul temple bali',
                baseCost: 15,
                vibe: 87,
                buildReason: (_input) => 'It adds a meaningful cultural stop to the Bali plan and feels memorable without requiring a complicated full-day schedule.',
            },
        ],
    },
    {
        aliases: ['thailand', 'bangkok', 'chiang mai', 'phuket', 'krabi'],
        suggestions: [
            {
                name: 'Wat Arun, Bangkok',
                imageKeyword: 'wat arun bangkok thailand',
                baseCost: 6,
                vibe: 90,
                buildReason: (input) => `Wat Arun is a beautiful Thailand pick for groups who want culture, river views, and a ${input.collectiveMood.toLowerCase()} pace that still feels iconic.`,
            },
            {
                name: 'The Grand Palace, Bangkok',
                imageKeyword: 'grand palace bangkok thailand',
                baseCost: 15,
                vibe: 88,
                buildReason: (input) => `This stop delivers one of Thailand's strongest landmark experiences and fits ${input.interest.toLowerCase()} travelers who want something unmistakably local.`,
            },
            {
                name: 'Chatuchak Weekend Market',
                imageKeyword: 'chatuchak market bangkok thailand',
                baseCost: 18,
                vibe: 91,
                buildReason: (input) => `Chatuchak is perfect for a ${input.food.toLowerCase()} and market-heavy day, with low-pressure browsing, snacks, and group-friendly variety.`,
            },
            {
                name: 'Chiang Mai Old City Temples',
                imageKeyword: 'chiang mai old city thailand',
                baseCost: 9,
                vibe: 87,
                buildReason: (input) => `Chiang Mai offers a calmer Thailand option for groups looking for ${input.crowds.toLowerCase()} experiences without losing the sense of place.`,
            },
            {
                name: 'Railay Beach Viewpoints, Krabi',
                imageKeyword: 'railay beach krabi thailand',
                baseCost: 24,
                vibe: 89,
                buildReason: (_input) => 'This adds Thailand scenery, beach time, and a memorable visual payoff that feels worth sharing as a group highlight.',
            },
        ],
    },
];
const GENERIC_SUGGESTION_NAME_PATTERNS = [
    /old town walk/i,
    /arts district stop/i,
    /local food crawl/i,
    /garden and quiet corners/i,
    /sunset viewpoint/i,
    /suggested stop/i,
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
const normalizeDestinationLookup = (value) => value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
const findCuratedDestinationFallback = (destination) => {
    const normalizedDestination = normalizeDestinationLookup(destination);
    if (!normalizedDestination) {
        return null;
    }
    return (CURATED_DESTINATION_FALLBACKS.find((entry) => entry.aliases.some((alias) => normalizedDestination.includes(alias) || alias.includes(normalizedDestination))) ?? null);
};
const hasOnlyGenericSuggestionNames = (suggestions) => suggestions.length > 0 &&
    suggestions.every((suggestion) => GENERIC_SUGGESTION_NAME_PATTERNS.some((pattern) => pattern.test(suggestion.name)));
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
    const curatedDestinationFallback = findCuratedDestinationFallback(input.destination);
    if (curatedDestinationFallback) {
        return curatedDestinationFallback.suggestions.map((suggestion) => ({
            name: suggestion.name,
            whyVisit: suggestion.buildReason(input),
            estimatedCostPerPerson: Number((suggestion.baseCost * budgetMultiplier).toFixed(2)),
            vibeMatchPercent: suggestion.vibe,
            imageUrl: buildFallbackUnsplashUrl(suggestion.imageKeyword, input.destination),
        }));
    }
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
    'Use real, named places or districts in the destination, not placeholder labels.',
    'Do not invent locations and do not use generic names like Old Town Walk, Arts District Stop, or Sunset Viewpoint.',
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
        if (hasOnlyGenericSuggestionNames(suggestions)) {
            return createFallbackSuggestions(input);
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
