import type { IncomingMessage, ServerResponse } from 'node:http';

type ChatMessage = { role: 'user' | 'assistant'; text: string };
type ChatContext = {
  activeRequisitions?: unknown[];
  defectsData?: unknown[];
  trainMasterSummary?: unknown;
};
type RequisitionSummary = {
  id: string;
  department: string;
  section: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  priority: string;
  mlRisk: string | number;
};

const sendJson = (response: ServerResponse, statusCode: number, payload: Record<string, unknown>): void => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.end(JSON.stringify(payload));
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

const getRequisitions = (context: ChatContext): RequisitionSummary[] =>
  (Array.isArray(context.activeRequisitions) ? context.activeRequisitions : []).map((item) => {
    const request = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      id: String(request.id || ''),
      department: String(request.department || ''),
      section: String(request.section || ''),
      status: String(request.status || ''),
      date: String(request.date || ''),
      startTime: String(request.startTime || ''),
      endTime: String(request.endTime || ''),
      durationMinutes: Number(request.durationMinutes || 0),
      priority: String(request.priority || ''),
      mlRisk: typeof request.mlRisk === 'number' || typeof request.mlRisk === 'string' ? request.mlRisk : 'not scored',
    };
  });

const buildContextSummary = (context: ChatContext): string => {
  const requisitions = getRequisitions(context);
  const defects = Array.isArray(context.defectsData) ? context.defectsData : [];
  const timetable = context.trainMasterSummary && typeof context.trainMasterSummary === 'object'
    ? context.trainMasterSummary as { trains?: unknown[]; sectionTimetable?: unknown[] }
    : {};
  const trains = Array.isArray(timetable.trains) ? timetable.trains.length : 0;
  const movements = Array.isArray(timetable.sectionTimetable) ? timetable.sectionTimetable.length : 0;
  return [
    `Active requisitions (${requisitions.length}):`,
    ...requisitions.slice(0, 40).map((request) =>
      `ID: ${request.id} | Dept: ${request.department} | Section: ${request.section} | Status: ${request.status} | Date: ${request.date} | Window: ${request.startTime}-${request.endTime} | Duration: ${request.durationMinutes}m | Priority: ${request.priority} | ML Risk: ${request.mlRisk}`),
    `Defect/risk records loaded: ${defects.length}`,
    `Train master records: ${trains}; timetable movements: ${movements}`,
  ].join('\n').slice(0, 12000);
};

const localCopilotReply = (message: string, context: ChatContext): string => {
  const requisitions = getRequisitions(context);
  const lower = message.toLowerCase();
  const matchingRequest = requisitions.find((request) => {
    const tokens = `${request.id} ${request.section}`.toLowerCase().split(/[^a-z0-9-]+/).filter((token) => token.length > 2);
    return tokens.some((token) => lower.includes(token));
  });

  if (matchingRequest) {
    return `Section status: ${matchingRequest.section} (${matchingRequest.id}) is ${matchingRequest.status}. ${matchingRequest.department} has a ${matchingRequest.durationMinutes}-minute window from ${matchingRequest.startTime} to ${matchingRequest.endTime} on ${matchingRequest.date}. Priority: ${matchingRequest.priority}; ML risk: ${matchingRequest.mlRisk}. Check the conflict alert and affected-train panel before authorizing any movement.`;
  }
  if (/\b(hi|hello|hey|namaste|good morning|good evening)\b/.test(lower)) {
    return `Good day, Section Controller. I have ${requisitions.length} active requisition${requisitions.length === 1 ? '' : 's'} on the live board. Ask me about a section, train risk, conflict, or whether P-Way, S&T, and TRD work can be bundled.`;
  }
  if (lower.includes('bundle') || lower.includes('tradeoff') || lower.includes('trade-off')) {
    return 'Bundling recommendation: combine P-Way, S&T, and TRD work only when the section, date, and protection window overlap. The benefit is one coordinated possession; the trade-off is a wider safety envelope, shared isolation planning, and coordinated release checks. Keep independent sections separate.';
  }
  if (lower.includes('train') || lower.includes('risk') || lower.includes('delay') || lower.includes('timetable')) {
    const timetable = context.trainMasterSummary && typeof context.trainMasterSummary === 'object'
      ? context.trainMasterSummary as { trains?: unknown[] }
      : {};
    const trainCount = Array.isArray(timetable.trains) ? timetable.trains.length : 0;
    return `Train-risk summary: ${requisitions.length} active requisitions and ${trainCount} train master records are loaded. Open the delay badge for a requisition to see timetable movements, calculated regulation minutes, mitigation, and section capacity margin.`;
  }
  return `Live board summary: ${requisitions.length} active requisitions are loaded. I can explain section status, train risk, timetable impact, conflict handling, or P-Way/S&T/TRD bundling. No block authority is granted by this assistant.`;
};

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

  try {
    const body = JSON.parse(await readBody(request)) as { message?: string; history?: ChatMessage[]; context?: ChatContext };
    const message = body.message?.trim() || '';
    const context = body.context || {};
    if (!message || message.length > 2000) {
      sendJson(response, 400, { error: 'Message must be 1-2000 characters' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Gemini API Error]: GEMINI_API_KEY is not configured');
      sendJson(response, 200, { reply: localCopilotReply(message, context), degraded: true });
      return;
    }

    const history = (body.history || []).slice(-10).map((item) => ({
      role: item.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: String(item.text || '').slice(0, 4000) }],
    }));
    const systemInstruction = `You are the Gemini Co-Pilot for TRIKAAL-RAKSHA-BLOCK, an Indian Railways Section Controller Assistant.

CURRENT LIVE BOARD CONTEXT:
${buildContextSummary(context)}

Answer concisely and authoritatively. Use the live data above. Explain trade-offs and safety checks, but never grant authority to occupy a line or approve a block.`;
    const configuredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const models = [configuredModel, 'gemini-1.5-flash'].filter((model, index, all) => all.indexOf(model) === index);

    for (const model of models) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      try {
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
        if (!geminiResponse.ok) {
          console.error('[Gemini API Error]:', { model, status: geminiResponse.status, detail: await geminiResponse.text() });
          continue;
        }
        const result = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const reply = result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
        if (reply) {
          sendJson(response, 200, { reply, model });
          return;
        }
      } catch (error) {
        console.error('[Gemini API Error]:', { model, error });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    sendJson(response, 200, { reply: localCopilotReply(message, context), degraded: true });
  } catch (error) {
    console.error('[Gemini API Error]:', error);
    sendJson(response, 200, {
      reply: 'I could not parse that request. Ask about a section, train risk, conflict, or a P-Way/S&T/TRD bundling trade-off.',
      degraded: true,
    });
  }
}
