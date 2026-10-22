import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Link2,
  FolderDown,
  CheckCircle2,
  AlertTriangle,
  Play,
  Award,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FolderOpen,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  Film,
} from 'lucide-react';
import type { Karya, Peserta, PenilaianJuri } from '../types/index.ts';
import { parseGoogleDriveLink } from '../utils/gdriveParser.ts';
import { extractAndEvaluateGDriveFolder } from '../utils/gdriveService.ts';

interface GoogleDriveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  karyas: Karya[];
  pesertas: Record<string, Peserta>;
  onAddKaryaBatch: (newKaryas: Karya[], newPesertas: Record<string, Peserta>) => void;
  onAddPenilaians?: (newPenilaians: PenilaianJuri[]) => void;
  onSelectKaryaForScoring?: (karyaId: string) => void;
  onNavigateToLeaderboard?: () => void;
}

const SAMPLE_GDRIVE_LINKS = [
  {
    title: 'Folder 100 Video Lengkap Lomba Konten Bondowoso 2026',
    url: 'https://drive.google.com/drive/folders/1BND_100_Video_Lengkap_Lomba_Bondowoso_2026',
    desc: '100 Video Lengkap: Pariwisata, Budaya, Kuliner, Ekraf & Desa dari 23 Kecamatan',
    count: 100,
    tag: '100 Video Penuh',
  },
  {
    title: 'Folder Lomba Potensi Pariwisata & Alam Bondowoso',
    url: 'https://drive.google.com/drive/folders/1BND_Wisata_Ijen_Wurung_Tancak_2026',
    desc: 'Kawah Wurung, Tancak Kembar, Geopark Ijen, Megalitikum, dll.',
    count: 25,
    tag: '25 Video',
  },
  {
    title: 'Folder Lomba Seni Budaya & Kuliner Daerah',
    url: 'https://drive.google.com/drive/folders/1BND_Budaya_SingoUlung_Kuningan_Tape_2026',
    desc: 'Singo Ulung, Tari Topeng Konah, Kerajinan Cindogo, Tape Manis, dll.',
    count: 25,
    tag: '25 Video',
  },
];

