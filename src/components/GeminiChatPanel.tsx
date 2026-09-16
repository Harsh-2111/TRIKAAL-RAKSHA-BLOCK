import React, { useState } from 'react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { User } from '../types';
import { chatWithAssistant } from '../services/geminiService';

interface GeminiChatPanelProps {
  currentUser: User;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export const GeminiChatPanel: React.FC<GeminiChatPanelProps> = ({ currentUser }) => {
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
      const reply = await chatWithAssistant(text, nextMessages);
      setMessages((current) => [...current, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((current) => [...current, { role: 'assistant', text: 'The Co-Pilot is unavailable. Continue with the live safety and timetable checks.' }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex items-center gap-1.5 rounded border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-100"
        title="Open Gemini Co-Pilot chat"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Co-Pilot Chat
      </button>
      {isOpen && (
        <div className="absolute right-0 top-10 z-40 flex h-[420px] w-[min(92vw,360px)] flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-indigo-200 bg-indigo-950 px-3 py-2 text-white">
            <span className="flex items-center gap-1.5 text-xs font-bold"><Sparkles className="h-3.5 w-3.5 text-amber-300" /> Gemini Co-Pilot</span>
            <button type="button" onClick={() => setIsOpen(false)} className="rounded p-1 hover:bg-white/10" title="Close chat"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-xs">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`whitespace-pre-line rounded-md px-2.5 py-2 ${message.role === 'user' ? 'ml-6 bg-indigo-50 text-indigo-950' : 'mr-4 bg-slate-100 text-slate-700'}`}>
                {message.text}
              </div>
            ))}
            {isSending && <div className="text-slate-400">Co-Pilot is thinking...</div>}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 p-2">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask the controller assistant..." className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
            <button type="submit" disabled={isSending || !draft.trim()} className="rounded bg-indigo-700 p-2 text-white disabled:cursor-not-allowed disabled:opacity-40" title="Send message"><Send className="h-3.5 w-3.5" /></button>
          </form>
        </div>
      )}
    </div>
  );
};
