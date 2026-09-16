import { GoogleGenAI } from '@google/genai';
import { DefectPayload } from './mlService';
import { ScheduleBlock } from './solverService';

export interface HighPriorityTrainTimetable {
  train_no: string;
  train_name: string;
  section: string;
  start_time_hhmm: string;
  end_time_hhmm: string;
}

export interface MaintenanceDecisionContext {
  activeSectionDefectCounts: Record<string, number>;
  cpSatScheduleBlocks: ScheduleBlock[];
  highPriorityTrainTimetables: HighPriorityTrainTimetable[];
}

const getEnv = (key: string): string => {
  try {
    const viteValue = ((import.meta as any).env && (import.meta as any).env[key]) as string | undefined;
    if (viteValue) return viteValue;
  } catch {
    // import.meta.env is unavailable outside Vite.
  }
  try {
    if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key] as string;
  } catch {
    // process.env is unavailable in the browser bundle.
  }
  return '';
};

const GEMINI_API_KEY = getEnv('VITE_GEMINI_API_KEY') || getEnv('GEMINI_API_KEY');
const GEMINI_MODEL = getEnv('VITE_GEMINI_MODEL') || 'gemini-2.5-flash';
const SYSTEM_PROMPT = `You are RAKSHA-AI, an expert Indian Railways Chief Track Engineer & Operations Controller.
Use Indian Railways operational language, prioritize safety and timetable protection, and never invent train paths or approvals.
Give concise, actionable answers. When explaining a schedule, use bullet points and explicitly mention risk, duration, section capacity, track occupancy, and Rajdhani/Shatabdi protection.
Treat CP-SAT output as a recommendation requiring the authorized Section Controller's approval.`;

let decisionContext: MaintenanceDecisionContext = {
  activeSectionDefectCounts: {},
  cpSatScheduleBlocks: [],
  highPriorityTrainTimetables: [],
};

export function setMaintenanceDecisionContext(context: Partial<MaintenanceDecisionContext>): void {
  decisionContext = {
    ...decisionContext,
    ...context,
    activeSectionDefectCounts: context.activeSectionDefectCounts || decisionContext.activeSectionDefectCounts,
    cpSatScheduleBlocks: context.cpSatScheduleBlocks || decisionContext.cpSatScheduleBlocks,
    highPriorityTrainTimetables: context.highPriorityTrainTimetables || decisionContext.highPriorityTrainTimetables,
  };
}

function contextPrompt(): string {
  return `LIVE RAKSHA-BLOCK CONTEXT:\n${JSON.stringify(decisionContext, null, 2)}`;
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function fallbackExplanation(scheduleBlock: ScheduleBlock, defect: DefectPayload): string {
  const trains = decisionContext.highPriorityTrainTimetables.filter((train) => train.section === scheduleBlock.section);
  const protectedTrains = trains.length ? trains.map((train) => `${train.train_name} #${train.train_no}`).join(', ') : 'Rajdhani/Shatabdi windows in the active timetable';
  const sectionCount = decisionContext.activeSectionDefectCounts[scheduleBlock.section] ?? 'the active';
  return [
    `- Priority basis: ML defect ${defect.defect_id} has severity ${defect.severity}, risk score inputs indicate ${defect.days_overdue} overdue days, and ${defect.deferred_count} deferred occurrences.`,
    `- Placement: CP-SAT assigned ${scheduleBlock.start_time_hhmm}-${scheduleBlock.end_time_hhmm} on ${scheduleBlock.section} for ${scheduleBlock.duration_mins} minutes, covering ${sectionCount} active defects in the section.`,
    `- Operational protection: the block is outside protected high-priority train windows for ${protectedTrains}; confirm the live control chart before authority is issued.`,
    '- Control action: the Section Controller must approve the possession, lookout protection, and any emergency override before field work starts.',
  ].join('\n');
}

function fallbackChat(userMessage: string): string {
  const message = userMessage.toLowerCase();
  if (message.includes('bottleneck') || message.includes('section')) {
    const sections = Object.entries(decisionContext.activeSectionDefectCounts).sort((left, right) => right[1] - left[1]);
    const busiest = sections[0];
    return busiest
      ? `- Current bottleneck signal: ${busiest[0]} has ${busiest[1]} active defects.\n- Review its CP-SAT occupancy and premium-train windows before accepting new work.\n- Use the Section Controller override path only after safety and train protection checks.`
      : '- No section defect counts are currently loaded.\n- Refresh the live defect feed before making a corridor decision.';
  }
  if (message.includes('emergency') || message.includes('override')) {
    return '- Emergency override requires Section Controller authorization.\n- Recheck Rajdhani/Shatabdi protection, adjacent-track clearance, and lookout deployment.\n- Record the reason, risk tradeoff, and revised timetable window in the control log.';
  }
  if (message.includes('risk') || message.includes('tradeoff')) {
    return '- Prioritize the highest ML risk score that fits the protected maintenance window.\n- Do not trade away mandatory train separation or section capacity for throughput.\n- Bundle departments only when the shared possession remains safe and auditable.';
  }
  return '- RAKSHA-AI is operating in local decision-support mode.\n- I can summarize section bottlenecks, explain CP-SAT tradeoffs, or outline emergency override checks.\n- Gemini connectivity or a configured API key is required for a context-rich answer.';
}

async function generate(prompt: string, history?: any[]): Promise<string> {
  if (!GEMINI_API_KEY) return '';
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const contents = history?.length
    ? [...history, { role: 'user', parts: [{ text: prompt }] }]
    : prompt;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.2 },
  });
  return response.text?.trim() || '';
}

export async function explainScheduleDecision(scheduleBlock: ScheduleBlock, defect: DefectPayload): Promise<string> {
  const prompt = `${contextPrompt()}\n\nExplain this selected maintenance block in 3-5 concise bullet points.\nSCHEDULE BLOCK:\n${JSON.stringify(scheduleBlock, null, 2)}\nDEFECT:\n${JSON.stringify(defect, null, 2)}\nExplicitly explain why the time was selected and how Rajdhani/Shatabdi detention was avoided.`;
  try {
    return (await generate(prompt)) || fallbackExplanation(scheduleBlock, defect);
  } catch (error) {
    console.warn('Gemini schedule explanation unavailable; using local operational fallback.', error);
    return fallbackExplanation(scheduleBlock, defect);
  }
}

export async function chatWithAssistant(userMessage: string, chatHistory: any[]): Promise<string> {
  const prompt = `${contextPrompt()}\n\nController question:\n${userMessage}`;
  try {
    return (await generate(prompt, chatHistory)) || fallbackChat(userMessage);
  } catch (error) {
    console.warn('Gemini controller assistant unavailable; using local operational fallback.', error);
    return fallbackChat(userMessage);
  }
}

export function hasGeminiConfiguration(): boolean {
  return Boolean(GEMINI_API_KEY);
}

export function isTrainWindowProtected(scheduleBlock: ScheduleBlock): boolean {
  const start = toMinutes(scheduleBlock.start_time_hhmm);
  const end = toMinutes(scheduleBlock.end_time_hhmm);
  return !decisionContext.highPriorityTrainTimetables.some((train) => train.section === scheduleBlock.section && Math.max(start, toMinutes(train.start_time_hhmm)) < Math.min(end, toMinutes(train.end_time_hhmm)));
}
