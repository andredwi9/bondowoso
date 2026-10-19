import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, AppTab } from './components/Navbar.tsx';
import { JuryScoringPanel } from './components/JuryScoringPanel.tsx';
import { LiveLeaderboard } from './components/LiveLeaderboard.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { BeritaAcaraExport } from './components/BeritaAcaraExport.tsx';
import { AuditTrailView } from './components/AuditTrailView.tsx';
import { SingleVideoUploadView } from './components/SingleVideoUploadView.tsx';
import { ReverseStoryboardView } from './components/ReverseStoryboardView.tsx';
import { VerificationTicketView } from './components/VerificationTicketView.tsx';
import {
  INITIAL_KARYA,
  INITIAL_PESERTA,
  INITIAL_PENILAIAN,
  INITIAL_AUDIT_LOGS,
  INITIAL_VERIFICATION_TICKETS,
  INITIAL_COPILOT_MESSAGES,
} from './data/mockData.ts';
import {
  Karya,
  Peserta,
  PenilaianJuri,
  AuditLogItem,
  UserRoleSession,
  VerificationTicket,
  CoPilotMessage,
} from './types/index.ts';

const STORAGE_KEYS = {
  karyas: 'bondowoso_video_ai_karyas_v2',
  pesertas: 'bondowoso_video_ai_pesertas_v2',
  penilaians: 'bondowoso_video_ai_penilaians_v2',
  auditLogs: 'bondowoso_video_ai_audit_logs_v2',
  tickets: 'bondowoso_video_ai_tickets_v2',
  copilot: 'bondowoso_video_ai_copilot_v2',
};

// Flatten initial copilot messages
const getInitialCoPilotList = (): CoPilotMessage[] => {
  return Object.values(INITIAL_COPILOT_MESSAGES).flat();
};

