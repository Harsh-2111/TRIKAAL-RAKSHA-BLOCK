export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export async function chatWithAssistant(userMessage: string, chatHistory: ChatMessage[]): Promise<string> {
  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userMessage, history: chatHistory }),
  });
  if (!response.ok) throw new Error(`Gemini API returned ${response.status}`);
  const payload = await response.json() as { reply?: string };
  return payload.reply || 'No response was returned by the Co-Pilot.';
}
