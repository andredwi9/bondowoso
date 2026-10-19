import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
  User,
  Plus,
  Send,
  Eye,
  Check,
  X,
  FileSearch,
} from 'lucide-react';
import { VerificationTicket, Karya, UserRoleSession } from '../types/index.ts';

interface VerificationTicketViewProps {
  tickets: VerificationTicket[];
  karyas: Karya[];
  session: UserRoleSession;
  onResolveTicket: (ticketId: string, status: 'TERVERIFIKASI' | 'DITOLAK', notes: string) => void;
  onCreateTicket: (newTicket: VerificationTicket) => void;
}

export const VerificationTicketView: React.FC<VerificationTicketViewProps> = ({
  tickets,
  karyas,
  session,
  onResolveTicket,
  onCreateTicket,
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(tickets[0]?.id || null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New ticket form
  const [selectedKaryaId, setSelectedKaryaId] = useState<string>(karyas[0]?.id || '');
  const [customReason, setCustomReason] = useState('');

  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const handleResolve = (status: 'TERVERIFIKASI' | 'DITOLAK') => {
    if (!activeTicket) return;
    onResolveTicket(activeTicket.id, status, resolutionNotes || 'Verifikasi diselesaikan oleh panitia/dewan juri.');
    setResolutionNotes('');
  };

  const handleCreateNewTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const karya = karyas.find((k) => k.id === selectedKaryaId);
    if (!karya) return;

    const newTicket: VerificationTicket = {
      id: `TCK-${Date.now().toString().slice(-4)}`,
      submission_id: karya.id,
      karya_title: karya.judul_karya,
      participant_name: karya.peserta_id,
      trigger_reason: customReason || 'Pemeriksaan keaslian aset AI dan orisinalitas proses pembuatan atas instruksi Dewan Juri.',
      requested_files: ['Screenshot Prompt History', 'Image Anchor Mentah', 'File Project AI'],
      fraud_risk_score: karya.ai_analysis?.forensics?.fraud_risk_score || 35,
      agent_score: karya.ai_analysis?.score || 85,
      status: 'MENUNGGU_VERIFIKASI',
      created_at: new Date().toISOString(),
    };

    onCreateTicket(newTicket);
    setShowCreateModal(false);
    setSelectedTicketId(newTicket.id);
    setCustomReason('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Juknis Bab III Poin C.6 & FR-12
            </span>
            <span className="text-xs text-slate-400 font-mono">
              On-Demand Verification Ticket Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1">
            Tiket Verifikasi Keaslian & Kliring Bukti Karya (Anti-Fraud)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dipicu secara otonom oleh Agent 5 apabila karya masuk nominasi juara (Skor &gt; 85.0) namun memiliki Fraud Risk Index &gt; 40%, atau diterbitkan manual oleh Dewan Juri.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          type="button"
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Terbitkan Tiket Baru</span>
        </button>
      </div>

      {/* Main Ticket Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Daftar Tiket Aktif ({tickets.length})
            </h3>
          </div>

          <div className="space-y-2.5">
            {tickets.map((t) => {
              const isSelected = t.id === (activeTicket?.id || '');
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-500 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-amber-400 font-bold">#{t.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === 'TERVERIFIKASI'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : t.status === 'DITOLAK'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-slate-100 mt-1 truncate">
                    {t.karya_title}
                  </h4>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Karya #{t.submission_id} • Fraud Index: <span className="text-amber-300 font-semibold">{t.fraud_risk_score}%</span>
                  </div>
                </div>
              );
            })}

            {tickets.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-6">
                Tidak ada tiket verifikasi keaslian aktif saat ini.
              </p>
            )}
          </div>
        </div>

        {/* Ticket Details & Action Panel (7 cols) */}
        {activeTicket ? (
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                  Tiket #{activeTicket.id}
                </span>
                <h3 className="text-base font-black text-slate-100 mt-0.5">
                  {activeTicket.karya_title}
                </h3>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  activeTicket.status === 'TERVERIFIKASI'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : activeTicket.status === 'DITOLAK'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                }`}
              >
                {activeTicket.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Trigger Reason Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <span className="font-bold text-slate-300 block">Dasar Pemanggilan Verifikasi:</span>
              <p className="text-slate-300 leading-relaxed italic bg-black/30 p-2.5 rounded-lg border border-slate-800">
                "{activeTicket.trigger_reason}"
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="bg-slate-900 p-2 rounded">
                  <span className="text-slate-400 block">Skor Rekomendasi AI:</span>
                  <span className="font-bold text-indigo-400">{activeTicket.agent_score.toFixed(2)} / 100</span>
                </div>
                <div className="bg-slate-900 p-2 rounded">
                  <span className="text-slate-400 block">Indeks Risiko Fraud:</span>
                  <span className="font-bold text-amber-400">{activeTicket.fraud_risk_score}%</span>
                </div>
              </div>
            </div>

            {/* Requested Files List */}
            <div className="text-xs space-y-2">
              <span className="font-bold text-slate-300 block">Dokumen & Bukti yang Diminta kepada Peserta:</span>
              <div className="space-y-1.5">
                {activeTicket.requested_files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center space-x-2 bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-slate-300 text-[11px]"
                  >
                    <FileSearch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{file}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution Section */}
            {activeTicket.status === 'MENUNGGU_VERIFIKASI' ? (
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300 block">
                  Keputusan Verifikasi Panitia / Dewan Juri:
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan hasil klarifikasi berkas bukti dari peserta..."
                  className="w-full bg-slate-950 text-slate-200 text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => handleResolve('DITOLAK')}
                    className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Tolak / Bukti Tidak Sah</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve('TERVERIFIKASI')}
                    className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Sahkan Orisinalitas (Lolos)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                <span className="text-slate-400 block">Status Putusan:</span>
                <p className="text-slate-200 font-medium">
                  {activeTicket.resolution_notes || 'Tiket telah diselesaikan secara sah.'}
                </p>
                {activeTicket.resolved_at && (
                  <span className="text-[10px] text-slate-500 font-mono block">
                    Diselesaikan pada: {new Date(activeTicket.resolved_at).toLocaleString('id-ID')}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-slate-100">
              Terbitkan Tiket Verifikasi Keaslian Baru
            </h4>

            <form onSubmit={handleCreateNewTicket} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Pilih Karya Peserta:</label>
                <select
                  value={selectedKaryaId}
                  onChange={(e) => setSelectedKaryaId(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {karyas.map((k) => (
                    <option key={k.id} value={k.id}>
                      #{k.id} - {k.judul_karya} ({k.kategori})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Alasan Permintaan Bukti:</label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Dewan Juri menemukan indikasi footage stock pada detik 00:20..."
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors"
                >
                  Terbitkan Tiket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
