import { GoogleGenAI } from '@google/genai';

type ChatMessage = { role: 'user' | 'assistant'; text: string };
type ChatContext = {
  activeRequisitions?: unknown[];
  defectsData?: unknown[];
  trainMasterSummary?: unknown;
};

const toContextText = (value: unknown, maxLength = 12000): string => {
  try {
    return JSON.stringify(value ?? []).slice(0, maxLength);
  } catch {
    return '[]';
  }
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: 'Gemini service is not configured' }, { status: 503 });

  try {
    const body = await request.json() as { message?: string; history?: ChatMessage[]; context?: ChatContext };
    const message = body.message?.trim();
    if (!message || message.length > 2000) return Response.json({ error: 'Message must be 1-2000 characters' }, { status: 400 });
    const history = (body.history || []).slice(-10).map((item) => ({
      role: item.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: item.text.slice(0, 4000) }],
    }));
    const context = body.context || {};
    const systemInstruction = `You are the Gemini Co-Pilot for TRIKAAL-RAKSHA-BLOCK (Indian Railways Section Controller Assistant).

CURRENT LIVE BOARD CONTEXT:
- Active Requisitions: ${toContextText(context.activeRequisitions)}
- Defect & ML Risk Data: ${toContextText(context.defectsData)}
- Train Timetable Summary: ${toContextText(context.trainMasterSummary)}

Answer questions in a concise, authoritative railway controller tone using this real-time data. Treat every recommendation as decision support, never as authority to occupy a line or approve a block.`;
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: { systemInstruction, temperature: 0.2 },
    });
    return Response.json({ reply: result.text?.trim() || 'No response was returned.' });
  } catch (error) {
    console.error('Gemini chat request failed', error);
    return Response.json({ error: 'Gemini request failed' }, { status: 502 });
  }
}
