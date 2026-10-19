import React, { useState, useEffect } from 'react';
import {
  Lock,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Layers,
  Music,
  Palette,
  Eye,
  Sliders,
  FileCode,
  ShieldAlert,
  Clock,
  MapPin,
  Bot,
  Activity,
  Camera,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import {
  AspectScores,
  Karya,
  PenilaianJuri,
  Peserta,
  UserRoleSession,
  CoPilotMessage,
} from '../types/index.ts';
import { calculateJuryScore, BOBOT_PENILAIAN_V2 } from '../utils/scoring.ts';
import { canJuryScoreWork } from '../utils/validation.ts';
import { BondowosoVerticalPlayer } from './BondowosoVerticalPlayer.tsx';
import { JuryCoPilotPanel } from './JuryCoPilotPanel.tsx';

interface JuryScoringPanelProps {
  karyas: Karya[];
  pesertas: Record<string, Peserta>;
  penilaians: PenilaianJuri[];
  session: UserRoleSession;
  coPilotMessages: CoPilotMessage[];
  onSendMessage: (karyaId: string, text: string) => void;
  onSaveDraft: (penilaian: PenilaianJuri) => void;
  onSubmitFinal: (penilaian: PenilaianJuri) => void;
  initialSelectedKaryaId?: string;
}

export const JuryScoringPanel: React.FC<JuryScoringPanelProps> = ({
  karyas,
  pesertas,
  penilaians,
  session,
  coPilotMessages,
  onSendMessage,
  onSaveDraft,
  onSubmitFinal,
  initialSelectedKaryaId,
}) => {
  const [selectedKaryaId, setSelectedKaryaId] = useState<string>(
    initialSelectedKaryaId || karyas[0]?.id || 'BND01'
  );

  const [activeRightTab, setActiveRightTab] = useState<'borang' | 'storyboard' | 'forensics'>('borang');

  const currentJuriId = session.juri_id || 'juri-1';
  const currentJuriName = session.name;

  const currentKarya = karyas.find((k) => k.id === selectedKaryaId) || karyas[0];
  const currentPeserta = currentKarya ? pesertas[currentKarya.peserta_id] : null;

  // Existing evaluation
  const existingPenilaian = penilaians.find(
    (p) => p.karya_id === selectedKaryaId && p.juri_id === currentJuriId
  );

  // 5 Aspect Scores state
  const [scores, setScores] = useState<AspectScores>({
    skor_tema: 85,
    skor_kreativitas: 85,
    skor_visual_ai: 85,
    skor_editing: 85,
    skor_audio: 85,
  });

  // Aspect reasons state (for 6th column in Borang Penilaian Lampiran D.1)
  const [aspectReasons, setAspectReasons] = useState({
    ide_konten: '',
    pemanfaatan_ai: '',
    alur_cerita: '',
    kerapian: '',
    kualitas_video: '',
  });

  const [catatan, setCatatan] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lastAutosaved, setLastAutosaved] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showHudOverlay, setShowHudOverlay] = useState<boolean>(true);

  // Populate form
  useEffect(() => {
    if (existingPenilaian) {
      setScores({
        skor_tema: existingPenilaian.skor_tema,
        skor_kreativitas: existingPenilaian.skor_kreativitas,
        skor_visual_ai: existingPenilaian.skor_visual_ai,
        skor_editing: existingPenilaian.skor_editing,
        skor_audio: existingPenilaian.skor_audio,
      });
      setCatatan(existingPenilaian.catatan_evaluasi || '');
      setAspectReasons(
        existingPenilaian.aspect_reasons || {
          ide_konten: currentKarya?.ai_analysis?.agent_scorecard?.ide_konten.reason || 'Ide konten orisinal dan kontekstual.',
          pemanfaatan_ai: currentKarya?.ai_analysis?.agent_scorecard?.pemanfaatan_ai.reason || 'Penggunaan model AI generatif konsisten.',
          alur_cerita: currentKarya?.ai_analysis?.agent_scorecard?.alur_cerita.reason || 'Alur naratif tersusun logis.',
          kerapian: currentKarya?.ai_analysis?.agent_scorecard?.kerapian.reason || 'Editing cut rapi dan audio jernih.',
          kualitas_video: currentKarya?.ai_analysis?.agent_scorecard?.kualitas_video.reason || 'Komposisi gambar dan estetika tajam.',
        }
      );
      setIsLocked(existingPenilaian.status === 'SUBMITTED');
      setLastAutosaved(existingPenilaian.autosaved_at || null);
    } else {
      // Pre-fill with Autonomous Co-Judge AI Recommendation (PRD V2 FT-06)
      const aiCard = currentKarya?.ai_analysis?.agent_scorecard;
      setScores({
        skor_tema: aiCard?.ide_konten.score || 85,
        skor_kreativitas: aiCard?.pemanfaatan_ai.score || 85,
        skor_visual_ai: aiCard?.alur_cerita.score || 85,
        skor_editing: aiCard?.kerapian.score || 85,
        skor_audio: aiCard?.kualitas_video.score || 85,
      });
      setAspectReasons({
        ide_konten: aiCard?.ide_konten.reason || 'Ide cukup menarik dengan mengeksplorasi potensi lokal.',
        pemanfaatan_ai: aiCard?.pemanfaatan_ai.reason || 'Penggunaan generative AI terlihat stabil.',
        alur_cerita: aiCard?.alur_cerita.reason || 'Alur cerita runtut dan mudah dipahami.',
        kerapian: aiCard?.kerapian.reason || 'Penyuntingan cut-to-cut cukup rapi.',
        kualitas_video: aiCard?.kualitas_video.reason || 'Resolusi dan ketajaman visual baik.',
      });
      setCatatan(aiCard?.alasan_umum || '');
      setIsLocked(false);
      setLastAutosaved(null);
    }
  }, [selectedKaryaId, currentJuriId, existingPenilaian, currentKarya]);

  // Check Rule-01
  const isScorable = currentKarya
    ? canJuryScoreWork(currentKarya.status_teknis, currentKarya.is_overridden)
    : false;

  // Live total score
  const liveTotalSkor = calculateJuryScore(scores);

  // Autosave Draft every 5s (NFR-04)
  useEffect(() => {
    if (isLocked || !isScorable || !currentKarya) return;

    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const draftObj: PenilaianJuri = {
        id: existingPenilaian?.id || `PEN-${Date.now()}`,
        karya_id: currentKarya.id,
        juri_id: currentJuriId,
        juri_nama: currentJuriName,
        juri_peran: 'Dewan Juri',
        skor_tema: scores.skor_tema,
        skor_kreativitas: scores.skor_kreativitas,
        skor_visual_ai: scores.skor_visual_ai,
        skor_editing: scores.skor_editing,
        skor_audio: scores.skor_audio,
        total_skor: liveTotalSkor,
        catatan_evaluasi: catatan,
        aspect_reasons: aspectReasons,
        status: 'DRAFT',
        autosaved_at: now.toISOString(),
      };
      onSaveDraft(draftObj);
      setLastAutosaved(timeStr);
    }, 5000);

    return () => clearInterval(timer);
  }, [scores, aspectReasons, catatan, isLocked, isScorable, currentKarya, currentJuriId, currentJuriName, liveTotalSkor, existingPenilaian, onSaveDraft]);

  // Handle Confirm Final Submit (AC-03)
  const handleConfirmSubmit = () => {
    if (!currentKarya) return;
    const finalObj: PenilaianJuri = {
      id: existingPenilaian?.id || `PEN-${Date.now()}`,
      karya_id: currentKarya.id,
      juri_id: currentJuriId,
      juri_nama: currentJuriName,
      juri_peran: 'Dewan Juri',
      skor_tema: scores.skor_tema,
      skor_kreativitas: scores.skor_kreativitas,
      skor_visual_ai: scores.skor_visual_ai,
      skor_editing: scores.skor_editing,
      skor_audio: scores.skor_audio,
      total_skor: liveTotalSkor,
      catatan_evaluasi: catatan,
      aspect_reasons: aspectReasons,
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
    };
    onSubmitFinal(finalObj);
    setIsLocked(true);
    setShowSubmitModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Active Jury and Work Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Workspace Dewan Juri v2.0
              </span>
              <span className="text-xs text-slate-400">
                Penilai: <strong className="text-slate-200">{currentJuriName}</strong>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1">
              Borang Penilaian 6-Kolom & Co-Judge Workspace
            </h2>
          </div>

          {/* Autosave Status (NFR-04) */}
          <div className="flex items-center space-x-3 self-start md:self-auto bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-emerald-400" />
            <div className="text-xs">
              <div className="text-slate-400">Status Autosave:</div>
              <div className="font-semibold text-emerald-300">
                {isLocked
                  ? '🔒 Nilai Terkunci (Final)'
                  : lastAutosaved
                  ? `Tersimpan pk. ${lastAutosaved}`
                  : 'Autosave setiap 5 detik aktif'}
              </div>
            </div>
          </div>
        </div>

        {/* Work Selection Pills */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
            Pilih Berkas Karya untuk Dinilai:
          </label>
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin">
            {karyas.map((k) => {
              const pen = penilaians.find(
                (p) => p.karya_id === k.id && p.juri_id === currentJuriId
              );
              const isDisq = k.status_teknis === 'RED_FLAG' && !k.is_overridden;
              const isSelected = k.id === selectedKaryaId;

              return (
                <button
                  key={k.id}
                  onClick={() => setSelectedKaryaId(k.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-750'
                  }`}
                >
                  <span className="font-bold">#{k.id}</span>
                  <span className="truncate max-w-[130px]">
                    {session.blind_review_mode ? `Karya ${k.id}` : k.judul_karya}
                  </span>

                  {isDisq && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-400/40" title="Diskualifikasi Teknis" />
                  )}
                  {pen?.status === 'SUBMITTED' && (
                    <span title="Sudah Dinilai Final">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-1" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main 2-Column Evaluation Workspace (Bab 3.2 Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: 9:16 Vertical Video Player (4.5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <BondowosoVerticalPlayer
            karya={currentKarya}
            showHudOverlay={showHudOverlay}
            onToggleHud={() => setShowHudOverlay(!showHudOverlay)}
            blindReviewMode={session.blind_review_mode}
          />

          {/* Quick Technical Summary Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Subtema:</span>
              <span className="font-bold text-indigo-400">{currentKarya.kategori}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Durasi:</span>
              <span className="font-mono text-slate-200">{currentKarya.metadata.duration_seconds}s (30–60s)</span>
            </div>
            {currentKarya.ai_analysis && (
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Rekomendasi AI:</span>
                <span className="font-bold text-amber-400">{currentKarya.ai_analysis.score.toFixed(2)} / 100</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Tabbed Multi-Agent Workspace (7.5 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  Kategori: {currentKarya.kategori}
                </span>
                <h3 className="text-lg font-black text-slate-100">
                  {session.blind_review_mode ? `Karya #${currentKarya.id} [Blind Review]` : currentKarya.judul_karya}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {session.blind_review_mode ? (
                    <span className="italic text-amber-400">Identitas disamarkan (Blind Review)</span>
                  ) : (
                    <span>Oleh: <strong className="text-slate-200">{currentPeserta?.nama}</strong></span>
                  )}
                </p>
              </div>

              {/* Total Live Weighted Score Counter */}
              <div className="flex items-center space-x-3 bg-gradient-to-br from-indigo-950 to-slate-900 p-2.5 rounded-xl border border-indigo-700/50">
                <div className="text-right">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-300">
                    Total Nilai Juri (v2.0)
                  </div>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    {liveTotalSkor.toFixed(2)}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-amber-400" />
                </div>
              </div>
            </div>

            {/* RULE-01 RED FLAG ALERT */}
            {!isScorable && (
              <div className="bg-rose-950/70 border-2 border-rose-600/70 rounded-xl p-3.5 text-rose-200 space-y-1 text-xs">
                <div className="flex items-center space-x-1.5 font-bold text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>KARYA INI BERSTATUS "DISKUALIFIKASI TEKNIS"</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Sesuai <strong>Rule-01 Juknis</strong>, karya ini tidak dapat dinilai dewan juri kecuali ada pembatalan manual (override) dari Admin Panitia.
                </p>
              </div>
            )}

            {/* TAB SELECTOR (Tab 1, Tab 2, Tab 3) */}
            <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveRightTab('borang')}
                className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                  activeRightTab === 'borang'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Borang 6-Kolom Juknis
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab('storyboard')}
                className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                  activeRightTab === 'storyboard'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Reverse-Storyboard & Prompt
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab('forensics')}
                className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                  activeRightTab === 'forensics'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Cultural RAG & Forensik
              </button>
            </div>

            {/* TAB 1: STANDAR BORANG PENILAIAN 6 KOLOM RESMI (Lampiran D.1) */}
            {activeRightTab === 'borang' && (
              <div className={`space-y-4 ${!isScorable || isLocked ? 'opacity-80' : ''}`}>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3 w-40">Aspek Penilaian</th>
                        <th className="py-2.5 px-2 w-16 text-center">Bobot</th>
                        <th className="py-2.5 px-3">Indikator Penilaian (Juknis)</th>
                        <th className="py-2.5 px-3 w-28 text-center">Nilai (1-100)</th>
                        <th className="py-2.5 px-3 w-64">Alasan Penilaian (Catatan Juri)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {/* Aspek 1: Ide Konten (25%) */}
                      <tr className="hover:bg-slate-900/50">
                        <td className="py-3 px-3 text-center font-bold">1</td>
                        <td className="py-3 px-3 font-bold text-slate-100">
                          Ide Konten
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-indigo-400 font-bold">
                          0.25
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 leading-tight">
                          Orisinalitas ide, kreativitas mengembangkan tema subtema, kejelasan pesan, daya tarik konsep.
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            disabled={!isScorable || isLocked}
                            value={scores.skor_tema}
                            onChange={(e) => setScores({ ...scores, skor_tema: Number(e.target.value) })}
                            className="w-16 bg-slate-800 text-center font-mono font-bold text-sm text-amber-400 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <textarea
                            rows={2}
                            disabled={!isScorable || isLocked}
                            value={aspectReasons.ide_konten}
                            onChange={(e) => setAspectReasons({ ...aspectReasons, ide_konten: e.target.value })}
                            className="w-full bg-slate-900 text-[11px] text-slate-200 p-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
                            placeholder="Alasan penilaian ide konten..."
                          />
                        </td>
                      </tr>

                      {/* Aspek 2: Pemanfaatan Teknologi AI (20%) */}
                      <tr className="hover:bg-slate-900/50">
                        <td className="py-3 px-3 text-center font-bold">2</td>
                        <td className="py-3 px-3 font-bold text-slate-100">
                          Pemanfaatan Teknologi AI
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-indigo-400 font-bold">
                          0.20
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 leading-tight">
                          Pemanfaatan AI optimal, konsistensi visual antaradegan, kehalusan render prompt AI, integrasi harmonis.
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            disabled={!isScorable || isLocked}
                            value={scores.skor_kreativitas}
                            onChange={(e) => setScores({ ...scores, skor_kreativitas: Number(e.target.value) })}
                            className="w-16 bg-slate-800 text-center font-mono font-bold text-sm text-amber-400 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <textarea
                            rows={2}
                            disabled={!isScorable || isLocked}
                            value={aspectReasons.pemanfaatan_ai}
                            onChange={(e) => setAspectReasons({ ...aspectReasons, pemanfaatan_ai: e.target.value })}
                            className="w-full bg-slate-900 text-[11px] text-slate-200 p-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
                            placeholder="Alasan penilaian pemanfaatan AI..."
                          />
                        </td>
                      </tr>

                      {/* Aspek 3: Alur Cerita (20%) */}
                      <tr className="hover:bg-slate-900/50">
                        <td className="py-3 px-3 text-center font-bold">3</td>
                        <td className="py-3 px-3 font-bold text-slate-100">
                          Alur Cerita
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-indigo-400 font-bold">
                          0.20
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 leading-tight">
                          Alur cerita runtut, keterkaitan logis antaradegan, daya tarik penonton dari awal hingga akhir, closing efektif.
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            disabled={!isScorable || isLocked}
                            value={scores.skor_visual_ai}
                            onChange={(e) => setScores({ ...scores, skor_visual_ai: Number(e.target.value) })}
                            className="w-16 bg-slate-800 text-center font-mono font-bold text-sm text-amber-400 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <textarea
                            rows={2}
                            disabled={!isScorable || isLocked}
                            value={aspectReasons.alur_cerita}
                            onChange={(e) => setAspectReasons({ ...aspectReasons, alur_cerita: e.target.value })}
                            className="w-full bg-slate-900 text-[11px] text-slate-200 p-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
                            placeholder="Alasan penilaian alur cerita..."
                          />
                        </td>
                      </tr>

                      {/* Aspek 4: Kerapian Pengerjaan Konten (15%) */}
                      <tr className="hover:bg-slate-900/50">
                        <td className="py-3 px-3 text-center font-bold">4</td>
                        <td className="py-3 px-3 font-bold text-slate-100">
                          Kerapian Pengerjaan
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-indigo-400 font-bold">
                          0.15
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 leading-tight">
                          Kerapian proses editing, transisi, efek subtitle, sinkronisasi visual dan audio, kenyamanan tempo (pacing).
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            disabled={!isScorable || isLocked}
                            value={scores.skor_editing}
                            onChange={(e) => setScores({ ...scores, skor_editing: Number(e.target.value) })}
                            className="w-16 bg-slate-800 text-center font-mono font-bold text-sm text-amber-400 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <textarea
                            rows={2}
                            disabled={!isScorable || isLocked}
                            value={aspectReasons.kerapian}
                            onChange={(e) => setAspectReasons({ ...aspectReasons, kerapian: e.target.value })}
                            className="w-full bg-slate-900 text-[11px] text-slate-200 p-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
                            placeholder="Alasan penilaian kerapian..."
                          />
                        </td>
                      </tr>

                      {/* Aspek 5: Kualitas Video (20%) */}
                      <tr className="hover:bg-slate-900/50">
                        <td className="py-3 px-3 text-center font-bold">5</td>
                        <td className="py-3 px-3 font-bold text-slate-100">
                          Kualitas Video
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-indigo-400 font-bold">
                          0.20
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 leading-tight">
                          Ketajaman visual, estetika tampilan, kualitas audio jelas & nyaman, konsistensi visual awal hingga akhir.
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            disabled={!isScorable || isLocked}
                            value={scores.skor_audio}
                            onChange={(e) => setScores({ ...scores, skor_audio: Number(e.target.value) })}
                            className="w-16 bg-slate-800 text-center font-mono font-bold text-sm text-amber-400 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <textarea
                            rows={2}
                            disabled={!isScorable || isLocked}
                            value={aspectReasons.kualitas_video}
                            onChange={(e) => setAspectReasons({ ...aspectReasons, kualitas_video: e.target.value })}
                            className="w-full bg-slate-900 text-[11px] text-slate-200 p-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
                            placeholder="Alasan penilaian kualitas video..."
                          />
                        </td>
                      </tr>

                      {/* Baris TOTAL (Bobot = 1) */}
                      <tr className="bg-slate-900 font-bold border-t-2 border-slate-700">
                        <td colSpan={2} className="py-3 px-3 uppercase text-right text-indigo-400">
                          TOTAL SKOR TERBOBOT:
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-indigo-400">
                          1.00
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400">
                          Formula: (Ide*0.25) + (AI*0.2) + (Alur*0.2) + (Kerapian*0.15) + (Kualitas*0.2)
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-xl text-amber-400 font-black">
                          {liveTotalSkor.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-300">
                          {liveTotalSkor >= 85 ? 'Kategori Sangat Memuaskan (Nominasi)' : liveTotalSkor >= 75 ? 'Kategori Baik' : 'Kategori Cukup'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Overall Notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Catatan Rangkuman Pleno Dewan Juri:
                  </label>
                  <textarea
                    rows={2}
                    disabled={!isScorable || isLocked}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-750 focus:outline-none focus:border-indigo-500"
                    placeholder="Tuliskan catatan apresiasi atau pertimbangan khusus dewan juri..."
                  />
                </div>

                {/* Submit Final Button (AC-03) */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-400">
                    Nilai yang disubmit akan mengunci borang dan langsung memperbarui urutan Live Leaderboard (&lt;2 detik).
                  </div>

                  {!isLocked ? (
                    <button
                      type="button"
                      disabled={!isScorable}
                      onClick={() => setShowSubmitModal(true)}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40 flex items-center space-x-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Submit Final & Kunci Nilai</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold bg-emerald-950/80 px-4 py-2 rounded-xl border border-emerald-500/40">
                      <CheckCircle className="w-4 h-4" />
                      <span>Nilai Telah Dikunci (Final)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: REVERSE-STORYBOARD & PROMPT EXTRACTION */}
            {activeRightTab === 'storyboard' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {(currentKarya.ai_analysis?.reverse_storyboard || []).map((sc) => (
                    <div
                      key={sc.scene_index}
                      className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2"
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-emerald-400 font-mono">
                          Scene #{sc.scene_index} ({sc.start_timecode} - {sc.end_timecode})
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          {sc.detected_ai_platform}
                        </span>
                      </div>
                      <p className="text-slate-200 text-[11px]">{sc.keyframe_description}</p>
                      <div className="bg-slate-900 p-2 rounded text-[10px] font-mono text-amber-300 border border-slate-800">
                        "{sc.estimated_prompt}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: CULTURAL RAG & FORENSICS INSPECTOR */}
            {activeRightTab === 'forensics' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[10px]">Entitas Kultural Bondowoso:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(currentKarya.ai_analysis?.cultural_rag?.detected_bondowoso_entities || []).map((ent, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 text-[10px] border border-indigo-800">
                          {ent}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[10px]">Indeks Fraud & Forensik:</span>
                    <div className="text-sm font-bold text-amber-400 font-mono mt-1">
                      Fraud Index: {currentKarya.ai_analysis?.forensics?.fraud_risk_score || 15}%
                    </div>
                    <div className="text-[10px] text-slate-400">
                      AI Visual: {currentKarya.ai_analysis?.forensics?.ai_visual_percentage || 90}%
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed italic">
                  "{currentKarya.ai_analysis?.cultural_rag?.cultural_verification_notes}"
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM PANEL: INTERACTIVE JURY CO-PILOT (FT-07, FR-11) */}
          <JuryCoPilotPanel
            currentKarya={currentKarya}
            messages={coPilotMessages}
            onSendMessage={onSendMessage}
          />
        </div>
      </div>

      {/* Confirmation Modal for Final Submit */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-slate-100 text-center">
              Submit Final & Kunci Borang Penilaian?
            </h4>
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Total Skor Terbobot: <strong className="text-amber-400 font-mono text-sm">{liveTotalSkor.toFixed(2)}</strong> untuk karya #{currentKarya.id}. Borang akan terkunci secara permanen sesuai Acceptance Criteria AC-03.
            </p>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-colors"
              >
                Ya, Submit Final
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
