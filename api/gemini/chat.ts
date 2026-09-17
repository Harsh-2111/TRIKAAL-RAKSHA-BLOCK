import type { IncomingMessage, ServerResponse } from 'node:http';

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

const operationalFallback = (message: string, context: ChatContext): string => {
  const requisitions = context.activeRequisitions || [];
  const timetable = context.trainMasterSummary || {};
  const trainCount = Array.isArray((timetable as { trains?: unknown[] }).trains)
    ? (timetable as { trains: unknown[] }).trains.length
    : 0;
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('train') || lowerMessage.includes('risk') || lowerMessage.includes('delay')) {
    return `Live operations summary: ${requisitions.length} active requisitions and ${trainCount} timetable train records are loaded. Review the affected-train panel on the relevant block row for section-specific movements, regulation time, and capacity margin. Gemini is temporarily unavailable, so this response is based only on the loaded control-board data.`;
  }
  return `The live control board has ${requisitions.length} active requisitions loaded. Gemini is temporarily unavailable, so continue with the section conflict, timetable, and safety-envelope checks shown in the dashboard. No block authority is granted by this assistant.`;
};

const sendJson = (response: ServerResponse, statusCode: number, payload: Record<string, unknown>): void => {
  const body = JSON.stringify(payload);
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.end(body);
};

const readBody = (request: IncomingMessage): Promise<string> => new Promise((resolve, reject) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) reject(new Error('Request body is too large.'));
  });
  request.on('end', () => resolve(body));
  request.on('error', reject);
});

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.end();
    return;
  }
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, { error: 'Gemini service is not configured' });
    return;
  }

  try {
    const body = JSON.parse(await readBody(request)) as { message?: string; history?: ChatMessage[]; context?: ChatContext };
    const message = body.message?.trim();
    if (!message || message.length > 2000) {
      sendJson(response, 400, { error: 'Message must be 1-2000 characters' });
      return;
    }
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
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [...history, { role: 'user', parts: [{ text: message }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
        }),
      },
    );
    clearTimeout(timeoutId);
    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text();
      console.error('Gemini REST API error', geminiResponse.status, detail);
      sendJson(response, 200, { reply: operationalFallback(message, context), degraded: true });
      return;
    }
    const result = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const reply = result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!reply) {
      sendJson(response, 200, { reply: operationalFallback(message, context), degraded: true });
      return;
    }
    sendJson(response, 200, { reply });
  } catch (error) {
    console.error('Gemini chat request failed', error);
    sendJson(response, 200, {
      reply: operationalFallback('', {}),
      degraded: true,
    });
  }
}
