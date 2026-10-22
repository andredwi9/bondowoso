import React, { useState, useEffect, useRef } from 'react';
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
  Keyboard,
  Save,
  Plus,
  Minus,
  HelpCircle,
  X,
} from 'lucide-react';
import {
  AspectScores,
  Karya,
  PenilaianJuri,
  Peserta,
  UserRoleSession,
  CoPilotMessage,
} from '../types/index.ts';
import {
  calculateJuryScore,
  BOBOT_PENILAIAN_V2,
  toggleIncrementStep,
  clampScore,
  adjustAspectScore,
} from '../utils/scoring.ts';
import { canJuryScoreWork } from '../utils/validation.ts';
import { generateAutonomousAgentAnalysis } from '../utils/autonomousAgents.ts';
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

  // Helper to get initial scores from existing penilaian or AI Co-Judge
  const getInitialScores = (): AspectScores => {
    if (existingPenilaian) {
      return {
        skor_tema: existingPenilaian.skor_tema,
        skor_kreativitas: existingPenilaian.skor_kreativitas,
        skor_visual_ai: existingPenilaian.skor_visual_ai,
        skor_editing: existingPenilaian.skor_editing,
        skor_audio: existingPenilaian.skor_audio,
      };
    }
    const card =
      currentKarya?.ai_analysis?.agent_scorecard ||
      (currentKarya ? generateAutonomousAgentAnalysis(currentKarya).agent_scorecard : null);
    if (card) {
      return {
        skor_tema: card.ide_konten.score,
        skor_kreativitas: card.pemanfaatan_ai.score,
        skor_visual_ai: card.alur_cerita.score,
        skor_editing: card.kerapian.score,
        skor_audio: card.kualitas_video.score,
      };
    }
    return {
      skor_tema: 91,
      skor_kreativitas: 89,
      skor_visual_ai: 90,
      skor_editing: 88,
      skor_audio: 92,
    };
  };

  const getInitialAspectReasons = () => {
    if (existingPenilaian?.aspect_reasons) {
      return existingPenilaian.aspect_reasons;
    }
    const card =
      currentKarya?.ai_analysis?.agent_scorecard ||
      (currentKarya ? generateAutonomousAgentAnalysis(currentKarya).agent_scorecard : null);
    if (card) {
      return {
        ide_konten: card.ide_konten.reason,
        pemanfaatan_ai: card.pemanfaatan_ai.reason,
        alur_cerita: card.alur_cerita.reason,
        kerapian: card.kerapian.reason,
        kualitas_video: card.kualitas_video.reason,
      };
    }
    return {
      ide_konten: 'Ide orisinal dan kontekstual dengan potensi daerah.',
      pemanfaatan_ai: 'Pemanfaatan model AI konsisten.',
      alur_cerita: 'Alur cerita runtut dan komunikatif.',
      kerapian: 'Penyuntingan cut-to-cut rapi.',
      kualitas_video: 'Resolusi dan ketajaman visual baik.',
    };
  };

  // 5 Aspect Scores state (initialized dynamically, never flat 85)
  const [scores, setScores] = useState<AspectScores>(getInitialScores);

  // Aspect reasons state (for 6th column in Borang Penilaian Lampiran D.1)
  const [aspectReasons, setAspectReasons] = useState(getInitialAspectReasons);

  const [catatan, setCatatan] = useState<string>(
    existingPenilaian?.catatan_evaluasi ||
      currentKarya?.ai_analysis?.agent_scorecard?.alasan_umum ||
      ''
  );
  const [isLocked, setIsLocked] = useState<boolean>(existingPenilaian?.status === 'SUBMITTED');
  const [lastAutosaved, setLastAutosaved] = useState<string | null>(
    existingPenilaian?.autosaved_at || null
  );
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showHudOverlay, setShowHudOverlay] = useState<boolean>(true);

  // Keyboard shortcut & increment states (PRD V2 Rapid Scoring)
  const [incrementStep, setIncrementStep] = useState<0.5 | 1.0>(0.5);
  const [activeAspectKey, setActiveAspectKey] = useState<keyof AspectScores>('skor_tema');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);
  const [saveDraftToast, setSaveDraftToast] = useState<{
    visible: boolean;
    message: string;
    timestamp: string;
    scoreSnapshot?: number;
    karyaId?: string;
  } | null>(null);
  const [stepNotification, setStepNotification] = useState<{
    text: string;
    step: 0.5 | 1.0;
  } | null>(null);

  // Direct input DOM refs for aspect keys
  const inputRefs = useRef<Record<keyof AspectScores, HTMLInputElement | null>>({
    skor_tema: null,
    skor_kreativitas: null,
    skor_visual_ai: null,
    skor_editing: null,
    skor_audio: null,
  });

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
      let aiCard = currentKarya?.ai_analysis?.agent_scorecard;
      if (!aiCard && currentKarya) {
        const auto = generateAutonomousAgentAnalysis(currentKarya);
        aiCard = auto.agent_scorecard;
      }

      if (aiCard) {
        setScores({
          skor_tema: aiCard.ide_konten.score,
          skor_kreativitas: aiCard.pemanfaatan_ai.score,
          skor_visual_ai: aiCard.alur_cerita.score,
          skor_editing: aiCard.kerapian.score,
          skor_audio: aiCard.kualitas_video.score,
        });
        setAspectReasons({
          ide_konten: aiCard.ide_konten.reason,
          pemanfaatan_ai: aiCard.pemanfaatan_ai.reason,
          alur_cerita: aiCard.alur_cerita.reason,
          kerapian: aiCard.kerapian.reason,
          kualitas_video: aiCard.kualitas_video.reason,
        });
        setCatatan(aiCard.alasan_umum || '');
      } else {
        setScores({
          skor_tema: 90,
          skor_kreativitas: 88,
          skor_visual_ai: 89,
          skor_editing: 87,
          skor_audio: 91,
        });
        setAspectReasons({
          ide_konten: 'Ide cukup menarik dengan mengeksplorasi potensi lokal.',
          pemanfaatan_ai: 'Penggunaan generative AI terlihat stabil.',
          alur_cerita: 'Alur cerita runtut dan mudah dipahami.',
          kerapian: 'Penyuntingan cut-to-cut cukup rapi.',
          kualitas_video: 'Resolusi dan ketajaman visual baik.',
        });
        setCatatan('');
      }
      setIsLocked(false);
      setLastAutosaved(null);
    }
  }, [selectedKaryaId, currentJuriId, existingPenilaian, currentKarya]);

  // Apply AI Co-Judge Recommendation on demand
  const applyAICoJudgeRecommendation = () => {
    let aiCard = currentKarya?.ai_analysis?.agent_scorecard;
    if (!aiCard && currentKarya) {
      const auto = generateAutonomousAgentAnalysis(currentKarya);
      aiCard = auto.agent_scorecard;
    }
    if (aiCard) {
      setScores({
        skor_tema: aiCard.ide_konten.score,
        skor_kreativitas: aiCard.pemanfaatan_ai.score,
        skor_visual_ai: aiCard.alur_cerita.score,
        skor_editing: aiCard.kerapian.score,
        skor_audio: aiCard.kualitas_video.score,
      });
      setAspectReasons({
        ide_konten: aiCard.ide_konten.reason,
        pemanfaatan_ai: aiCard.pemanfaatan_ai.reason,
        alur_cerita: aiCard.alur_cerita.reason,
        kerapian: aiCard.kerapian.reason,
        kualitas_video: aiCard.kualitas_video.reason,
      });
      setCatatan(aiCard.alasan_umum || '');
    }
  };

  // Check Rule-01
  const isScorable = currentKarya
    ? canJuryScoreWork(currentKarya.status_teknis, currentKarya.is_overridden)
    : false;

  // Live total score
  const liveTotalSkor = calculateJuryScore(scores);

  // Quick score adjustments by delta (clamped 0 - 100, 1 decimal place)
  const adjustScore = (key: keyof AspectScores, delta: number) => {
    if (isLocked || !isScorable) return;
    setActiveAspectKey(key);
    setScores((prev) => {
      const clamped = adjustAspectScore(prev[key], delta);
      return { ...prev, [key]: clamped };
    });
  };

  // Toggle increment step (+0.5 <-> +1.0) with rapid visual feedback
  const handleToggleIncrementStep = () => {
    const next = toggleIncrementStep(incrementStep);
    setIncrementStep(next);
    setStepNotification({
      text: `Interval Nilai: +${next.toFixed(1)}`,
      step: next,
    });
    setTimeout(() => {
      setStepNotification((prev) => (prev?.step === next ? null : prev));
    }, 2200);
  };

  // Explicit Manual Save Draft (triggered via button, Ctrl + S, or 'D')
  const handleManualSaveDraft = () => {
    if (isLocked || !isScorable || !currentKarya) return;
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
    setSaveDraftToast({
      visible: true,
      message: 'Draf Penilaian Berhasil Disimpan!',
      timestamp: timeStr,
      scoreSnapshot: liveTotalSkor,
      karyaId: currentKarya.id,
    });
    setTimeout(() => {
      setSaveDraftToast((prev) => (prev?.timestamp === timeStr ? null : prev));
    }, 3500);
  };

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

  // Keyboard Shortcuts Listener for high-volume evaluation efficiency
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Save draft: Ctrl + S, Cmd + S, or Alt + S
      if (((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) || (e.altKey && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        handleManualSaveDraft();
        return;
      }

      // Close open modals on Escape
      if (e.key === 'Escape') {
        if (showShortcutsHelp) {
          e.preventDefault();
          setShowShortcutsHelp(false);
          return;
        }
        if (showSubmitModal) {
          e.preventDefault();
          setShowSubmitModal(false);
          return;
        }
      }

      // 2. Submit Final: Ctrl + Enter or Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLocked && isScorable) {
          setShowSubmitModal(true);
        }
        return;
      }

      // Target element inspection
      const target = e.target as HTMLElement | null;
      const isTypingText =
        target &&
        (target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text'));

      if (isTypingText) return;

      // When inside number input, handle ArrowUp / ArrowDown using incrementStep
      if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          adjustScore(activeAspectKey, +incrementStep);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          adjustScore(activeAspectKey, -incrementStep);
          return;
        }
      }

      // 3. Toggle increment step between +0.5 and +1.0 (Key 'i' or 'I')
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleToggleIncrementStep();
        return;
      }

      // 4. Quick single-key save draft: 'd' or 'D'
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleManualSaveDraft();
        return;
      }

      // 5. Toggle Keyboard Shortcuts Help modal (Key '?' or Shift + '/')
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
        return;
      }

      // 6. ArrowUp / '+' / '=' and ArrowDown / '-' / '_' to adjust score of active aspect
      if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
        e.preventDefault();
        adjustScore(activeAspectKey, +incrementStep);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === '-' || e.key === '_') {
        e.preventDefault();
        adjustScore(activeAspectKey, -incrementStep);
        return;
      }

      // 7. Navigate Karyas in queue: '[' (prev) and ']' (next)
      if (e.key === '[') {
        e.preventDefault();
        const currIdx = karyas.findIndex((k) => k.id === selectedKaryaId);
        if (currIdx > 0) {
          setSelectedKaryaId(karyas[currIdx - 1].id);
        }
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        const currIdx = karyas.findIndex((k) => k.id === selectedKaryaId);
        if (currIdx >= 0 && currIdx < karyas.length - 1) {
          setSelectedKaryaId(karyas[currIdx + 1].id);
        }
        return;
      }

      // 8. Number keys 1-5: Focus on Aspect 1 to 5
      if (['1', '2', '3', '4', '5'].includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const aspectMap: Record<string, keyof AspectScores> = {
          '1': 'skor_tema',
          '2': 'skor_kreativitas',
          '3': 'skor_visual_ai',
          '4': 'skor_editing',
          '5': 'skor_audio',
        };
        const aspectKey = aspectMap[e.key];
        if (aspectKey) {
          setActiveAspectKey(aspectKey);
          inputRefs.current[aspectKey]?.focus();
          inputRefs.current[aspectKey]?.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isLocked,
    isScorable,
    currentKarya,
    scores,
    aspectReasons,
    catatan,
    existingPenilaian,
    liveTotalSkor,
    karyas,
    selectedKaryaId,
    currentJuriId,
    currentJuriName,
    onSaveDraft,
    incrementStep,
    activeAspectKey,
    showShortcutsHelp,
    showSubmitModal,
  ]);

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
                {/* AI Co-Judge Recommendation Bar (PRD V2 FT-06) */}
                <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/40 border border-indigo-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center space-x-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-indigo-200">
                        Rekomendasi Penilaian AI Co-Judge (5 Aspek Juknis)
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Skor AI Rekomendasi:{' '}
                        <strong className="text-amber-400 font-mono">
                          {currentKarya?.ai_analysis?.agent_scorecard?.total_score || calculateJuryScore(scores)} / 100
                        </strong>{' '}
                        • Ide: {currentKarya?.ai_analysis?.agent_scorecard?.ide_konten.score || scores.skor_tema} | AI:{' '}
                        {currentKarya?.ai_analysis?.agent_scorecard?.pemanfaatan_ai.score || scores.skor_kreativitas} | Alur:{' '}
                        {currentKarya?.ai_analysis?.agent_scorecard?.alur_cerita.score || scores.skor_visual_ai} | Kerapian:{' '}
                        {currentKarya?.ai_analysis?.agent_scorecard?.kerapian.score || scores.skor_editing} | Kualitas:{' '}
                        {currentKarya?.ai_analysis?.agent_scorecard?.kualitas_video.score || scores.skor_audio}
                      </div>
                    </div>
                  </div>
                  {!isLocked && isScorable && (
                    <button
                      type="button"
                      onClick={applyAICoJudgeRecommendation}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 shrink-0 transition-colors shadow-sm"
                      title="Salin skor dan narasi rekomendasi AI ke dalam borang dewan juri"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Terapkan Rekomendasi AI</span>
                    </button>
                  )}
                </div>

                {/* Rapid Scoring & Keyboard Shortcuts Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800 shadow-inner">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      Interval Nilai (Step):
                    </span>
                    {/* Toggle +0.5 vs +1.0 */}
                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIncrementStep(0.5);
                          setStepNotification({ text: 'Interval Nilai: +0.5', step: 0.5 });
                          setTimeout(() => setStepNotification((prev) => (prev?.step === 0.5 ? null : prev)), 2000);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                          incrementStep === 0.5
                            ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Ubah interval kenaikan menjadi +0.5 (Shortcut: I)"
                      >
                        +0.5
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIncrementStep(1.0);
                          setStepNotification({ text: 'Interval Nilai: +1.0', step: 1.0 });
                          setTimeout(() => setStepNotification((prev) => (prev?.step === 1.0 ? null : prev)), 2000);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                          incrementStep === 1.0
                            ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Ubah interval kenaikan menjadi +1.0 (Shortcut: I)"
                      >
                        +1.0
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleIncrementStep}
                      className="text-[10px] text-slate-300 font-mono bg-slate-900 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-800 transition-colors cursor-pointer"
                      title="Klik atau tekan I untuk berganti antara +0.5 dan +1.0"
                    >
                      Tekan <kbd className="text-amber-300 font-bold">I</kbd> untuk ganti
                    </button>
                  </div>

                  {/* Shortcuts Helper & Quick Save */}
                  <div className="flex items-center space-x-2">
                    {lastAutosaved && (
                      <span className="text-[10px] text-slate-400 font-mono hidden md:inline-flex items-center gap-1 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>Tersimpan: {lastAutosaved}</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowShortcutsHelp(true)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center space-x-1.5 transition-colors"
                      title="Buka panduan shortcut keyboard (?)"
                    >
                      <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                      <span>Shortcut</span>
                      <kbd className="bg-slate-800 text-[10px] font-mono px-1 rounded text-slate-300">?</kbd>
                    </button>

                    {!isLocked && isScorable && (
                      <button
                        type="button"
                        onClick={handleManualSaveDraft}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-600/50 flex items-center space-x-1.5 transition-all shadow-sm"
                        title="Simpan draf sekarang (Shortcut: Ctrl + S atau D)"
                      >
                        <Save className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Simpan Draf</span>
                        <kbd className="bg-emerald-900/80 text-[10px] font-mono px-1 rounded text-emerald-200">Ctrl+S / D</kbd>
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3 w-40">Aspek Penilaian</th>
                        <th className="py-2.5 px-2 w-16 text-center">Bobot</th>
                        <th className="py-2.5 px-3">Indikator Penilaian (Juknis)</th>
                        <th className="py-2.5 px-3 w-36 text-center">Nilai (1-100)</th>
                        <th className="py-2.5 px-3 w-64">Alasan Penilaian (Catatan Juri)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {/* Aspek 1: Ide Konten (25%) */}
                      <tr className={`hover:bg-slate-900/50 transition-colors ${activeAspectKey === 'skor_tema' ? 'bg-indigo-950/40 border-l-4 border-l-amber-400' : 'border-l-4 border-l-transparent'}`}>
                        <td className="py-3 px-3 text-center font-bold">
                          <span className={`inline-block w-5 h-5 leading-5 rounded-full font-mono text-[10px] ${activeAspectKey === 'skor_tema' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'}`}>
                            1
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-100">
                          <div className="flex items-center space-x-1.5">
                            <span>Ide Konten</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400" title="Shortcut tombol 1">
                              [1]
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-indigo-400 font-bold">
                          0.25
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 leading-tight">
                          Orisinalitas ide, kreativitas mengembangkan tema subtema, kejelasan pesan, daya tarik konsep.
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              disabled={!isScorable || isLocked}
                              onClick={() => adjustScore('skor_tema', -incrementStep)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-mono font-bold text-xs flex items-center justify-center border border-slate-700 transition-colors disabled:opacity-40"
                              title={`Kurangi nilai -${incrementStep} (Shortcut: ↓ atau -)`}
                            >
                              -
                            </button>
                            <input
                              ref={(el) => {
                                inputRefs.current.skor_tema = el;
                              }}
                              type="number"
                              min={0}
                              max={100}
                              step={incrementStep}
                              disabled={!isScorable || isLocked}
                              value={scores.skor_tema}
                              onFocus={() => setActiveAspectKey('skor_tema')}
                              onChange={(e) => setScores({ ...scores, skor_tema: Number(e.target.value) })}
                              className="w-16 bg-slate-800 text-center font-mono font-bold text-sm text-amber-400 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              disabled={!isScorable || isLocked}
                              onClick={() => adjustScore('skor_tema', +incrementStep)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-mono font-bold text-xs flex items-center justify-center border border-slate-700 transition-colors disabled:opacity-40"
                              title={`Tambah nilai +${incrementStep} (Shortcut: ↑ atau +)`}
                            >
                              +
                            </button>
                          </div>
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
                      <tr className={`hover:bg-slate-900/50 transition-colors ${activeAspectKey === 'skor_kreativitas' ? 'bg-indigo-950/40 border-l-4 border-l-amber-400' : 'border-l-4 border-l-transparent'}`}>
                        <td className="py-3 px-3 text-center font-bold">
                          <span className={`inline-block w-5 h-5 leading-5 rounded-full font-mono text-[10px] ${activeAspectKey === 'skor_kreativitas' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'}`}>
                            2
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-100">
                          <div className="flex items-center space-x-1.5">
                            <span>Pemanfaatan AI</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400" title="Shortcut tombol 2">
                              [2]
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-indigo-400 font-bold">
                          0.20
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 leading-tight">
                          Pemanfaatan AI optimal, konsistensi visual antaradegan, kehalusan render prompt AI, integrasi harmonis.
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              disabled={!isScorable || isLocked}
                              onClick={() => adjustScore('skor_kreativitas', -incrementStep)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-mono font-bold text-xs flex items-center justify-center border border-slate-700 transition-colors disabled:opacity-40"
                              title={`Kurangi nilai -${incrementStep} (Shortcut: ↓ atau -)`}
                            >
                              -
                            </button>
                            <input
                              ref={(el) => {
                                inputRefs.current.skor_kreativitas = el;
                              }}
                              type="number"
                              min={0}
                              max={100}
                              step={incrementStep}
                              disabled={!isScorable || isLocked}
                              value={scores.skor_kreativitas}
                              onFocus={() => setActiveAspectKey('skor_kreativitas')}
                              onChange={(e) => setScores({ ...scores, skor_kreativitas: Number(e.target.value) })}
                              className="w-16 bg-slate-800 text-center font-mono font-bold text-sm text-amber-400 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              disabled={!isScorable || isLocked}
                              onClick={() => adjustScore('skor_kreativitas', +incrementStep)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-mono font-bold text-xs flex items-center justify-center border border-slate-700 transition-colors disabled:opacity-40"
                              title={`Tambah nilai +${incrementStep} (Shortcut: ↑ atau +)`}
                            >
                              +
                            </button>
                          </div>
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
                      <tr className={`hover:bg-slate-900/50 transition-colors ${activeAspectKey === 'skor_visual_ai' ? 'bg-indigo-950/40 border-l-4 border-l-amber-400' : 'border-l-4 border-l-transparent'}`}>
                        <td className="py-3 px-3 text-center font-bold">
                          <span className={`inline-block w-5 h-5 leading-5 rounded-full font-mono text-[10px] ${activeAspectKey === 'skor_visual_ai' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'}`}>
                            3
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-100">
                          <div className="flex items-center space-x-1.5">
                            <span>Alur Cerita</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400" title="Shortcut tombol 3">
                              [3]
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-indigo-400 font-bold">
                          0.20
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 leading-tight">
                          Alur cerita runtut, keterkaitan logis antaradegan, daya tarik penonton dari awal hingga akhir, closing efektif.
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              disabled={!isScorable || isLocked}
                              onClick={() => adjustScore('skor_visual_ai', -incrementStep)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-mono font-bold text-xs flex items-center justify-center border border-slate-700 transition-colors disabled:opacity-40"
                              title={`Kurangi nilai -${incrementStep} (Shortcut: ↓ atau -)`}
                            >
                              -
                            </button>
                            <input
                              ref={(el) => {
                                inputRefs.current.skor_visual_ai = el;
                              }}
                              type="number"
                              min={0}
                              max={100}
                              step={incrementStep}
                              disabled={!isScorable || isLocked}
                              value={scores.skor_visual_ai}
                              onFocus={() => setActiveAspectKey('skor_visual_ai')}
                              onChange={(e) => setScores({ ...scores, skor_visual_ai: Number(e.target.value) })}
                              className="w-16 bg-slate-800 text-center font-mono font-bold text-sm text-amber-400 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              disabled={!isScorable || isLocked}
                              onClick={() => adjustScore('skor_visual_ai', +incrementStep)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-mono font-bold text-xs flex items-center justify-center border border-slate-700 transition-colors disabled:opacity-40"
                              title={`Tambah nilai +${incrementStep} (Shortcut: ↑ atau +)`}
                            >
                              +
                            </button>
                          </div>
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
                      <tr className={`hover:bg-slate-900/50 transition-colors ${activeAspectKey === 'skor_editing' ? 'bg-indigo-950/40 border-l-4 border-l-amber-400' : 'border-l-4 border-l-transparent'}`}>
                        <td className="py-3 px-3 text-center font-bold">
                          <span className={`inline-block w-5 h-5 leading-5 rounded-full font-mono text-[10px] ${activeAspectKey === 'skor_editing' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'}`}>
                            4
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-100">
                          <div className="flex items-center space-x-1.5">
                            <span>Kerapian</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400" title="Shortcut tombol 4">
                              [4]
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-indigo-400 font-bold">
                          0.15
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 leading-tight">
                          Kerapian proses editing, transisi, efek subtitle, sinkronisasi visual dan audio, kenyamanan tempo (pacing).
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              disabled={!isScorable || isLocked}
                              onClick={() => adjustScore('skor_editing', -incrementStep)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-mono font-bold text-xs flex items-center justify-center border border-slate-700 transition-colors disabled:opacity-40"
                              title={`Kurangi nilai -${incrementStep} (Shortcut: ↓ atau -)`}
                            >
                              -
                            </button>
                            <input
                              ref={(el) => {
                                inputRefs.current.skor_editing = el;
                              }}
                              type="number"
                              min={0}
                              max={100}
                              step={incrementStep}
                              disabled={!isScorable || isLocked}
                              value={scores.skor_editing}
                              onFocus={() => setActiveAspectKey('skor_editing')}
                              onChange={(e) => setScores({ ...scores, skor_editing: Number(e.target.value) })}
                              className="w-16 bg-slate-800 text-center font-mono font-bold text-sm text-amber-400 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              disabled={!isScorable || isLocked}
                              onClick={() => adjustScore('skor_editing', +incrementStep)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-mono font-bold text-xs flex items-center justify-center border border-slate-700 transition-colors disabled:opacity-40"
                              title={`Tambah nilai +${incrementStep} (Shortcut: ↑ atau +)`}
                            >
                              +
                            </button>
                          </div>
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
                      <tr className={`hover:bg-slate-900/50 transition-colors ${activeAspectKey === 'skor_audio' ? 'bg-indigo-950/40 border-l-4 border-l-amber-400' : 'border-l-4 border-l-transparent'}`}>
                        <td className="py-3 px-3 text-center font-bold">
                          <span className={`inline-block w-5 h-5 leading-5 rounded-full font-mono text-[10px] ${activeAspectKey === 'skor_audio' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'}`}>
                            5
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-100">
                          <div className="flex items-center space-x-1.5">
                            <span>Kualitas Video</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400" title="Shortcut tombol 5">
                              [5]
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-indigo-400 font-bold">
                          0.20
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 leading-tight">
                          Ketajaman visual, estetika tampilan, kualitas audio jelas & nyaman, konsistensi visual awal hingga akhir.
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              disabled={!isScorable || isLocked}
                              onClick={() => adjustScore('skor_audio', -incrementStep)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-mono font-bold text-xs flex items-center justify-center border border-slate-700 transition-colors disabled:opacity-40"
                              title={`Kurangi nilai -${incrementStep} (Shortcut: ↓ atau -)`}
                            >
                              -
                            </button>
                            <input
                              ref={(el) => {
                                inputRefs.current.skor_audio = el;
                              }}
                              type="number"
                              min={0}
                              max={100}
                              step={incrementStep}
                              disabled={!isScorable || isLocked}
                              value={scores.skor_audio}
                              onFocus={() => setActiveAspectKey('skor_audio')}
                              onChange={(e) => setScores({ ...scores, skor_audio: Number(e.target.value) })}
                              className="w-16 bg-slate-800 text-center font-mono font-bold text-sm text-amber-400 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              disabled={!isScorable || isLocked}
                              onClick={() => adjustScore('skor_audio', +incrementStep)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-mono font-bold text-xs flex items-center justify-center border border-slate-700 transition-colors disabled:opacity-40"
                              title={`Tambah nilai +${incrementStep} (Shortcut: ↑ atau +)`}
                            >
                              +
                            </button>
                          </div>
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

      {/* Keyboard Shortcuts Help Modal (PRD V2 Rapid Scoring) */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Keyboard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    Shortcut Keyboard Dewan Juri
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      Rapid Scoring v2.0
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Akselerasi evaluasi berkecepatan tinggi tanpa perlu memindahkan tangan ke mouse.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsHelp(false)}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-800 transition-colors"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Shortcut Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Category 1: Interval & Penilaian */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-amber-400 flex items-center space-x-2 text-[11px] uppercase tracking-wider">
                  <Sliders className="w-4 h-4" />
                  <span>Interval & Nilai</span>
                </div>
                <ul className="space-y-2.5 text-slate-300">
                  <li className="flex items-center justify-between">
                    <span className="text-slate-400">Toggle Interval</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-amber-300 text-[11px]">
                      I
                    </kbd>
                  </li>
                  <li className="text-[10px] text-slate-400 italic">
                    Ganti cepat antara +0.5 ⇋ +1.0
                  </li>
                  <li className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Tambah Skor</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-slate-200 text-[11px]">
                        ↑
                      </kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-slate-200 text-[11px]">
                        +
                      </kbd>
                    </div>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-400">Kurangi Skor</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-slate-200 text-[11px]">
                        ↓
                      </kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-slate-200 text-[11px]">
                        -
                      </kbd>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Category 2: Navigasi Aspek & Antrean */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-indigo-400 flex items-center space-x-2 text-[11px] uppercase tracking-wider">
                  <Layers className="w-4 h-4" />
                  <span>Navigasi Aspek</span>
                </div>
                <ul className="space-y-2.5 text-slate-300">
                  <li className="flex items-center justify-between">
                    <span className="text-slate-400">Ide Konten</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-indigo-300 text-[11px]">
                      1
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-400">Pemanfaatan AI</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-indigo-300 text-[11px]">
                      2
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-400">Alur Cerita</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-indigo-300 text-[11px]">
                      3
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-400">Kerapian</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-indigo-300 text-[11px]">
                      4
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-400">Kualitas Video</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-indigo-300 text-[11px]">
                      5
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Video Antrean</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-slate-200 text-[11px]">
                        [
                      </kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-slate-200 text-[11px]">
                        ]
                      </kbd>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Category 3: Simpan Draf & Finalisasi */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-emerald-400 flex items-center space-x-2 text-[11px] uppercase tracking-wider">
                  <Save className="w-4 h-4" />
                  <span>Simpan & Kunci</span>
                </div>
                <ul className="space-y-2.5 text-slate-300">
                  <li className="flex items-center justify-between">
                    <span className="text-slate-400">Simpan Draf</span>
                    <kbd className="px-2 py-1 rounded bg-emerald-950 border border-emerald-700 font-mono font-bold text-emerald-300 text-[11px]">
                      Ctrl + S
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-400">Simpan Cepat</span>
                    <kbd className="px-2 py-1 rounded bg-emerald-950 border border-emerald-700 font-mono font-bold text-emerald-300 text-[11px]">
                      D
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Submit Final</span>
                    <kbd className="px-2 py-1 rounded bg-indigo-950 border border-indigo-700 font-mono font-bold text-indigo-300 text-[11px]">
                      Ctrl + Enter
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-400">Bantuan Shortcut</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-slate-200 text-[11px]">
                      ?
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-400">Tutup Modal</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-slate-200 text-[11px]">
                      Esc
                    </kbd>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <span className="text-[11px] text-slate-400">
                Tip: Seluruh perubahan nilai tersimpan otomatis tiap 5 detik dan draf manual dapat disimpan instan dengan <strong className="text-emerald-400 font-mono">Ctrl + S</strong> atau <strong className="text-emerald-400 font-mono">D</strong>.
              </span>
              <button
                type="button"
                onClick={() => setShowShortcutsHelp(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
              >
                Tutup (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Draft Toast Notification */}
      {saveDraftToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900/95 border-2 border-emerald-500/70 backdrop-blur-md rounded-2xl p-4 shadow-2xl shadow-emerald-950/60 flex items-start space-x-3.5 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center space-x-2">
              <h5 className="text-xs font-black text-emerald-300">
                {saveDraftToast.message}
              </h5>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Ctrl+S / D
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              Tersimpan pukul <strong className="text-slate-100 font-mono">{saveDraftToast.timestamp}</strong>
              {saveDraftToast.scoreSnapshot !== undefined && (
                <span> • Total: <strong className="text-amber-400 font-mono font-bold">{saveDraftToast.scoreSnapshot.toFixed(2)}</strong></span>
              )}
            </p>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              <span>Draf tersimpan aman & sinkron dengan antrean evaluasi</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSaveDraftToast(null)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Increment Step Quick Notification Pill */}
      {stepNotification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-6 z-50 bg-slate-900/95 border border-amber-500/60 backdrop-blur-md rounded-xl px-4 py-2.5 shadow-2xl flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-3 duration-150"
        >
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-slate-200">
            {stepNotification.text}{' '}
            <span className="text-[10px] text-amber-300 font-mono ml-1 font-normal bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              (Tekan I untuk ganti)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