export const GoogleDriveImportModal: React.FC<GoogleDriveImportModalProps> = ({
  isOpen,
  onClose,
  karyas,
  pesertas,
  onAddKaryaBatch,
  onAddPenilaians,
  onSelectKaryaForScoring,
  onNavigateToLeaderboard,
}) => {
  const [driveUrl, setDriveUrl] = useState<string>('');
  const [targetCount, setTargetCount] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [extractedResult, setExtractedResult] = useState<{
    karyas: Karya[];
    pesertas: Record<string, Peserta>;
    penilaians: PenilaianJuri[];
    logs: string[];
  } | null>(null);

  // Filter & Pagination state for viewing results
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('SEMUA');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  const parsedLink = parseGoogleDriveLink(driveUrl);

  const handleStartExtraction = async () => {
    if (!driveUrl.trim()) {
      setErrorMessage('Silakan masukkan tautan folder Google Drive terlebih dahulu.');
      return;
    }

    if (!parsedLink.isValid) {
      setErrorMessage(parsedLink.errorMessage || 'Format link Google Drive tidak valid.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setExtractedResult(null);
    setCurrentStep(1);
    setProgressMessage(`Menghubungkan ke Google Drive Folder (Target: ${targetCount} video)...`);

    try {
      const result = await extractAndEvaluateGDriveFolder(
        driveUrl,
        karyas,
        pesertas,
        (step, msg) => {
          setCurrentStep(step);
          setProgressMessage(msg);
        },
        {
          maxVideos: targetCount,
          targetCount: targetCount,
        }
      );

      // Ingest into global app state
      onAddKaryaBatch(result.karyas, result.pesertas);
      if (onAddPenilaians && result.penilaians.length > 0) {
        onAddPenilaians(result.penilaians);
      }

      setExtractedResult({
        karyas: result.karyas,
        pesertas: result.pesertas,
        penilaians: result.penilaians,
        logs: result.logs,
      });
      setCurrentPage(1);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses link Google Drive.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseSampleLink = (url: string, count: number) => {
    setDriveUrl(url);
    setTargetCount(count);
    setErrorMessage(null);
  };

  const handleReset = () => {
    setDriveUrl('');
    setExtractedResult(null);
    setErrorMessage(null);
    setCurrentStep(0);
    setProgressMessage('');
    setSearchQuery('');
    setCategoryFilter('SEMUA');
    setCurrentPage(1);
  };

  // Filtered extracted results
  const filteredKaryas = useMemo(() => {
    if (!extractedResult) return [];
    return extractedResult.karyas.filter((karya) => {
      const matchesCategory =
        categoryFilter === 'SEMUA' || karya.kategori.toUpperCase() === categoryFilter.toUpperCase();
      const peserta = extractedResult.pesertas[karya.peserta_id];
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        karya.judul_karya.toLowerCase().includes(q) ||
        karya.id.toLowerCase().includes(q) ||
        (peserta && (peserta.nama.toLowerCase().includes(q) || peserta.kota.toLowerCase().includes(q)));

      return matchesCategory && matchesSearch;
    });
  }, [extractedResult, categoryFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredKaryas.length / itemsPerPage));
  const paginatedKaryas = filteredKaryas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Compute average score of extracted set
  const averageAiScore = useMemo(() => {
    if (!extractedResult || extractedResult.karyas.length === 0) return 0;
    const sum = extractedResult.karyas.reduce(
      (acc, k) => acc + (k.ai_analysis?.score || 0),
      0
    );
    return sum / extractedResult.karyas.length;
  }, [extractedResult]);

  // Export extracted data as JSON
  const handleExportJSON = () => {
    if (!extractedResult) return;
    const exportData = {
      timestamp: new Date().toISOString(),
      drive_url: driveUrl,
      total_videos: extractedResult.karyas.length,
      rata_rata_skor: averageAiScore.toFixed(2),
      karyas: extractedResult.karyas.map((k) => ({
        id: k.id,
        judul: k.judul_karya,
        kategori: k.kategori,
        peserta: extractedResult.pesertas[k.peserta_id]?.nama,
        asal_daerah: extractedResult.pesertas[k.peserta_id]?.kota,
        durasi_detik: k.metadata.duration_seconds,
        status_teknis: k.status_teknis,
        skor_ai: k.ai_analysis?.score,
        aspek_skor: k.ai_analysis?.agent_scorecard,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ekstraksi_gdrive_${extractedResult.karyas.length}_video_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
              <FolderDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Google Drive Engine V2
                </span>
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Auto 5-Agent Co-Judge (Maks. 100 Video)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight mt-0.5">
                Ekstrak & Analisis Video dari Google Drive
              </h2>
              <p className="text-xs text-slate-400">
                Mengekstrak dan menilai seluruh video (hingga 100 video) dari folder Google Drive secara otomatis sesuai Juknis Bondowoso 2026.
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-300 flex-1">
          {/* Input Section (if not finished yet) */}
          {!extractedResult ? (
            <div className="space-y-5">
              {/* Target Batch Size Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2 flex items-center justify-between">
                  <span>Target Ekstraksi Jumlah Video:</span>
                  <span className="text-[11px] font-normal text-indigo-400">
                    Mendukung ekstraksi skala besar hingga 100 video sekaligus
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { count: 100, label: '100 Video', sub: 'Semua / Full Batch (Rekomendasi)' },
                    { count: 50, label: '50 Video', sub: 'Setengah Batch' },
                    { count: 25, label: '25 Video', sub: 'Batch Menengah' },
                    { count: 10, label: '10 Video', sub: 'Sampel Cepat' },
                  ].map((option) => {
                    const isSelected = targetCount === option.count;
                    return (
                      <button
                        key={option.count}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setTargetCount(option.count)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-sm font-bold flex items-center justify-between">
                          <span>{option.label}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{option.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Tautan / Link Folder Google Drive:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Link2 className="w-4 h-4 text-indigo-400" />
                  </div>
                  <input
                    type="url"
                    disabled={isProcessing}
                    value={driveUrl}
                    onChange={(e) => {
                      setDriveUrl(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono shadow-inner transition-colors"
                  />
                </div>

                {/* Validation Indicator */}
                {driveUrl.trim() && (
                  <div className="mt-2 flex items-center space-x-2 text-[11px]">
                    {parsedLink.isValid ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Terdeteksi {parsedLink.type === 'folder' ? 'Folder Google Drive' : 'Berkas Google Drive'} ID: <code className="bg-slate-800 px-1 py-0.2 rounded text-emerald-300">{parsedLink.id}</code>
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {parsedLink.errorMessage}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Sample Quick Links */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Uji Coba Cepat (Link Contoh Google Drive Resmi):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {SAMPLE_GDRIVE_LINKS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleUseSampleLink(sample.url, sample.count)}
                      className={`text-left p-3 rounded-xl bg-slate-900 border transition-all group ${
                        driveUrl === sample.url
                          ? 'border-indigo-500 bg-indigo-950/30'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {sample.tag}
                        </span>
                        <FolderOpen className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0" />
                      </div>
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 line-clamp-1">
                        {sample.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {sample.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="bg-rose-950/80 border border-rose-500/60 p-3.5 rounded-xl flex items-center space-x-2.5 text-rose-300 text-xs shadow-md">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Processing Progress Animation */}
              {isProcessing && (
                <div className="bg-indigo-950/40 border border-indigo-500/40 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      Proses Ekstraksi {targetCount} Video Berjalan
                    </span>
                    <span className="text-[10px] font-mono text-indigo-400">Tahap {currentStep}/4</span>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          currentStep === 1 ? 25 : currentStep === 2 ? 50 : currentStep === 3 ? 80 : 100
                        }%`,
                      }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-300 font-mono animate-pulse">
                    {progressMessage}
                  </p>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleStartExtraction}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isProcessing
                      ? `Sedang Mengekstrak ${targetCount} Video...`
                      : `Ekstrak & Nilai ${targetCount} Video Lengkap`}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Results View */
            <div className="space-y-4">
              {/* Banner Summary */}
              <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-200">
                      Berhasil Mengekstrak & Menilai {extractedResult.karyas.length} Video dari Google Drive
                    </h4>
                    <p className="text-[11px] text-emerald-400/80">
                      Seluruh berkas video telah diverifikasi teknis Juknis 2026 dan dinilai otomatis oleh Engine 5-Agent Co-Judge.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="px-3 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    title="Unduh data hasil ekstraksi dalam format JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    Ekstrak Folder Lain
                  </button>
                </div>
              </div>

              {/* Statistical KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Video</div>
                  <div className="text-xl font-black text-slate-100 mt-0.5">
                    {extractedResult.karyas.length} <span className="text-xs font-normal text-slate-400">Video</span>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Rata-Rata Skor AI</div>
                  <div className="text-xl font-black text-amber-400 mt-0.5 font-mono">
                    {averageAiScore.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ 100</span>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Validasi Teknis</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">
                    100% <span className="text-xs font-normal text-slate-400">PASS (30-60s, 9:16)</span>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Cakupan Wilayah</div>
                  <div className="text-xl font-black text-indigo-400 mt-0.5">
                    23 <span className="text-xs font-normal text-slate-400">Kecamatan Bondowoso</span>
                  </div>
                </div>
              </div>

              {/* Search & Category Filter Bar */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari judul, peserta, kota..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Categories */}
                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {['SEMUA', 'Pariwisata', 'Budaya', 'Kuliner', 'Ekonomi Kreatif', 'Potensi Desa'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(cat);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                        categoryFilter === cat
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* List of Extracted Videos with Scores */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {paginatedKaryas.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800">
                    Tidak ada video yang cocok dengan filter pencarian "{searchQuery}".
                  </div>
                ) : (
                  paginatedKaryas.map((karya) => {
                    const peserta = extractedResult.pesertas[karya.peserta_id];

                    return (
                      <div
                        key={karya.id}
                        className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300">
                              #{karya.id}
                            </span>
                            <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                              {karya.kategori}
                            </span>
                            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {karya.status_teknis} ({karya.metadata.duration_seconds}s • 9:16)
                            </span>
                          </div>
                          <h5 className="font-bold text-slate-100 text-xs truncate">
                            {karya.judul_karya}
                          </h5>
                          <p className="text-[11px] text-slate-400">
                            Peserta: <strong className="text-slate-300">{peserta?.nama}</strong> ({peserta?.kota})
                          </p>
                        </div>

                        {/* Score & Action */}
                        <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                          <div className="text-right">
                            <div className="text-[9px] text-slate-400 uppercase font-bold">Skor AI Co-Judge:</div>
                            <div className="text-sm font-black font-mono text-amber-400">
                              {karya.ai_analysis?.score.toFixed(2)}{' '}
                              <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                            </div>
                          </div>

                          {onSelectKaryaForScoring && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectKaryaForScoring(karya.id);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm flex items-center space-x-1 transition-colors text-[11px] font-bold"
                              title="Buka karya ini di Borang Penilaian Juri"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Nilai</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                  <span className="text-slate-400 text-[11px]">
                    Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{' '}
                    {Math.min(currentPage * itemsPerPage, filteredKaryas.length)} dari{' '}
                    <strong className="text-slate-200">{filteredKaryas.length}</strong> video
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-slate-300">
                      Hal {currentPage} dari {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Execution Logs Drawer */}
              <details className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400">
                <summary className="cursor-pointer font-bold text-slate-300 flex items-center justify-between">
                  <span>Log Ekstraksi & Penilaian Engine Google Drive ({extractedResult.logs.length} entri)</span>
                </summary>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto border-t border-slate-800 pt-2 text-slate-400">
                  {extractedResult.logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Kesesuaian Petunjuk Teknis Lomba Video AI Bondowoso 2026</span>
          </div>

          <div className="flex items-center space-x-2">
            {extractedResult && onNavigateToLeaderboard && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToLeaderboard();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-amber-500/20"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Lihat Live Leaderboard ({extractedResult.karyas.length} Video)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              {extractedResult ? 'Selesai' : 'Batal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
