import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Copy,
  Printer,
  Check,
  Search,
  Filter,
  MessageSquare,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { Karya, PenilaianJuri, Peserta } from '../types/index.ts';
import {
  generateCommentsCSV,
  generateCommentsJSON,
  generateCommentsTextSummary,
  triggerFileDownload,
  extractCommentRows,
  exportCommentsDirectXLSX,
  exportCommentsDirectPDF,
} from '../utils/exportComments.ts';

interface ExportCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  karyas: Karya[];
  pesertas: Record<string, Peserta>;
  penilaians: PenilaianJuri[];
  initialFilterKaryaId?: string | null;
}

export const ExportCommentsModal: React.FC<ExportCommentsModalProps> = ({
  isOpen,
  onClose,
  karyas,
  pesertas,
  penilaians,
  initialFilterKaryaId = null,
}) => {
  const [selectedKaryaId, setSelectedKaryaId] = useState<string | null>(initialFilterKaryaId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedKategori, setSelectedKategori] = useState<string>('Semua');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Sync initialFilterKaryaId when changed
  React.useEffect(() => {
    setSelectedKaryaId(initialFilterKaryaId);
  }, [initialFilterKaryaId]);

  // Filter karyas that actually have evaluations
  const scoredKaryas = useMemo(() => {
    return karyas.filter((k) => penilaians.some((p) => p.karya_id === k.id));
  }, [karyas, penilaians]);

  // Filtered karyas based on controls
  const filteredKaryas = useMemo(() => {
    return scoredKaryas.filter((karya) => {
      if (selectedKaryaId && karya.id !== selectedKaryaId) {
        return false;
      }
      if (selectedKategori !== 'Semua' && karya.kategori !== selectedKategori) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchId = karya.id.toLowerCase().includes(q);
        const matchTitle = karya.judul_karya.toLowerCase().includes(q);
        const matchPeserta = pesertas[karya.peserta_id]?.nama.toLowerCase().includes(q);
        const matchKomentar = penilaians
          .filter((p) => p.karya_id === karya.id)
          .some(
            (p) =>
              p.catatan_evaluasi.toLowerCase().includes(q) ||
              p.juri_nama.toLowerCase().includes(q)
          );
        return matchId || matchTitle || Boolean(matchPeserta) || matchKomentar;
      }
      return true;
    });
  }, [scoredKaryas, selectedKaryaId, selectedKategori, searchQuery, pesertas, penilaians]);

  const totalComments = useMemo(() => {
    return penilaians.filter((p) => karyas.some((k) => k.id === p.karya_id)).length;
  }, [penilaians, karyas]);

  if (!isOpen) return null;

  // Handlers for exporting

  // 1. Export langsung Spreadsheet Tabel Excel (.xlsx) dengan multi-sheet
  const handleDownloadXLSX = (karyaId?: string) => {
    try {
      const targetId = karyaId || (selectedKaryaId || undefined);
      const filename = exportCommentsDirectXLSX(karyas, pesertas, penilaians, targetId);
      setDownloadNotice(`✓ Berkas spreadsheet tabel "${filename}" berhasil diunduh langsung.`);
      setTimeout(() => setDownloadNotice(null), 4500);
    } catch (err: any) {
      console.error('XLSX export failed:', err);
    }
  };

  // 2. Export langsung Dokumen Resmi PDF (.pdf) dengan Kop Surat & AutoTable
  const handleDownloadDirectPDF = (karyaId?: string) => {
    try {
      const targetId = karyaId || (selectedKaryaId || undefined);
      const filename = exportCommentsDirectPDF(karyas, pesertas, penilaians, targetId);
      setDownloadNotice(`✓ Dokumen PDF resmi "${filename}" berhasil digenerate dan diunduh langsung.`);
      setTimeout(() => setDownloadNotice(null), 4500);
    } catch (err: any) {
      console.error('PDF export failed:', err);
    }
  };

  const handleDownloadCSV = (karyaId?: string) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const targetId = karyaId || (selectedKaryaId || undefined);
    const filename = targetId
      ? `komentar_karya_${targetId}_bondowoso_${timestamp}.csv`
      : `rekap_semua_komentar_juri_video_ai_bondowoso_${timestamp}.csv`;

    const csvContent = generateCommentsCSV(karyas, pesertas, penilaians, targetId);
    triggerFileDownload(csvContent, filename, 'text/csv;charset=utf-8');
    setDownloadNotice(`✓ Berkas CSV "${filename}" berhasil diunduh.`);
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  const handleDownloadJSON = (karyaId?: string) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const targetId = karyaId || (selectedKaryaId || undefined);
    const filename = targetId
      ? `komentar_karya_${targetId}_bondowoso_${timestamp}.json`
      : `rekap_semua_komentar_juri_video_ai_bondowoso_${timestamp}.json`;

    const jsonContent = generateCommentsJSON(karyas, pesertas, penilaians, targetId);
    triggerFileDownload(jsonContent, filename, 'application/json');
    setDownloadNotice(`✓ Berkas data JSON "${filename}" berhasil diunduh.`);
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  const handleCopyText = (karyaId?: string) => {
    const targetId = karyaId || (selectedKaryaId || undefined);
    const text = generateCommentsTextSummary(karyas, pesertas, penilaians, targetId);
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleCardExpand = (karyaId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [karyaId]: !prev[karyaId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Laporan Hasil Evaluasi
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Bondowoso AI Competition 2026
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight mt-0.5">
                Ekspor Semua Komentar & Evaluasi Tiap Video yang Dinilai
              </h2>
              <p className="text-xs text-slate-400">
                Unduh rekapitulasi lengkap catatan juri, justifikasi 5 aspek penilaian, serta analisis multi-agent AI dalam format CSV, JSON, atau cetak PDF.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Global Action Bar */}
        <div className="p-4 sm:p-6 bg-slate-950/60 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2">
              <div className="text-[10px] uppercase font-bold text-slate-400">Video Dinilai</div>
              <div className="text-lg font-black text-slate-100 font-mono mt-0.5">
                {scoredKaryas.length} <span className="text-xs font-normal text-slate-400">Karya</span>
              </div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Komentar</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                {totalComments} <span className="text-xs font-normal text-slate-400">Ulasan</span>
              </div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2">
              <div className="text-[10px] uppercase font-bold text-slate-400">Aspek Tinjauan</div>
              <div className="text-lg font-black text-indigo-400 font-mono mt-0.5">
                5 <span className="text-xs font-normal text-slate-400">Kriteria V2</span>
              </div>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary 1: Tabel Spreadsheet .XLSX */}
            <button
              type="button"
              onClick={() => handleDownloadXLSX()}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02]"
              title="Unduh berkas spreadsheet tabel Excel (.xlsx) dengan matriks nilai 5 kriteria dan leaderboard"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Tabel Spreadsheet (.XLSX)</span>
            </button>

            {/* Primary 2: Export Langsung PDF */}
            <button
              type="button"
              onClick={() => handleDownloadDirectPDF()}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition-all hover:scale-[1.02]"
              title="Export langsung dokumen resmi PDF Berita Acara & Rekapitulasi dengan Kop Surat Resmi"
            >
              <FileDown className="w-4 h-4" />
              <span>Export Langsung PDF</span>
            </button>

            {/* Secondary 3: CSV */}
            <button
              type="button"
              onClick={() => handleDownloadCSV()}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              title="Unduh format CSV RFC 4180 dengan UTF-8 BOM"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            {/* Secondary 4: JSON */}
            <button
              type="button"
              onClick={() => handleDownloadJSON()}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              title="Unduh berkas JSON terstruktur"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>JSON</span>
            </button>

            {/* Copy Summary */}
            <button
              type="button"
              onClick={() => handleCopyText()}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                copiedSuccess
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>Salin Teks</span>
                </>
              )}
            </button>

            {/* Browser Print Dialog */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              title="Buka dialog cetak browser"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Download notification banner */}
        {downloadNotice && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{downloadNotice}</span>
          </div>
        )}

        {/* Search, Filter & View Toggle Bar */}
        <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari karya, peserta, juri, atau kata kunci..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="bg-slate-950 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Pariwisata">Pariwisata</option>
              <option value="Budaya">Budaya</option>
              <option value="Kuliner">Kuliner</option>
              <option value="Ekonomi Kreatif">Ekonomi Kreatif</option>
              <option value="Potensi Desa">Potensi Desa</option>
            </select>

            {/* If a specific video is filtered */}
            {selectedKaryaId && (
              <div className="flex items-center space-x-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-xl text-xs">
                <span>Filter Video: #{selectedKaryaId}</span>
                <button
                  type="button"
                  onClick={() => setSelectedKaryaId(null)}
                  className="hover:text-white"
                  title="Lihat semua video"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tampilan Kartu
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tabel Matriks
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {filteredKaryas.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-300">
                Tidak ada komentar video yang cocok
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {scoredKaryas.length === 0
                  ? 'Belum ada video yang dinilai oleh Dewan Juri. Berikan penilaian pada Dashboard Juri terlebih dahulu.'
                  : 'Coba ubah kata kunci pencarian atau bersihkan filter kategori.'}
              </p>
            </div>
          ) : viewMode === 'cards' ? (
            /* Card View */
            <div className="space-y-6">
              {filteredKaryas.map((karya) => {
                const peserta = pesertas[karya.peserta_id];
                const karyaPenilaians = penilaians.filter((p) => p.karya_id === karya.id);
                const avgJuryScore =
                  karyaPenilaians.length > 0
                    ? karyaPenilaians.reduce((acc, curr) => acc + curr.total_skor, 0) /
                      karyaPenilaians.length
                    : 0;
                const isExpanded = expandedCards[karya.id] ?? true;

                return (
                  <div
                    key={karya.id}
                    className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4 transition-all"
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-black font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            #{karya.id}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            {karya.kategori}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs font-mono text-slate-400">
                            Durasi: {karya.metadata.duration_seconds}s
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-100 mt-1">
                          {karya.judul_karya}
                        </h3>

                        <p className="text-xs text-slate-400 mt-0.5">
                          Peserta: <strong className="text-slate-200">{peserta?.nama}</strong>{' '}
                          ({peserta?.kota || 'Bondowoso'}) {peserta?.instansi && `• ${peserta.instansi}`}
                        </p>
                      </div>

                      {/* Right Score & Quick Action for this video */}
                      <div className="flex items-center space-x-3 self-start sm:self-center">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400">
                            Rata-Rata ({karyaPenilaians.length} Juri)
                          </div>
                          <div className="text-lg font-black text-amber-400 font-mono">
                            {avgJuryScore.toFixed(2)}{' '}
                            <span className="text-xs font-normal text-slate-500">/ 100</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadXLSX(karya.id)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-950/60 hover:border-emerald-500/50 text-slate-300 text-xs border border-slate-700 transition-colors"
                            title="Unduh Tabel Spreadsheet Excel (.xlsx) Video Ini"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDirectPDF(karya.id)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:border-rose-500/50 text-slate-300 text-xs border border-slate-700 transition-colors"
                            title="Export Langsung Dokumen Resmi PDF Video Ini"
                          >
                            <FileDown className="w-4 h-4 text-rose-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadCSV(karya.id)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                            title="Unduh CSV Komentar Video Ini"
                          >
                            <Download className="w-4 h-4 text-slate-300" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyText(karya.id)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                            title="Salin Teks Komentar Video Ini"
                          >
                            <Copy className="w-4 h-4 text-indigo-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCardExpand(karya.id)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                            title={isExpanded ? 'Kecilkan' : 'Perluas'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* AI Agent Pre-screening & Cultural RAG summary */}
                    {karya.ai_analysis && (
                      <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 flex items-start space-x-2.5 text-xs">
                        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-300">
                              Evaluasi AI Multi-Agent & RAG Kultural:
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-200">
                              Skor AI: {karya.ai_analysis.score}
                            </span>
                          </div>
                          <p className="text-slate-300 leading-relaxed">
                            {karya.ai_analysis.agent_scorecard?.alasan_umum ||
                              karya.ai_analysis.summary}
                          </p>
                          {karya.ai_analysis.cultural_rag && (
                            <p className="text-[11px] text-indigo-300/80">
                              🏛️ Entitas Budaya:{' '}
                              {karya.ai_analysis.cultural_rag.detected_bondowoso_entities.join(', ')} •{' '}
                              <em>{karya.ai_analysis.cultural_rag.cultural_verification_notes}</em>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Jury Comments List */}
                    {isExpanded && (
                      <div className="space-y-3 pt-1">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Daftar Catatan & Justifikasi Dewan Juri ({karyaPenilaians.length})</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {karyaPenilaians.map((penilaian) => (
                            <div
                              key={penilaian.id}
                              className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                            >
                              {/* Jury Identity & Score */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-slate-200 text-xs">
                                      {penilaian.juri_nama}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-medium">
                                      {penilaian.juri_peran}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    ID Penilaian: {penilaian.id} • Status: {penilaian.status} • Waktu: {penilaian.submitted_at ? new Date(penilaian.submitted_at).toLocaleDateString('id-ID') : '-'}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-slate-400">Total Nilai:</span>
                                  <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    {penilaian.total_skor.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {/* Catatan Evaluasi Keseluruhan */}
                              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 text-xs">
                                <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">
                                  Catatan Evaluasi Umum Juri:
                                </span>
                                <p className="text-slate-200 italic leading-relaxed">
                                  &ldquo;{penilaian.catatan_evaluasi || 'Tidak ada catatan evaluasi umum.'}&rdquo;
                                </p>
                              </div>

                              {/* 5 Aspect Justifications */}
                              {penilaian.aspect_reasons && (
                                <div className="space-y-1.5 text-xs">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                    Justifikasi Rubrik 5 Aspek Penilaian:
                                  </span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                                    {penilaian.aspect_reasons.ide_konten && (
                                      <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                                        <span className="text-indigo-400 font-semibold block">
                                          1. Ide Konten (25%) - Skor: {penilaian.skor_tema}:
                                        </span>
                                        <span className="text-slate-300">
                                          {penilaian.aspect_reasons.ide_konten}
                                        </span>
                                      </div>
                                    )}

                                    {penilaian.aspect_reasons.pemanfaatan_ai && (
                                      <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                                        <span className="text-cyan-400 font-semibold block">
                                          2. Pemanfaatan AI (20%) - Skor: {penilaian.skor_kreativitas}:
                                        </span>
                                        <span className="text-slate-300">
                                          {penilaian.aspect_reasons.pemanfaatan_ai}
                                        </span>
                                      </div>
                                    )}

                                    {penilaian.aspect_reasons.alur_cerita && (
                                      <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                                        <span className="text-emerald-400 font-semibold block">
                                          3. Alur Cerita (20%) - Skor: {penilaian.skor_visual_ai}:
                                        </span>
                                        <span className="text-slate-300">
                                          {penilaian.aspect_reasons.alur_cerita}
                                        </span>
                                      </div>
                                    )}

                                    {penilaian.aspect_reasons.kerapian && (
                                      <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                                        <span className="text-amber-400 font-semibold block">
                                          4. Kerapian Pengerjaan (15%) - Skor: {penilaian.skor_editing}:
                                        </span>
                                        <span className="text-slate-300">
                                          {penilaian.aspect_reasons.kerapian}
                                        </span>
                                      </div>
                                    )}

                                    {penilaian.aspect_reasons.kualitas_video && (
                                      <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60 md:col-span-2">
                                        <span className="text-rose-400 font-semibold block">
                                          5. Kualitas Video (20%) - Skor: {penilaian.skor_audio}:
                                        </span>
                                        <span className="text-slate-300">
                                          {penilaian.aspect_reasons.kualitas_video}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 text-[11px] uppercase font-bold">
                    <th className="py-3 px-3">ID & Judul Karya</th>
                    <th className="py-3 px-3">Peserta</th>
                    <th className="py-3 px-3">Dewan Juri</th>
                    <th className="py-3 px-3 text-center">Skor</th>
                    <th className="py-3 px-4">Catatan Evaluasi Umum</th>
                    <th className="py-3 px-4">Justifikasi Aspek Penilaian</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 text-xs">
                  {extractCommentRows(
                    filteredKaryas,
                    pesertas,
                    penilaians,
                    selectedKaryaId || undefined
                  ).map((row, idx) => (
                    <tr key={`${row.karya_id}-${row.penilaian_id}-${idx}`} className="hover:bg-slate-900/60">
                      <td className="py-3 px-3 align-top font-medium">
                        <div className="font-mono text-indigo-400 font-bold">#{row.karya_id}</div>
                        <div className="text-slate-100 font-semibold max-w-xs">{row.judul_karya}</div>
                        <span className="text-[10px] text-slate-500">{row.kategori}</span>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="font-medium text-slate-200">{row.peserta_nama}</div>
                        <div className="text-[10px] text-slate-500">{row.peserta_kota}</div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="font-semibold text-slate-200">{row.juri_nama}</div>
                        <div className="text-[10px] text-slate-400">{row.juri_peran}</div>
                      </td>
                      <td className="py-3 px-3 align-top text-center">
                        <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300">
                          {row.total_skor.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top max-w-sm">
                        <div className="italic text-slate-200 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          &ldquo;{row.catatan_evaluasi}&rdquo;
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top max-w-xs text-[11px] space-y-1">
                        {row.catatan_ide_konten !== '-' && (
                          <div>
                            <strong className="text-indigo-400">Ide Konten:</strong>{' '}
                            <span>{row.catatan_ide_konten}</span>
                          </div>
                        )}
                        {row.catatan_pemanfaatan_ai !== '-' && (
                          <div>
                            <strong className="text-cyan-400">Pemanfaatan AI:</strong>{' '}
                            <span>{row.catatan_pemanfaatan_ai}</span>
                          </div>
                        )}
                        {row.catatan_alur_cerita !== '-' && (
                          <div>
                            <strong className="text-emerald-400">Alur Cerita:</strong>{' '}
                            <span>{row.catatan_alur_cerita}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => handleDownloadXLSX(row.karya_id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 text-slate-300 text-xs inline-flex items-center border border-slate-700"
                            title="Unduh Tabel Spreadsheet (.xlsx)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDirectPDF(row.karya_id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 text-xs inline-flex items-center border border-slate-700"
                            title="Export Langsung PDF"
                          >
                            <FileDown className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadCSV(row.karya_id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs inline-flex items-center border border-slate-700"
                            title="Unduh CSV Video Ini"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Format spreadsheet multi-sheet .XLSX dan PDF Resmi berstandar Dokumen Panitia Lomba Bondowoso 2026.</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => handleDownloadDirectPDF()}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-rose-600/30 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              <span>Export PDF Resmi</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadXLSX()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Tabel Spreadsheet (.XLSX)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
