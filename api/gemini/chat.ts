import { GoogleGenAI } from '@google/genai';

const SYSTEM_PROMPT = `You are RAKSHA-AI, an expert Indian Railways Section Controller assistant.
Use concise operational language. Prioritize safety, timetable protection, section capacity, and authorized approval.
Treat every recommendation as decision support, never as authority to occupy a line or approve a block.`;

type ChatMessage = { role: 'user' | 'assistant'; text: string };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: 'Gemini service is not configured' }, { status: 503 });

  try {
    const body = await request.json() as { message?: string; history?: ChatMessage[] };
    const message = body.message?.trim();
    if (!message || message.length > 2000) return Response.json({ error: 'Message must be 1-2000 characters' }, { status: 400 });
    const history = (body.history || []).slice(-10).map((item) => ({
      role: item.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: item.text.slice(0, 4000) }],
    }));
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.2 },
    });
    return Response.json({ reply: result.text?.trim() || 'No response was returned.' });
  } catch (error) {
    console.error('Gemini chat request failed', error);
    return Response.json({ error: 'Gemini request failed' }, { status: 502 });
  }
}
