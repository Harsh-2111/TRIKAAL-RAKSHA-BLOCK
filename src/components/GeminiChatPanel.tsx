import React, { useState } from 'react';
import { LoaderCircle, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { BlockRequest, User } from '../types';
import { chatWithAssistant } from '../services/geminiService';
import { SECTION_TIMETABLE, TRAIN_MASTER } from '../data/railwayOperations';

interface GeminiChatPanelProps {
  currentUser: User;
  allRequests: BlockRequest[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export const GeminiChatPanel: React.FC<GeminiChatPanelProps> = ({ currentUser, allRequests }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Ask about section risk, train protection, or a scheduling tradeoff.' },
  ]);

  if (currentUser.role !== 'SECTION_CONTROLLER') return null;

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    const nextMessages = [...messages, { role: 'user' as const, text }];
    setMessages(nextMessages);
    setDraft('');
    setIsSending(true);
    try {
      const activeRequisitions = allRequests
        .filter((request) => !['REJECTED', 'COMPLETED'].includes(request.status))
        .map((request) => ({
          id: request.id,
          department: request.department,
          section: request.section,
          date: request.requestedDate,
          status: request.status,
          startTime: request.requestedStartTime,
          endTime: request.requestedEndTime,
          durationMinutes: request.durationMinutes,
          priority: request.priority,
        }));
      const defectsData = allRequests.map((request) => ({
        defectId: request.id,
        section: request.section,
        department: request.department,
        priority: request.priority,
        status: request.status,
      }));
      const trainMasterSummary = {
        trains: TRAIN_MASTER,
        sectionTimetable: SECTION_TIMETABLE,
      };
      const reply = await chatWithAssistant(text, nextMessages, {
        activeRequisitions,
        defectsData,
        trainMasterSummary,
      });
      setMessages((current) => [...current, { role: 'assistant', text: reply }]);
    } catch (error) {
      console.error('Gemini Co-Pilot request failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown Gemini service error.';
      setMessages((current) => [...current, { role: 'assistant', text: `I could not reach Gemini right now: ${message}` }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex min-h-8 items-center gap-1.5 rounded border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-100"
        title="Open Gemini Co-Pilot chat"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Co-Pilot Chat
      </button>
      {isOpen && (
        <div className="fixed inset-x-3 bottom-3 z-[70] flex h-[min(70vh,420px)] max-h-[calc(100dvh-1.5rem)] w-auto flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:h-[420px] sm:w-[min(360px,calc(100vw-2rem))]">
          <div className="flex shrink-0 items-center justify-between border-b border-indigo-200 bg-indigo-950 px-3 py-2.5 text-white">
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold"><Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" /> <span className="truncate">Gemini Co-Pilot</span></span>
            <button type="button" onClick={() => setIsOpen(false)} className="rounded p-1.5 hover:bg-white/10" title="Close chat" aria-label="Close chat"><X className="h-4 w-4" /></button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 text-xs">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`whitespace-pre-line break-words rounded-md px-2.5 py-2 ${message.role === 'user' ? 'ml-6 bg-indigo-50 text-indigo-950' : 'mr-4 bg-slate-100 text-slate-700'}`}>
                {message.text}
              </div>
            ))}
            {isSending && <div className="flex items-center gap-1.5 text-slate-400"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Co-Pilot is thinking...</div>}
          </div>
          <form onSubmit={sendMessage} className="flex shrink-0 gap-2 border-t border-slate-200 p-2">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask the controller assistant..." className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-2 text-xs outline-none focus:border-indigo-500" />
            <button type="submit" disabled={isSending || !draft.trim()} className="shrink-0 rounded bg-indigo-700 p-2.5 text-white disabled:cursor-not-allowed disabled:opacity-40" title="Send message" aria-label="Send message"><Send className="h-3.5 w-3.5" /></button>
          </form>
        </div>
      )}
    </div>
  );
};
