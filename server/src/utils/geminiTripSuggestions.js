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
    {
        nameSuffix: 'Museum And Heritage Stop',
        keyword: 'museum heritage landmark galleries cultural district',
        baseCost: 18,
        vibe: 87,
        buildReason: (input) => `This leans into ${input.interest.toLowerCase()} with a structured cultural stop that still fits the group's ${input.budget.toLowerCase()} spending style.`,
    },
    {
        nameSuffix: 'Waterfront Or Nature Trail',
        keyword: 'waterfront nature trail scenic park outdoors',
        baseCost: 8,
        vibe: 90,
        buildReason: (input) => `It matches ${input.interest.toLowerCase()} and gives the group a ${input.collectiveMood.toLowerCase()} outdoor reset without making the day expensive.`,
    },
    {
        nameSuffix: 'Market And Boutique Loop',
        keyword: 'local market boutiques shopping neighborhood',
        baseCost: 22,
        vibe: 88,
        buildReason: (input) => `This works for ${input.interest.toLowerCase()} travelers and keeps food flexible for a ${input.food.toLowerCase()} stop along the way.`,
    },
    {
        nameSuffix: 'Lively Food Hall',
        keyword: 'food hall night market street food live music',
        baseCost: 28,
        vibe: 92,
        buildReason: (input) => `It suits a ${input.collectiveMood.toLowerCase()} group that wants ${input.food.toLowerCase()} and a more social, easy-to-coordinate stop.`,
    },
    {
        nameSuffix: 'Rooftop Or Tasting Experience',
        keyword: 'fine dining rooftop tasting menu scenic restaurant',
        baseCost: 68,
        vibe: 85,
        buildReason: (input) => `This is a stronger fit for ${input.food.toLowerCase()} and ${input.budget.toLowerCase()} plans where the group wants one polished shared highlight.`,
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
const FALLBACK_UNSPLASH_PHOTO_URLS = [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
    'https://images.unsplash.com/photo-1526772662000-3f88f10405ff',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
    'https://images.unsplash.com/photo-1488085061387-422e29b40080',
    'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1',
];
const getStableImageIndex = (value) => {
    const hash = Array.from(value).reduce((currentHash, character) => {
        return (currentHash * 31 + character.charCodeAt(0)) % FALLBACK_UNSPLASH_PHOTO_URLS.length;
    }, 0);
    return Math.abs(hash);
};
const optimizeUnsplashImageUrl = (value) => {
    const url = new URL(value);
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', 'crop');
    url.searchParams.set('w', '800');
    url.searchParams.set('q', '75');
    return url.toString();
};
const buildFallbackUnsplashUrl = (placeName, destination) => {
    const fallbackUrl = FALLBACK_UNSPLASH_PHOTO_URLS[getStableImageIndex(`${placeName} ${destination}`)];
    return optimizeUnsplashImageUrl(fallbackUrl);
};
const normalizeSuggestionImageUrl = (value, placeName, destination) => {
    if (typeof value !== 'string' || !value.trim()) {
        return buildFallbackUnsplashUrl(placeName, destination);
    }
    try {
        const url = new URL(value.trim());
        if (!/^(images|plus)\.unsplash\.com$/i.test(url.hostname)) {
            return buildFallbackUnsplashUrl(placeName, destination);
        }
        return optimizeUnsplashImageUrl(url.toString());
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
const scoreSuggestionForPreferences = (searchableText, baseCost, input) => {
    const text = normalizeDestinationLookup(searchableText);
    const collectiveMood = normalizeDestinationLookup(input.collectiveMood);
    const interest = normalizeDestinationLookup(input.interest);
    const budget = normalizeDestinationLookup(input.budget);
    const food = normalizeDestinationLookup(input.food);
    const crowds = normalizeDestinationLookup(input.crowds);
    let score = 0;
    if (/peace|zen|calm|quiet|relax/.test(collectiveMood)) {
        score += /(garden|quiet|park|island|temple|rice|old|walk|viewpoint|waterfront|trail|scenic)/.test(text) ? 3 : 0;
    }
    if (/high|energy|disco|lively|social/.test(collectiveMood)) {
        score += /(market|night|music|food|hall|district|beach|tower|rooftop|crawl)/.test(text) ? 3 : 0;
    }
    if (/art|culture/.test(interest)) {
        score += /(art|arts|culture|cultural|historic|heritage|museum|gallery|temple|palace|old|architecture|district)/.test(text)
            ? 4
            : 0;
    }
    if (/nature|outdoor/.test(interest)) {
        score += /(nature|outdoor|park|garden|island|beach|rice|viewpoint|waterfront|trail|cliff|scenic)/.test(text) ? 4 : 0;
    }
    if (/shopping|market/.test(interest)) {
        score += /(market|shopping|boutique|local|arts|district|crawl)/.test(text) ? 4 : 0;
    }
    if (/coffee|cafe/.test(food)) {
        score += /(coffee|cafe|cafes|market|food|boutique|district)/.test(text) ? 3 : 0;
    }
    if (/fine|dining/.test(food)) {
        score += /(fine|dining|restaurant|tasting|rooftop|palace|tower)/.test(text) ? 3 : 0;
    }
    if (/street|food/.test(food)) {
        score += /(street|food|market|hall|crawl|snack)/.test(text) ? 3 : 0;
    }
    if (/budget|friendly|cheap/.test(budget)) {
        score += baseCost <= 20 ? 3 : 0;
    }
    else if (/luxury|splurge/.test(budget)) {
        score += baseCost >= 35 || /(fine|rooftop|tasting|tower|palace)/.test(text) ? 3 : 0;
    }
    else if (/balanced/.test(budget)) {
        score += baseCost >= 8 && baseCost <= 35 ? 3 : 0;
    }
    if (/hidden|quiet/.test(crowds)) {
        score += /(hidden|quiet|garden|park|island|trail|rice|temple|old|waterfront)/.test(text) ? 2 : 0;
    }
    if (/busy|bustling/.test(crowds)) {
        score += /(busy|market|hall|district|beach|tower|palace|crawl|night)/.test(text) ? 2 : 0;
    }
    return score;
};
const createFallbackSuggestions = (input) => {
    const budgetMultiplier = getBudgetMultiplier(input.budget);
    const curatedDestinationFallback = findCuratedDestinationFallback(input.destination);
    if (curatedDestinationFallback) {
        return curatedDestinationFallback.suggestions
            .map((suggestion, index) => ({
            suggestion,
            index,
            score: scoreSuggestionForPreferences(`${suggestion.name} ${suggestion.imageKeyword}`, suggestion.baseCost, input),
        }))
            .sort((left, right) => right.score - left.score || left.index - right.index)
            .map(({ suggestion, score }) => ({
            name: suggestion.name,
            whyVisit: suggestion.buildReason(input),
            estimatedCostPerPerson: Number((suggestion.baseCost * budgetMultiplier).toFixed(2)),
            vibeMatchPercent: Math.max(0, Math.min(100, suggestion.vibe + Math.min(score, 6))),
            imageUrl: buildFallbackUnsplashUrl(suggestion.imageKeyword, input.destination),
        }));
    }
    return FALLBACK_SUGGESTION_BLUEPRINTS.map((blueprint, index) => ({
        blueprint,
        index,
        score: scoreSuggestionForPreferences(`${blueprint.nameSuffix} ${blueprint.keyword}`, blueprint.baseCost, input),
    }))
        .sort((left, right) => right.score - left.score || left.index - right.index)
        .slice(0, 5)
        .map(({ blueprint, score }) => {
        const name = `${input.destination} ${blueprint.nameSuffix}`;
        const estimatedCostPerPerson = Number((blueprint.baseCost * budgetMultiplier).toFixed(2));
        return {
            name,
            whyVisit: blueprint.buildReason(input),
            estimatedCostPerPerson,
            vibeMatchPercent: Math.max(0, Math.min(100, blueprint.vibe + Math.min(score, 6))),
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
const buildPreferenceGuidance = (preferences) => {
    const collectiveMood = normalizeDestinationLookup(preferences.collectiveMood);
    const interest = normalizeDestinationLookup(preferences.interest);
    const budget = normalizeDestinationLookup(preferences.budget);
    const food = normalizeDestinationLookup(preferences.food);
    const crowds = normalizeDestinationLookup(preferences.crowds);
    const moodGuidance = /peace|zen|calm|quiet|relax/.test(collectiveMood)
        ? 'prioritize calm, scenic, slower-paced places where a group can talk and decompress'
        : 'prioritize lively, social, high-energy places with activity, music, nightlife, markets, or a strong crowd buzz';
    const interestGuidance = /nature|outdoor/.test(interest)
        ? 'prioritize outdoor scenery, parks, beaches, viewpoints, gardens, walks, or nature-forward stops'
        : /shopping|market/.test(interest)
            ? 'prioritize local markets, boutiques, shopping streets, makers, and browsing-friendly neighborhoods'
            : 'prioritize arts, culture, museums, galleries, architecture, heritage, temples, landmarks, or performances';
    const budgetGuidance = /budget|friendly|cheap/.test(budget)
        ? 'keep costs low, favor free or inexpensive stops, and avoid premium experiences unless they are unusually good value'
        : /luxury|splurge/.test(budget)
            ? 'include polished premium experiences, reservation-worthy stops, rooftop/scenic experiences, or higher-end cultural options'
            : 'balance cost and value, avoiding both bare-minimum and overly expensive recommendations';
    const foodGuidance = /fine|dining/.test(food)
        ? 'include at least one food-forward idea that fits fine dining, tasting menus, or elevated local cuisine'
        : /street|food/.test(food)
            ? 'include at least one food-forward idea with street food, food halls, markets, or casual local bites'
            : 'include at least one coffee, cafe, bakery, or relaxed refreshment-friendly stop when it fits the destination';
    const crowdGuidance = /hidden|quiet/.test(crowds)
        ? 'avoid the most crowded tourist-default stops unless you name a quieter area, time, or nearby alternative'
        : 'favor popular, active, people-filled areas where the group will feel the destination energy';
    return [
        `Collective mood "${preferences.collectiveMood}": ${moodGuidance}.`,
        `Interest "${preferences.interest}": ${interestGuidance}.`,
        `Budget "${preferences.budget}": ${budgetGuidance}.`,
        `Food preference "${preferences.food}": ${foodGuidance}.`,
        `Crowd preference "${preferences.crowds}": ${crowdGuidance}.`,
    ].join('\n');
};
const buildPrompt = (destination, travelerType, preferences) => [
    `You are a local guide in ${destination}.`,
    `The group type is ${travelerType}.`,
    'The five questionnaire answers below are required ranking constraints, not optional background context.',
    buildPreferenceGuidance(preferences),
    `Suggest exactly 5 specific locations to visit in ${destination}.`,
    'Every suggestion must fit the destination and strongly match at least 3 of the 5 questionnaire answers.',
    'Do not return a generic destination top-5 list. If a famous attraction does not match the answers, skip it.',
    'The reason must explicitly mention the preference match in natural wording, such as the mood, interest, budget, food, or crowd fit.',
    'Use real, named places or districts in the destination, not placeholder labels.',
    'Do not invent locations and do not use generic names like Old Town Walk, Arts District Stop, or Sunset Viewpoint.',
    'Keep every suggestion practical, distinct, and believable for a real day plan.',
    'Return valid JSON only.',
    'Each item must include:',
    '1. name',
    '2. reason: exactly 1 sentence',
    '3. estimated_cost: cost per person in USD as a realistic number',
    '4. vibe_match: percentage from 0 to 100 showing how well the place fits all 5 requested preferences',
    '5. image_url: a direct images.unsplash.com or plus.unsplash.com image URL optimized for mobile using parameters like w=800 and q=75',
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
