import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Users,
  Eye,
  EyeOff,
  Flame,
  ArrowUpDown,
  MessageSquare,
} from 'lucide-react';
import {
  Karya,
  LeaderboardEntry,
  PenilaianJuri,
  Peserta,
  UserRoleSession,
} from '../types/index.ts';
import { buildLeaderboardEntries } from '../utils/scoring.ts';

interface LiveLeaderboardProps {
  karyas: Karya[];
  pesertas: Record<string, Peserta>;
  penilaians: PenilaianJuri[];
  session: UserRoleSession;
  onNavigateToBeritaAcara: () => void;
  onSelectKaryaToScore?: (karyaId: string) => void;
  onOpenExportComments?: (karyaId?: string) => void;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  karyas,
  pesertas,
  penilaians,
  session,
  onNavigateToBeritaAcara,
  onSelectKaryaToScore,
  onOpenExportComments,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedKategori, setSelectedKategori] = useState<string>('Semua');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lolos' | 'red_flag' | 'terpenuhi_5_aspek'>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Real-time calculation of rankings (< 2s update AC-04)
  const entries: LeaderboardEntry[] = useMemo(() => {
    return buildLeaderboardEntries(karyas, pesertas, penilaians);
  }, [karyas, pesertas, penilaians]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Category filter
      if (selectedKategori !== 'Semua' && entry.karya.kategori !== selectedKategori) {
        return false;
      }

      // Status filter
      if (statusFilter === 'lolos' && entry.is_disqualified) {
        return false;
      }
      if (statusFilter === 'red_flag' && !entry.is_disqualified) {
        return false;
      }
      if (statusFilter === 'terpenuhi_5_aspek' && !entry.semua_juri_selesai) {
        return false;
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchId = entry.karya.id.toLowerCase().includes(q);
        const matchTitle = entry.karya.judul_karya.toLowerCase().includes(q);
        const matchPeserta = entry.peserta.nama.toLowerCase().includes(q);
        return matchId || matchTitle || matchPeserta;
      }

      return true;
    });
  }, [entries, selectedKategori, statusFilter, searchQuery]);

  // Top 3 Podium (from non-disqualified entries)
  const nonDisqualified = entries.filter((e) => !e.is_disqualified);
  const firstPlace = nonDisqualified[0];
  const secondPlace = nonDisqualified[1];
  const thirdPlace = nonDisqualified[2];

  // Export to CSV function
  const handleExportCSV = () => {
    const headers = [
      'Peringkat',
      'ID Karya',
      'Judul Karya',
      'Nama Peserta',
      'Kategori',
      'Skor AI',
      'Status AI',
      'Skor Juri Rata-Rata',
      'Total Akhir (80% Juri + 20% AI)',
      'Status Kelayakan',
    ];

    const rows = entries.map((e) => [
      e.is_disqualified ? 'DISKUALIFIKASI' : e.rank,
      e.karya.id,
      `"${e.karya.judul_karya.replace(/"/g, '""')}"`,
      `"${e.peserta.nama.replace(/"/g, '""')}"`,
      e.karya.kategori,
      e.skor_ai.toFixed(2),
      e.skor_ai_pass ? 'PASS' : 'REVIEW',
      e.skor_juri_avg.toFixed(2),
      e.total_akhir.toFixed(2),
      e.is_disqualified ? 'Diskualifikasi Teknis' : 'Lolos',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekapitulasi_nilai_lomba_video_ai_bondowoso_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header and Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Live Leaderboard Realtime
            </span>
            <span className="text-xs text-emerald-400 font-mono">
              ⚡ Sinkronisasi Urutan &lt; 2 Detik (AC-04)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1">
            Papan Peringkat Resmi & Akumulasi Nilai Terbobot
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Skor Akhir dihitung terstandar: (80% Skor Rata-rata Dewan Juri) + (20% Skor Pre-Screening AI).
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onOpenExportComments ? onOpenExportComments() : undefined}
            type="button"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 text-xs font-bold border border-indigo-700/60 transition-colors shadow-sm"
            title="Ekspor semua komentar dan justifikasi dewan juri tiap video"
          >
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Ekspor Komentar Juri</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300">
              {penilaians.length}
            </span>
          </button>
          <button
            onClick={handleExportCSV}
            type="button"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Ekspor CSV Rekap</span>
          </button>
          <button
            onClick={onNavigateToBeritaAcara}
            type="button"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Berita Acara PDF</span>
          </button>
        </div>
      </div>

      {/* TOP 3 PODIUM DISPLAY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Juara 2 (Perak) */}
        {secondPlace && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between order-2 md:order-1 shadow-lg hover:border-slate-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-400/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-700/80 text-slate-200 border border-slate-500/40 flex items-center gap-1">
                  <Medal className="w-3.5 h-3.5 text-slate-300" /> JUARA 2 (PERAK)
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">
                  #{secondPlace.karya.id}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-100 mt-3 truncate">
                {session.blind_review_mode ? `Karya ${secondPlace.karya.id}` : secondPlace.karya.judul_karya}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {session.blind_review_mode ? 'Identitas Disamarkan' : secondPlace.peserta.nama} • {secondPlace.karya.kategori}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
              <div className="text-xs text-slate-400">
                Juri: <span className="font-semibold text-slate-200">{secondPlace.skor_juri_avg.toFixed(2)}</span> | AI: <span className="font-semibold text-emerald-400">{secondPlace.skor_ai}</span>
              </div>
              <div className="text-xl font-black text-slate-200">
                {secondPlace.total_akhir.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Juara 1 (Emas - Center & Highlighted) */}
        {firstPlace && (
          <div className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between order-1 md:order-2 shadow-2xl shadow-amber-500/10 ring-2 ring-amber-500/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-lg text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                  <Trophy className="w-4 h-4 text-amber-400 animate-bounce" /> JUARA 1 (EMAS)
                </span>
                <span className="text-xs font-black text-amber-400 font-mono">
                  #{firstPlace.karya.id}
                </span>
              </div>

              <h4 className="text-lg font-black text-slate-100 mt-3 truncate">
                {session.blind_review_mode ? `Karya ${firstPlace.karya.id}` : firstPlace.karya.judul_karya}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {session.blind_review_mode ? 'Identitas Disamarkan' : firstPlace.peserta.nama} • {firstPlace.karya.kategori}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-baseline justify-between">
              <div className="text-xs text-slate-300">
                Juri: <span className="font-bold text-white">{firstPlace.skor_juri_avg.toFixed(2)}</span> | AI: <span className="font-bold text-emerald-400">{firstPlace.skor_ai}</span>
              </div>
              <div className="text-3xl font-black text-amber-400">
                {firstPlace.total_akhir.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Juara 3 (Perunggu) */}
        {thirdPlace && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between order-3 shadow-lg hover:border-slate-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-700/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-900/40 text-amber-300 border border-amber-700/40 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-500" /> JUARA 3 (PERUNGGU)
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">
                  #{thirdPlace.karya.id}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-100 mt-3 truncate">
                {session.blind_review_mode ? `Karya ${thirdPlace.karya.id}` : thirdPlace.karya.judul_karya}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {session.blind_review_mode ? 'Identitas Disamarkan' : thirdPlace.peserta.nama} • {thirdPlace.karya.kategori}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
              <div className="text-xs text-slate-400">
                Juri: <span className="font-semibold text-slate-200">{thirdPlace.skor_juri_avg.toFixed(2)}</span> | AI: <span className="font-semibold text-emerald-400">{thirdPlace.skor_ai}</span>
              </div>
              <div className="text-xl font-black text-amber-200">
                {thirdPlace.total_akhir.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar (Section 9) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari ID karya, judul, atau nama peserta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {['Semua', 'Pariwisata', 'Budaya', 'Kuliner', 'Ekonomi Kreatif'].map((kat) => (
              <button
                key={kat}
                onClick={() => setSelectedKategori(kat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedKategori === kat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {kat}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filters: Lolos Validasi, Red Flag, Terpenuhi 5 Aspek */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Status:
          </span>

          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-200 text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({entries.length})
          </button>

          <button
            onClick={() => setStatusFilter('lolos')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'lolos'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-emerald-300'
            }`}
          >
            Lolos Validasi ({entries.filter((e) => !e.is_disqualified).length})
          </button>

          <button
            onClick={() => setStatusFilter('red_flag')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'red_flag'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-rose-300'
            }`}
          >
            Red Flag / Diskualifikasi ({entries.filter((e) => e.is_disqualified).length})
          </button>

          <button
            onClick={() => setStatusFilter('terpenuhi_5_aspek')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'terpenuhi_5_aspek'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-indigo-300'
            }`}
          >
            Terpenuhi 3 Dewan Juri ({entries.filter((e) => e.semua_juri_selesai).length})
          </button>
        </div>
      </div>

      {/* Main Leaderboard Table (PRD Section 9 preview layout) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-850 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Judul Karya & Peserta</th>
                <th className="py-3 px-4 w-32">Kategori</th>
                <th className="py-3 px-4 w-32 text-center">Skor AI</th>
                <th className="py-3 px-4 w-32 text-center">Skor Juri</th>
                <th className="py-3 px-4 w-32 text-right">Total Akhir</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4 w-20 text-center">Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {filteredEntries.map((entry) => {
                const isExpanded = expandedRowId === entry.karya.id;
                const isTop1 = entry.rank === 1 && !entry.is_disqualified;
                const isTop2 = entry.rank === 2 && !entry.is_disqualified;
                const isTop3 = entry.rank === 3 && !entry.is_disqualified;

                return (
                  <React.Fragment key={entry.karya.id}>
                    <tr
                      className={`hover:bg-slate-800/60 transition-colors ${
                        entry.is_disqualified
                          ? 'bg-rose-950/20 text-slate-400'
                          : isTop1
                          ? 'bg-amber-950/20'
                          : ''
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="py-3.5 px-4 text-center font-bold">
                        {entry.is_disqualified ? (
                          <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-mono">
                            DISQ
                          </span>
                        ) : isTop1 ? (
                          <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-900 font-black inline-flex items-center justify-center shadow-md">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black inline-flex items-center justify-center shadow-md">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="w-7 h-7 rounded-full bg-amber-700 text-white font-black inline-flex items-center justify-center shadow-md">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">
                            {entry.rank.toString().padStart(2, '0')}
                          </span>
                        )}
                      </td>

                      {/* Judul Karya & Peserta */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-indigo-400 font-bold">
                            #{entry.karya.id}
                          </span>
                          <span className="font-bold text-slate-100">
                            {session.blind_review_mode ? `Karya #${entry.karya.id}` : entry.karya.judul_karya}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                          <span>
                            {session.blind_review_mode ? (
                              <span className="text-amber-400 italic">[Blind Review Aktif]</span>
                            ) : (
                              `${entry.peserta.nama} (${entry.peserta.instansi || 'Bondowoso'})`
                            )}
                          </span>
                          <span>•</span>
                          <span>{entry.karya.metadata.duration_seconds}s</span>
                        </div>
                      </td>

                      {/* Kategori */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {entry.karya.kategori}
                        </span>
                      </td>

                      {/* Skor AI */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-200 font-mono">
                          {entry.skor_ai > 0 ? entry.skor_ai.toFixed(1) : '-'}
                        </div>
                        {entry.skor_ai > 0 && (
                          <span className={`text-[10px] font-bold ${entry.skor_ai_pass ? 'text-emerald-400' : 'text-amber-400'}`}>
                            ({entry.skor_ai_pass ? 'PASS' : 'REVIEW'})
                          </span>
                        )}
                      </td>

                      {/* Skor Juri */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {entry.skor_juri_avg > 0 ? (
                          <span className="font-bold text-slate-200">
                            {entry.skor_juri_avg.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Belum dinilai</span>
                        )}
                        <div className="text-[10px] text-slate-400">
                          {entry.juri_scores.filter((j) => j.submitted).length} / 3 Juri
                        </div>
                      </td>

                      {/* Total Akhir */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {entry.is_disqualified ? (
                          <span className="font-bold text-rose-400">0.00</span>
                        ) : entry.total_akhir > 0 ? (
                          <span className="text-base font-black text-amber-400">
                            {entry.total_akhir.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {entry.is_disqualified ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Gugur Teknis
                          </span>
                        ) : entry.karya.is_overridden ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Lolos (Override)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Lolos
                          </span>
                        )}
                      </td>

                      {/* Expand / Action Button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setExpandedRowId(isExpanded ? null : entry.karya.id)}
                          className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
                          title="Lihat rincian 5 aspek juri"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Breakdown Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-950/90 border-b border-slate-800">
                        <td colSpan={8} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Jury Scores Breakdown */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="font-bold text-xs uppercase tracking-wider text-indigo-400">
                                  Rincian Penilaian Dewan Juri:
                                </h5>
                                {penilaians.filter((p) => p.karya_id === entry.karya.id).length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenExportComments ? onOpenExportComments(entry.karya.id) : undefined}
                                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-[11px] font-semibold border border-indigo-800/80 transition-colors"
                                    title="Ekspor komentar juri untuk video ini"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Ekspor Komentar Video Ini</span>
                                  </button>
                                )}
                              </div>
                              <div className="space-y-2">
                                {penilaians
                                  .filter((p) => p.karya_id === entry.karya.id)
                                  .map((p, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1"
                                    >
                                      <div className="flex justify-between items-center font-semibold text-slate-200">
                                        <span>{p.juri_nama}</span>
                                        <span className="text-amber-400 font-mono font-bold">
                                          Total: {p.total_skor.toFixed(2)} / 100
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-5 gap-1 text-[10px] text-center pt-1">
                                        <div className="bg-slate-950 p-1 rounded">
                                          <div className="text-slate-400">Tema (25%)</div>
                                          <div className="font-bold text-slate-200">{p.skor_tema}</div>
                                        </div>
                                        <div className="bg-slate-950 p-1 rounded">
                                          <div className="text-slate-400">Kreativ (20%)</div>
                                          <div className="font-bold text-slate-200">{p.skor_kreativitas}</div>
                                        </div>
                                        <div className="bg-slate-950 p-1 rounded">
                                          <div className="text-slate-400">Visual (20%)</div>
                                          <div className="font-bold text-slate-200">{p.skor_visual_ai}</div>
                                        </div>
                                        <div className="bg-slate-950 p-1 rounded">
                                          <div className="text-slate-400">Editing (20%)</div>
                                          <div className="font-bold text-slate-200">{p.skor_editing}</div>
                                        </div>
                                        <div className="bg-slate-950 p-1 rounded">
                                          <div className="text-slate-400">Audio (15%)</div>
                                          <div className="font-bold text-slate-200">{p.skor_audio}</div>
                                        </div>
                                      </div>
                                      {p.catatan_evaluasi && (
                                        <div className="text-[11px] text-slate-300 italic pt-1">
                                          "{p.catatan_evaluasi}"
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                {penilaians.filter((p) => p.karya_id === entry.karya.id).length === 0 && (
                                  <p className="text-xs text-slate-500 italic">
                                    Belum ada skor yang dimasukkan oleh dewan juri untuk karya ini.
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Technical & AI Pre-Screening Summary */}
                            <div className="space-y-2">
                              <h5 className="font-bold text-xs uppercase tracking-wider text-amber-400">
                                Status Teknis & Pre-Screening AI:
                              </h5>
                              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Dimensi & Rasio:</span>
                                  <span className="font-mono text-slate-200">
                                    {entry.karya.metadata.width}x{entry.karya.metadata.height} (9:16)
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Durasi Video:</span>
                                  <span className="font-mono text-slate-200">
                                    {entry.karya.metadata.duration_seconds} detik
                                  </span>
                                </div>
                                {entry.karya.ai_analysis && (
                                  <div>
                                    <span className="text-slate-400 block mb-1">Entitas Kultural Bondowoso:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {entry.karya.ai_analysis.cultural_rag?.detected_bondowoso_entities?.map((ent: string, idx: number) => (
                                        <span
                                          key={idx}
                                          className="bg-indigo-950/70 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800/80"
                                        >
                                          {ent}
                                        </span>
                                      )) || (
                                        <span className="text-slate-500 text-[10px] italic">Basis data kultural terverifikasi</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {entry.is_disqualified && (
                                  <div className="bg-rose-950/60 p-2 rounded text-rose-300 text-[11px] border border-rose-800">
                                    <strong>Penyebab Diskualifikasi:</strong> {entry.karya.status_teknis_reasons.join(', ')}
                                  </div>
                                )}
                                {entry.karya.is_overridden && (
                                  <div className="bg-emerald-950/60 p-2 rounded text-emerald-300 text-[11px] border border-emerald-800">
                                    <strong>Admin Override:</strong> {entry.karya.override_reason} (Oleh: {entry.karya.override_by})
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
