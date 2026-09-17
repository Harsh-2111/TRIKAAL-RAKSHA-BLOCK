export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface GeminiChatContext {
  activeRequisitions: unknown[];
  defectsData: unknown[];
  trainMasterSummary: unknown;
}

export async function chatWithAssistant(
  userMessage: string,
  chatHistory: ChatMessage[],
  context: GeminiChatContext,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage, history: chatHistory, context }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({})) as { reply?: string; error?: string };
    if (!response.ok) {
      throw new Error(payload.error || `Gemini API returned ${response.status}`);
    }
    if (!payload.reply) throw new Error('Gemini returned an empty response.');
    return payload.reply;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Gemini timed out after 15 seconds. Check the server key and deployment logs.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