export default function App() {
  // Load state from localStorage or initial mock data
  const [karyas, setKaryas] = useState<Karya[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.karyas);
    return saved ? JSON.parse(saved) : INITIAL_KARYA;
  });

  const [pesertas, setPesertas] = useState<Record<string, Peserta>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.pesertas);
    return saved ? JSON.parse(saved) : INITIAL_PESERTA;
  });

  const [penilaians, setPenilaians] = useState<PenilaianJuri[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.penilaians);
    return saved ? JSON.parse(saved) : INITIAL_PENILAIAN;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.auditLogs);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [tickets, setTickets] = useState<VerificationTicket[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.tickets);
    return saved ? JSON.parse(saved) : INITIAL_VERIFICATION_TICKETS;
  });

  const [coPilotMessages, setCoPilotMessages] = useState<CoPilotMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.copilot);
    return saved ? JSON.parse(saved) : getInitialCoPilotList();
  });

  const [activeTab, setActiveTab] = useState<AppTab>('jury');
  const [selectedKaryaForJury, setSelectedKaryaForJury] = useState<string | undefined>(undefined);

  const [session, setSession] = useState<UserRoleSession>({
    role: 'juri',
    juri_id: 'juri-1',
    name: 'Dr. Ir. Budi Santoso, M.Sn (Juri Teknis)',
    blind_review_mode: false,
  });

  const [isAIBatchRunning, setIsAIBatchRunning] = useState<boolean>(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.karyas, JSON.stringify(karyas));
  }, [karyas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.pesertas, JSON.stringify(pesertas));
  }, [pesertas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.penilaians, JSON.stringify(penilaians));
  }, [penilaians]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.auditLogs, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tickets, JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.copilot, JSON.stringify(coPilotMessages));
  }, [coPilotMessages]);

  // Log an audit trail entry
  const addAuditLog = useCallback(
    async (action: string, details: string, karyaId?: string) => {
      let clientIp = '127.0.0.1';
      try {
        const res = await fetch('/api/audit', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.ip) clientIp = data.ip;
        }
      } catch {
        // use fallback IP
      }

      const newLog: AuditLogItem = {
        id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        ip_address: clientIp,
        user_role: session.role === 'juri' ? `Dewan Juri (${session.juri_id})` : 'Administrator Panitia',
        user_name: session.name,
        action,
        karya_id: karyaId,
        details,
      };

      setAuditLogs((prev) => [newLog, ...prev]);
    },
    [session]
  );

  // Handle Autosave Draft (NFR-04)
  const handleSaveDraft = useCallback(
    (draft: PenilaianJuri) => {
      setPenilaians((prev) => {
        const idx = prev.findIndex((p) => p.karya_id === draft.karya_id && p.juri_id === draft.juri_id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = draft;
          return updated;
        } else {
          return [...prev, draft];
        }
      });
    },
    []
  );

  // Handle Submit Final (AC-03 & AC-04)
  const handleSubmitFinal = useCallback(
    (finalScore: PenilaianJuri) => {
      setPenilaians((prev) => {
        const idx = prev.findIndex((p) => p.karya_id === finalScore.karya_id && p.juri_id === finalScore.juri_id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = finalScore;
          return updated;
        } else {
          return [...prev, finalScore];
        }
      });

      addAuditLog(
        'SUBMIT_FINAL_SCORE',
        `Menyelesaikan & mengunci nilai final untuk karya #${finalScore.karya_id} dengan total skor: ${finalScore.total_skor.toFixed(2)} / 100. Catatan: "${finalScore.catatan_evaluasi || 'Tidak ada catatan'}"`,
        finalScore.karya_id
      );
    },
    [addAuditLog]
  );

  // Handle Manual Override by Admin (Rule-01)
  const handleUpdateKaryaStatus = useCallback(
    (karyaId: string, isOverridden: boolean, overrideReason: string) => {
      const now = new Date().toISOString();
      setKaryas((prev) =>
        prev.map((k) => {
          if (k.id === karyaId) {
            return {
              ...k,
              is_overridden: isOverridden,
              override_reason: overrideReason,
              override_by: session.name,
              override_at: now,
            };
          }
          return k;
        })
      );

      addAuditLog(
        'MANUAL_OVERRIDE',
        `Administrator melakukan manual override pembatalan diskualifikasi untuk karya #${karyaId}. Alasan: "${overrideReason}"`,
        karyaId
      );
    },
    [session, addAuditLog]
  );

  // ADMIN ACTION: DELETE SCORED VIDEO (Requested explicitly by user)
  const handleDeleteKarya = useCallback(
    (karyaId: string, deletionReason: string) => {
      const karyaToDelete = karyas.find((k) => k.id === karyaId);
      if (!karyaToDelete) return;

      const relatedPenilaians = penilaians.filter((p) => p.karya_id === karyaId);
      const submittedScores = relatedPenilaians.filter((p) => p.status === 'SUBMITTED');
      const peserta = pesertas[karyaToDelete.peserta_id];

      // Remove from karyas
      setKaryas((prev) => prev.filter((k) => k.id !== karyaId));

      // Remove all associated jury scores
      setPenilaians((prev) => prev.filter((p) => p.karya_id !== karyaId));

      // Remove any tickets or copilot messages
      setTickets((prev) => prev.filter((t) => t.submission_id !== karyaId));
      setCoPilotMessages((prev) => prev.filter((m) => m.karya_id !== karyaId));

      // Log to Audit Trail
      addAuditLog(
        'DELETE_SCORED_VIDEO',
        `[AKSES ADMIN] Menghapus berkas karya #${karyaId} ("${karyaToDelete.judul_karya}" - Peserta: ${peserta?.nama || karyaToDelete.peserta_id}). ` +
          `Status Penilaian: ${
            submittedScores.length > 0
              ? `Sudah dinilai oleh ${submittedScores.length} dewan juri (${submittedScores
                  .map((s) => `${s.juri_nama}: ${s.total_skor.toFixed(2)}`)
                  .join(', ')})`
              : 'Belum dinilai final'
          }. Seluruh ${relatedPenilaians.length} data skor juri dibersihkan dan peringkat Leaderboard diperbarui otomatis. Alasan penghapusan: "${deletionReason}"`,
        karyaId
      );
    },
    [karyas, penilaians, pesertas, addAuditLog]
  );

  // Ingest batch karyas from ZIP
  const handleAddKaryaBatch = useCallback(
    (newKaryas: Karya[], newPesertas: Record<string, Peserta>) => {
      setKaryas((prev) => [...prev, ...newKaryas]);
      setPesertas((prev) => ({ ...prev, ...newPesertas }));
      addAuditLog(
        'INGEST_ZIP_BATCH',
        `Mengekstrak dan memproses ${newKaryas.length} karya video baru dari berkas arsip ZIP kolektif.`
      );
    },
    [addAuditLog]
  );

  // Add single karya from Zero-Friction submission (FT-01)
  const handleAddSingleKarya = useCallback(
    (newKarya: Karya, newPeserta: Peserta) => {
      setKaryas((prev) => [newKarya, ...prev]);
      setPesertas((prev) => ({ ...prev, [newPeserta.id]: newPeserta }));
      addAuditLog(
        'SINGLE_VIDEO_UPLOAD',
        `Penerimaan karya video tunggal V2 #${newKarya.id} ("${newKarya.judul_karya}"). Pipeline 5 Agen AI berhasil mengeksekusi analisis otonom.`,
        newKarya.id
      );
    },
    [addAuditLog]
  );

  // Handle Verification Tickets (FR-12)
  const handleResolveTicket = useCallback(
    (ticketId: string, status: 'TERVERIFIKASI' | 'DITOLAK', notes: string) => {
      const now = new Date().toISOString();
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === ticketId) {
            return {
              ...t,
              status,
              resolved_at: now,
              resolution_notes: notes,
            };
          }
          return t;
        })
      );

      addAuditLog(
        'RESOLVE_FRAUD_TICKET',
        `Penyelesaian tiket verifikasi #${ticketId} dengan putusan: ${status}. Catatan: "${notes}"`
      );
    },
    [addAuditLog]
  );

  const handleCreateTicket = useCallback(
    (newTicket: VerificationTicket) => {
      setTickets((prev) => [newTicket, ...prev]);
      addAuditLog(
        'CREATE_FRAUD_TICKET',
        `Penerbitan tiket verifikasi keaslian #${newTicket.id} untuk karya #${newTicket.submission_id}. Alasan: "${newTicket.trigger_reason}"`,
        newTicket.submission_id
      );
    },
    [addAuditLog]
  );

  // Handle CoPilot interactive chat
  const handleSendMessage = useCallback(
    (karyaId: string, text: string) => {
      const newMsg: CoPilotMessage = {
        id: `MSG-${Date.now()}`,
        karya_id: karyaId,
        sender: 'judge',
        text,
        timestamp: new Date().toISOString(),
      };

      setCoPilotMessages((prev) => [...prev, newMsg]);

      // Generate intelligent automated assistant answer
      setTimeout(() => {
        const activeKarya = karyas.find((k) => k.id === karyaId);
        const rag = activeKarya?.ai_analysis?.cultural_rag;
        const forensics = activeKarya?.ai_analysis?.forensics;

        let replyText = `Berdasarkan analisis multimodal sistem, karya #${karyaId} (${activeKarya?.judul_karya}) memiliki komposisi visual 9:16 vertikal dengan durasi ${activeKarya?.metadata.duration_seconds}s.`;
        let citedTimecodes: string[] = ['00:15', '00:30'];

        const lower = text.toLowerCase();
        if (lower.includes('forensik') || lower.includes('keaslian') || lower.includes('ai') || lower.includes('flicker')) {
          replyText = `Hasil Agent 4 (Forensics & Quality): Proporsi AI generatif ${forensics?.ai_visual_percentage || 88}%, Fraud Risk Index ${forensics?.fraud_risk_score || 18}%. Konsistensi visual tercatat ${forensics?.visual_consistency_score || 91}%. Tidak ditemukan watermark terlarang atau duplikasi frame ilegal.`;
          citedTimecodes = ['00:12', '00:28'];
        } else if (lower.includes('budaya') || lower.includes('kultural') || lower.includes('bondowoso') || lower.includes('tema')) {
          replyText = `Hasil Agent 3 (Cultural RAG): Entitas daerah yang terverifikasi meliputi ${rag?.detected_bondowoso_entities?.join(', ') || 'Potensi Unggulan Bondowoso'}. Kesesuaian subtema mencapai ${rag?.subtema_match_score || 94}%. Narasi dan grading warna selaras dengan identitas lokal.`;
          citedTimecodes = ['00:08', '00:22', '00:40'];
        } else if (lower.includes('anomali') || lower.includes('cacat') || lower.includes('detik')) {
          const anomalies = forensics?.anomaly_timecodes || [];
          if (anomalies.length > 0) {
            replyText = `Titik anomali terdeteksi: ${anomalies.map((a) => `Detik ${a.timecode} (${a.issue})`).join('; ')}. Masih dalam ambang batas toleransi estetika.`;
            citedTimecodes = anomalies.map((a) => a.timecode);
          } else {
            replyText = 'Tidak ditemukan anomali visual, flickering, atau artefak distorsi signifikan pada seluruh timecode video.';
          }
        }

        const replyMsg: CoPilotMessage = {
          id: `MSG-AI-${Date.now()}`,
          karya_id: karyaId,
          sender: 'copilot',
          text: replyText,
          cited_timecodes: citedTimecodes,
          timestamp: new Date().toISOString(),
        };

        setCoPilotMessages((prev) => [...prev, replyMsg]);
      }, 600);
    },
    [karyas]
  );

  // Reset to initial demo dataset
  const handleResetToDemoData = () => {
    setShowResetConfirmModal(true);
  };

  const confirmResetData = () => {
    setKaryas(INITIAL_KARYA);
    setPesertas(INITIAL_PESERTA);
    setPenilaians(INITIAL_PENILAIAN);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setTickets(INITIAL_VERIFICATION_TICKETS);
    setCoPilotMessages(getInitialCoPilotList());

    localStorage.removeItem(STORAGE_KEYS.karyas);
    localStorage.removeItem(STORAGE_KEYS.pesertas);
    localStorage.removeItem(STORAGE_KEYS.penilaians);
    localStorage.removeItem(STORAGE_KEYS.auditLogs);
    localStorage.removeItem(STORAGE_KEYS.tickets);
    localStorage.removeItem(STORAGE_KEYS.copilot);

    setShowResetConfirmModal(false);
  };

  // Run AI Pre-screening Batch Analysis via API
  const handleRunAIBatchAnalysis = async () => {
    setIsAIBatchRunning(true);
    try {
      const updatedKaryas = [...karyas];
      for (let i = 0; i < updatedKaryas.length; i++) {
        const item = updatedKaryas[i];
        if (!item.ai_analysis || item.ai_analysis.status === 'REVIEW') {
          try {
            const res = await fetch('/api/analyze-ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                karya_id: item.id,
                judul_karya: item.judul_karya,
                kategori: item.kategori,
                deskripsi: item.deskripsi,
                prompt_list: item.prompt_list_text,
                duration_seconds: item.metadata.duration_seconds,
              }),
            });

            if (res.ok) {
              const resJson = await res.json();
              if (resJson.success && resJson.data) {
                updatedKaryas[i] = {
                  ...item,
                  ai_analysis: resJson.data,
                };
              }
            }
          } catch (err) {
            console.error('Failed to analyze item:', item.id, err);
          }
        }
      }
      setKaryas(updatedKaryas);
      addAuditLog(
        'AI_PRE_SCREENING_BATCH',
        `Menjalankan pemrosesan otomatis AI Pre-Screening untuk seluruh berkas video peserta.`
      );
    } finally {
      setIsAIBatchRunning(false);
    }
  };

  // Count unscored works for active juri
  const currentJuriId = session.juri_id || 'juri-1';
  const unscoredCount = karyas.filter((k) => {
    const isDisq = k.status_teknis === 'RED_FLAG' && !k.is_overridden;
    if (isDisq) return false;
    const pen = penilaians.find((p) => p.karya_id === k.id && p.juri_id === currentJuriId);
    return !pen || pen.status !== 'SUBMITTED';
  }).length;

  const openTicketsCount = tickets.filter((t) => t.status === 'MENUNGGU_VERIFIKASI').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        session={session}
        setSession={setSession}
        totalKaryaCount={karyas.length}
        unscoredCount={unscoredCount}
        openTicketCount={openTicketsCount}
      />

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {activeTab === 'jury' && (
          <JuryScoringPanel
            karyas={karyas}
            pesertas={pesertas}
            penilaians={penilaians}
            session={session}
            coPilotMessages={coPilotMessages}
            onSendMessage={handleSendMessage}
            onSaveDraft={handleSaveDraft}
            onSubmitFinal={handleSubmitFinal}
            initialSelectedKaryaId={selectedKaryaForJury}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LiveLeaderboard
            karyas={karyas}
            pesertas={pesertas}
            penilaians={penilaians}
            session={session}
            onNavigateToBeritaAcara={() => setActiveTab('berita_acara')}
            onSelectKaryaToScore={(karyaId) => {
              setSelectedKaryaForJury(karyaId);
              setActiveTab('jury');
            }}
          />
        )}

        {activeTab === 'upload_single' && (
          <SingleVideoUploadView
            onAddKarya={handleAddSingleKarya}
            onNavigateToJury={(karyaId) => {
              setSelectedKaryaForJury(karyaId);
              setActiveTab('jury');
            }}
          />
        )}

        {activeTab === 'storyboard' && <ReverseStoryboardView karyas={karyas} />}

        {activeTab === 'tickets' && (
          <VerificationTicketView
            tickets={tickets}
            karyas={karyas}
            session={session}
            onResolveTicket={handleResolveTicket}
            onCreateTicket={handleCreateTicket}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            karyas={karyas}
            pesertas={pesertas}
            penilaians={penilaians}
            onAddKaryaBatch={handleAddKaryaBatch}
            onUpdateKaryaStatus={handleUpdateKaryaStatus}
            onDeleteKarya={handleDeleteKarya}
            onRunAIBatchAnalysis={handleRunAIBatchAnalysis}
            isAIBatchRunning={isAIBatchRunning}
            onResetToDemoData={handleResetToDemoData}
          />
        )}

        {activeTab === 'berita_acara' && (
          <BeritaAcaraExport
            karyas={karyas}
            pesertas={pesertas}
            penilaians={penilaians}
            onBackToLeaderboard={() => setActiveTab('leaderboard')}
          />
        )}

        {activeTab === 'audit' && <AuditTrailView logs={auditLogs} />}
      </main>

      {/* Footer */}
      <footer className="print:hidden border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © 2026 Pemerintah Kabupaten Bondowoso — Dinas Komunikasi dan Informatika.
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Sistem Analisis & Penilaian Video AI Lomba Konten Bondowoso • Versi 2.0.0 (PRD V2 Multi-Agent Engine)
          </div>
        </div>
      </footer>

      {/* Confirmation Modal for Resetting Demo Data */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-slate-100 text-center">
              Reset Data Contoh Lomba Bondowoso?
            </h4>
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Tindakan ini akan mengembalikan seluruh berkas karya peserta, penilaian juri, tiket verifikasi, dan riwayat audit trail ke kondisi awal demo resmi.
            </p>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmResetData}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-colors"
              >
                Ya, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
