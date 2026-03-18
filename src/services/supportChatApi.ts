const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

export type SupportChatHistoryItem = {
  role: 'user' | 'assistant';
  text: string;
};

type SupportChatResponse = {
  reply: string;
  provider: 'openai' | 'fallback';
};

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string };
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    return 'Request failed.';
  }

  return 'Request failed.';
};

export const askSupportAssistant = async (
  message: string,
  history: SupportChatHistoryItem[],
): Promise<SupportChatResponse> => {
  let response: Response;

  try {
    response = await fetch(buildUrl('/api/chat/support'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
      }),
    });
  } catch {
    throw new Error('Unable to connect to support chat right now.');
  }

  if (!response.ok) {
    const messageText = await parseErrorMessage(response);
    throw new Error(messageText);
  }

  return (await response.json()) as SupportChatResponse;
};
