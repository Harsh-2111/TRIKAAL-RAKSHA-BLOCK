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
  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userMessage, history: chatHistory, context }),
  });
  const payload = await response.json().catch(() => ({})) as { reply?: string; error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Gemini API returned ${response.status}`);
  }
  if (!payload.reply) throw new Error('Gemini returned an empty response.');
  return payload.reply;
}
