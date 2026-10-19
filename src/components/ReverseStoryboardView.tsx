import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Bot,
  Brain,
  ShieldAlert,
  Search,
  MapPin,
  Clock,
  Film,
  Camera,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { Karya } from '../types/index.ts';

interface ReverseStoryboardViewProps {
  karyas: Karya[];
}

export const ReverseStoryboardView: React.FC<ReverseStoryboardViewProps> = ({ karyas }) => {
  const [selectedKaryaId, setSelectedKaryaId] = useState<string>(karyas[0]?.id || 'BND01');
  const activeKarya = karyas.find((k) => k.id === selectedKaryaId) || karyas[0];

  const analysis = activeKarya?.ai_analysis;
  const storyboard = analysis?.reverse_storyboard || [];
  const forensics = analysis?.forensics;
  const culturalRag = analysis?.cultural_rag;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Agent 2 & Agent 4 Inspection
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Reverse-Engineering Storyboard & Forensik Video AI
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1">
            Rekonstruksi Keyframe Adegan & Forensik Generative AI
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Membongkar pemotongan adegan (scene cut), menebak prompt asli dan platform AI pembuat (Veo, Kling, Runway, Midjourney), serta mendeteksi anomali artefak visual.
          </p>
        </div>

        {/* Work Selector Dropdown */}
        <div className="flex items-center space-x-2 self-start md:self-auto bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
          <Film className="w-4 h-4 text-indigo-400" />
          <select
            value={selectedKaryaId}
            onChange={(e) => setSelectedKaryaId(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
          >
            {karyas.map((k) => (
              <option key={k.id} value={k.id} className="bg-slate-900 text-slate-200">
                #{k.id} - {k.judul_karya}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 1: REVERSE-ENGINEERED STORYBOARD GRID (FT-02, FR-06) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Galeri Rekonstruksi Keyframe Adegan (Shot Boundary Detection)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {storyboard.length} Scene Cuts Teridentifikasi
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {storyboard.map((scene) => (
            <div
              key={scene.scene_index}
              className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-md"
            >
              <div>
                {/* Simulated Keyframe Visual Frame */}
                <div className="relative aspect-[16/9] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 text-center border-b border-slate-800">
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-emerald-400 border border-white/10 font-bold">
                    SCENE #{scene.scene_index} • {scene.start_timecode} - {scene.end_timecode}
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/40">
                    {scene.detected_ai_platform}
                  </div>
                  <Sparkles className="w-8 h-8 text-indigo-400/50 mb-1" />
                </div>

                {/* Scene Description */}
                <div className="p-4 space-y-2.5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Deskripsi Aksi Adegan:
                    </span>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed mt-0.5">
                      {scene.keyframe_description}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                      Estimasi Teks Prompt AI:
                    </span>
                    <p className="text-[11px] font-mono text-slate-300 bg-slate-900/90 p-2 rounded-lg border border-slate-800 mt-1 leading-snug">
                      "{scene.estimated_prompt}"
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Model AI:</span>
                <span className="font-bold text-slate-200">{scene.detected_ai_platform}</span>
              </div>
            </div>
          ))}

          {storyboard.length === 0 && (
            <div className="col-span-3 text-center py-8 text-xs text-slate-500 italic">
              Karya ini belum diproses oleh Agent 2 Storyboard Reconstructor.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: FORENSICS & CULTURAL RAG INSPECTOR (FT-04, FT-05) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Forensics Inspection Card (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Analisis Forensik & Indeks Fraud (Agent 4)
            </h3>
          </div>

          {forensics ? (
            <div className="space-y-4 text-xs">
              {/* Proportions Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Proporsi AI Generatif: <strong className="text-indigo-400">{forensics.ai_visual_percentage}%</strong></span>
                  <span>Footage Asli / Live Action: <strong className="text-slate-400">{forensics.live_action_percentage}%</strong></span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                  <div style={{ width: `${forensics.ai_visual_percentage}%` }} className="bg-indigo-600 h-full" />
                  <div style={{ width: `${forensics.live_action_percentage}%` }} className="bg-slate-500 h-full" />
                </div>
              </div>

              {/* Forensic Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Konsistensi Visual</span>
                  <span className="text-sm font-black text-slate-100">{forensics.visual_consistency_score}%</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Temporal Flicker</span>
                  <span className="text-sm font-black text-amber-400">{forensics.temporal_flicker_index}%</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Sinkronisasi Audio</span>
                  <span className="text-sm font-black text-emerald-400">{forensics.audio_sync_score}%</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Fraud Risk Index</span>
                  <span className="text-sm font-black text-rose-400">{forensics.fraud_risk_score}%</span>
                </div>
              </div>

              {/* Anomaly Timecodes List */}
              <div>
                <span className="font-bold text-slate-300 block mb-1.5">
                  Daftar Titik Kelemahan / Anomali Visual (Timecode):
                </span>
                <div className="space-y-1.5">
                  {forensics.anomaly_timecodes.map((ano, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px]"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                          {ano.timecode}
                        </span>
                        <span className="text-slate-300">{ano.issue}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-slate-800 text-slate-400">
                        {ano.severity}
                      </span>
                    </div>
                  ))}

                  {forensics.anomaly_timecodes.length === 0 && (
                    <p className="text-emerald-400 text-[11px] italic">
                      ✓ Tidak terdeteksi anomali flickering atau artefak yang signifikan.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Data forensik belum tersedia.</p>
          )}
        </div>

        {/* Cultural RAG Knowledge Base Card (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Verifikasi Kultural Bondowoso (Agent 3 RAG)
            </h3>
          </div>

          {culturalRag ? (
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400">Skor Kesesuaian Subtema:</span>
                <span className="text-sm font-black text-emerald-400">
                  {culturalRag.subtema_match_score} / 100
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-300 block mb-1.5">
                  Entitas Geografi / Budaya Bondowoso Terdeteksi:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {culturalRag.detected_bondowoso_entities.map((ent, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 font-semibold text-[11px]"
                    >
                      <MapPin className="w-3 h-3 text-indigo-400" />
                      <span>{ent}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-300 block mb-1">
                  Catatan Verifikasi RAG Kultural:
                </span>
                <p className="text-[11px] text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed italic">
                  "{culturalRag.cultural_verification_notes}"
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-300 block mb-1">
                  Transkripsi Narasi Suara:
                </span>
                <p className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {culturalRag.audio_transcript_text}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Data RAG kultural belum tersedia.</p>
          )}
        </div>
      </div>
    </div>
  );
};
