import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { verifyTripAccess } from '../middleware/verifyTripAccess.js';

const router = express.Router();
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_ITEMS = 10;
const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const SUPPORT_SYSTEM_PROMPT = `You are SplitNGo Support AI.
You help travelers and hosts use the SplitNGo app.
Give practical, short, step-by-step answers.
If the user reports a bug, ask for exact screen name and error text.
If policy or account data is unknown, say so clearly and suggest next support step.
Never claim you performed account actions.`;

type SupportHistoryItem = {
  role: 'user' | 'assistant';
  text: string;
};

const extractTextFromResponsePayload = (payload: unknown): string => {
  const root = payload as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        text?: unknown;
        output_text?: unknown;
      }>;
    }>;
  };

  if (typeof root?.output_text === 'string' && root.output_text.trim()) {
    return root.output_text.trim();
  }

  const output = Array.isArray(root?.output) ? root.output : [];
  const collected: string[] = [];

  output.forEach((item) => {
    const content = Array.isArray(item?.content) ? item.content : [];
    content.forEach((contentItem) => {
      if (typeof contentItem?.text === 'string' && contentItem.text.trim()) {
        collected.push(contentItem.text.trim());
        return;
      }

      if (typeof contentItem?.output_text === 'string' && contentItem.output_text.trim()) {
        collected.push(contentItem.output_text.trim());
      }
    });
  });

  return collected.join('\n').trim();
};

const toFallbackSupportReply = (prompt: string): string => {
  const normalized = prompt.toLowerCase();

  if (normalized.includes('verification') || normalized.includes('verified') || normalized.includes('id')) {
    return 'Open Profile > Verification and upload a clear document image under 5MB. If it fails, share the exact error text and file type.';
  }

  if (normalized.includes('chat') || normalized.includes('whatsapp')) {
    return 'Use the Chat button on a trip card. If WhatsApp does not open, confirm the host phone number is available and try again.';
  }

  if (normalized.includes('payment') || normalized.includes('escrow') || normalized.includes('refund')) {
    return 'For escrow or payment issues, include the trip title, amount, and the step where it failed so support can trace it quickly.';
  }

  if (
    normalized.includes('bug') ||
    normalized.includes('issue') ||
    normalized.includes('error') ||
    normalized.includes('problem')
  ) {
    return 'Please share: 1) screen name, 2) exact steps, 3) expected result, 4) actual result, and 5) screenshot if possible.';
  }

  if (normalized.includes('host') || normalized.includes('trip')) {
    return 'To host a trip: sign in, complete Travel DNA + verification, then open Create Trip and submit the itinerary and budget.';
  }

  return 'I can help with trips, verification, payments, or app issues. Tell me your exact question and which screen you are using.';
};

const normalizeHistory = (rawHistory: unknown): SupportHistoryItem[] => {
  if (!Array.isArray(rawHistory)) {
    return [];
  }

  return rawHistory
    .filter((item): item is { role?: unknown; text?: unknown } => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      role: (item.role === 'assistant' ? 'assistant' : 'user') as SupportHistoryItem['role'],
      text: typeof item.text === 'string' ? item.text.trim() : '',
    }))
    .filter((item) => item.text.length > 0)
    .slice(-MAX_HISTORY_ITEMS);
};

const askOpenAI = async (
  message: string,
  history: SupportHistoryItem[],
  apiKey: string,
  model: string,
): Promise<string> => {
  const input = [
    { role: 'system', content: SUPPORT_SYSTEM_PROMPT },
    ...history.map((entry) => ({
      role: entry.role,
      content: entry.text,
    })),
    { role: 'user', content: message },
  ];

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input,
      temperature: 0.3,
      max_output_tokens: 260,
    }),
  });

  if (!response.ok) {
    let reason = 'Support AI request failed.';

    try {
      const errorPayload = (await response.json()) as {
        error?: {
          message?: string;
        };
      };
      const errorMessage = errorPayload?.error?.message;
      if (typeof errorMessage === 'string' && errorMessage.trim()) {
        reason = errorMessage.trim();
      }
    } catch {
      // Keep default error reason.
    }

    throw new Error(reason);
  }

  const payload = (await response.json()) as unknown;
  const reply = extractTextFromResponsePayload(payload);
  if (!reply) {
    throw new Error('Support AI returned an empty response.');
  }

  return reply;
};

// Example protected route showing trip-level access control for chat features.
router.get('/:tripId/access', requireAuth, verifyTripAccess, async (_req, res) => {
  return res.status(200).json({ message: 'Trip chat access granted.' });
});

router.post('/support', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    return res.status(400).json({ message: 'Message is required.' });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      message: `Message is too long. Max ${MAX_MESSAGE_LENGTH} characters.`,
    });
  }

  const history = normalizeHistory(req.body?.history);
  const openAiApiKey = typeof process.env.OPENAI_API_KEY === 'string' ? process.env.OPENAI_API_KEY.trim() : '';
  const model =
    typeof process.env.OPENAI_SUPPORT_MODEL === 'string' && process.env.OPENAI_SUPPORT_MODEL.trim()
      ? process.env.OPENAI_SUPPORT_MODEL.trim()
      : 'gpt-4.1-mini';

  if (!openAiApiKey) {
    return res.status(200).json({
      reply: toFallbackSupportReply(message),
      provider: 'fallback',
    });
  }

  try {
    const aiReply = await askOpenAI(message, history, openAiApiKey, model);
    return res.status(200).json({
      reply: aiReply,
      provider: 'openai',
    });
  } catch (error) {
    console.error('Support chat route failed', error);
    return res.status(200).json({
      reply: toFallbackSupportReply(message),
      provider: 'fallback',
    });
  }
});

export default router;
