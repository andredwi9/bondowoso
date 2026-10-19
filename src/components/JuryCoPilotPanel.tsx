import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Clock,
  HelpCircle,
  CornerDownLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CoPilotMessage, Karya } from '../types/index.ts';

interface JuryCoPilotPanelProps {
  currentKarya: Karya;
  messages: CoPilotMessage[];
  onSendMessage: (karyaId: string, text: string) => void;
}

export const JuryCoPilotPanel: React.FC<JuryCoPilotPanelProps> = ({
  currentKarya,
  messages,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const karyaMessages = messages.filter((m) => m.karya_id === currentKarya.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(currentKarya.id, inputText);
    setInputText('');
  };

  const quickPrompts = [
    `Analisis keaslian visual AI dan konsistensi temporal pada karya ini`,
    `Apakah entitas kultural ${currentKarya.kategori} di video ini sesuai fakta Bondowoso?`,
    `Tampilkan rincian anomali forensik detik per detik`,
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center">
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Interactive Jury Co-Pilot (FT-07 & FR-11)</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                Multimodal Reasoning
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Tanyakan detail adegan berdasar timecode, klarifikasi nilai, atau bandingkan aspek karya.
            </p>
          </div>
        </div>

        <button className="text-slate-400 hover:text-slate-200">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Quick Prompts */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] text-slate-500 uppercase font-bold shrink-0">
              Saran Pertanyaan:
            </span>
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSendMessage(currentKarya.id, qp)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition-colors shrink-0 border border-slate-700"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3 max-h-56 overflow-y-auto">
            {karyaMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'judge' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'judge'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-850 text-slate-200 border border-slate-700/80 rounded-bl-none shadow-sm'
                  }`}
                >
                  <div className="text-[10px] font-bold opacity-75 mb-1">
                    {msg.sender === 'judge' ? 'Dewan Juri' : 'AI Co-Pilot Assistant'}
                  </div>
                  <p>{msg.text}</p>

                  {/* Cited Timecodes Pill */}
                  {msg.cited_timecodes && msg.cited_timecodes.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> Bukti Timecode:
                      </span>
                      {msg.cited_timecodes.map((tc, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono text-[10px] border border-indigo-700"
                        >
                          {tc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {karyaMessages.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-4">
                Belum ada percakapan. Ketik pertanyaan atau pilih saran pertanyaan di atas untuk berkonsultasi dengan AI Co-Pilot mengenai karya #{currentKarya.id}.
              </p>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Tanyakan pada Co-Pilot tentang karya #${currentKarya.id}...`}
              className="flex-1 bg-slate-950 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-colors flex items-center gap-1"
            >
              <span>Kirim</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
