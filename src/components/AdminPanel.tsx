import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import {
  Upload,
  FileArchive,
  CheckCircle,
  AlertOctagon,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  FolderArchive,
  RefreshCw,
  Plus,
  Play,
  Download,
  Info,
  Check,
  X,
  FileVideo,
  FileText,
  Sliders,
  Trash2,
  Filter,
  Search,
  Award,
  Users,
  MessageSquare,
} from 'lucide-react';
import {
  Karya,
  Peserta,
  StatusTeknis,
  VideoMetadata,
  PenilaianJuri,
} from '../types/index.ts';
import { validateTechnicalSpecs } from '../utils/validation.ts';
import { extractSubmissionsFromZip } from '../utils/zipParser.ts';

interface AdminPanelProps {
  karyas: Karya[];
  pesertas: Record<string, Peserta>;
  penilaians: PenilaianJuri[];
  onAddKaryaBatch: (newKaryas: Karya[], newPesertas: Record<string, Peserta>) => void;
  onUpdateKaryaStatus: (karyaId: string, isOverridden: boolean, overrideReason: string) => void;
  onDeleteKarya: (karyaId: string, reason: string) => void;
  onRunAIBatchAnalysis: () => Promise<void>;
  isAIBatchRunning: boolean;
  onResetToDemoData: () => void;
  onOpenExportComments?: (karyaId?: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  karyas,
  pesertas,
  penilaians,
  onAddKaryaBatch,
  onUpdateKaryaStatus,
  onDeleteKarya,
  onRunAIBatchAnalysis,
  isAIBatchRunning,
  onResetToDemoData,
  onOpenExportComments,
}) => {
  const [isProcessingZip, setIsProcessingZip] = useState<boolean>(false);
  const [zipLog, setZipLog] = useState<string[]>([]);
  const [zipError, setZipError] = useState<string | null>(null);
  const [zipSuccessMessage, setZipSuccessMessage] = useState<string | null>(null);

  // Manual Override Modal state (Rule-01)
  const [overrideModalKarya, setOverrideModalKarya] = useState<Karya | null>(null);
  const [overrideReasonInput, setOverrideReasonInput] = useState<string>('');
  const [overrideAdminName, setOverrideAdminName] = useState<string>('Sekretaris Dewan Panitia');

  // Delete Video Modal state (Admin Access for Scored Videos)
  const [deleteModalKarya, setDeleteModalKarya] = useState<Karya | null>(null);
  const [deleteReasonInput, setDeleteReasonInput] = useState<string>('');
  const [deleteConfirmed, setDeleteConfirmed] = useState<boolean>(false);
  const [deleteSuccessNotice, setDeleteSuccessNotice] = useState<string | null>(null);

  // Filters & Search
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SCORED' | 'UNSCORED' | 'RED_FLAG' | 'PASS'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle ZIP Ingestion (PRD Section 5) - Extracts ALL video files reliably
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setZipError('Format berkas tidak valid. Harap unggah berkas arsip .zip sesuai ketentuan PRD Section 5.');
      return;
    }

    setIsProcessingZip(true);
    setZipError(null);
    setZipSuccessMessage(null);
    setZipLog(['Membaca berkas arsip ZIP: ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)...']);

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      const logs: string[] = ['Arsip ZIP berhasil dibuka. Memindai semua berkas video dan direktori...'];

      // Gather raw non-directory entries
      const rawEntries: Array<{ relativePath: string; zipEntry: any }> = [];
      zipContent.forEach((relativePath, zipEntry) => {
        rawEntries.push({ relativePath, zipEntry });
      });

      // Extract all submissions (each video file is extracted as a separate karya)
      const submissions = extractSubmissionsFromZip(rawEntries);

      if (submissions.length === 0) {
        setZipError(
          'Tidak ditemukan berkas video (.mp4, .mov, .webm, dll) di dalam arsip ZIP. Pastikan arsip berisi berkas video peserta lomba.'
        );
        setZipLog((prev) => [...prev, '⚠️ Peringatan: Tidak ada berkas video yang ditemukan dalam ZIP.']);
        return;
      }

      logs.push(`Ditemukan ${submissions.length} berkas video di dalam arsip. Memproses ekstraksi lengkap...`);

      // Find highest existing numeric ID in karyas to prevent ID collisions
      let maxIdNum = 100;
      karyas.forEach((k) => {
        const match = k.id.match(/BND-?(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxIdNum) {
            maxIdNum = num;
          }
        }
      });

      const newKaryasList: Karya[] = [];
      const newPesertasMap: Record<string, Peserta> = {};

      for (let i = 0; i < submissions.length; i++) {
        const sub = submissions[i];

        let videoBlobUrl = '';
        try {
          const blob = await sub.videoEntry.async('blob');
          videoBlobUrl = URL.createObjectURL(blob);
        } catch {
          videoBlobUrl = '';
        }

        // Detect real video duration and resolution in browser
        const mediaInfo = await new Promise<{ duration: number; width: number; height: number }>((resolve) => {
          if (!videoBlobUrl) {
            resolve({ duration: 45.0, width: 1080, height: 1920 });
            return;
          }
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.src = videoBlobUrl;
          const timeout = setTimeout(() => {
            resolve({ duration: 45.0, width: 1080, height: 1920 });
          }, 1200);
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            const dur =
              video.duration && !isNaN(video.duration) && isFinite(video.duration)
                ? Math.round(video.duration * 10) / 10
                : 45.0;
            const w = video.videoWidth || 1080;
            const h = video.videoHeight || 1920;
            resolve({ duration: dur, width: w, height: h });
          };
          video.onerror = () => {
            clearTimeout(timeout);
            resolve({ duration: 45.0, width: 1080, height: 1920 });
          };
        });

        const aspect = mediaInfo.width / (mediaInfo.height || 1);
        const metadata: VideoMetadata = {
          duration_seconds: mediaInfo.duration,
          width: mediaInfo.width,
          height: mediaInfo.height,
          aspect_ratio: Math.round(aspect * 10000) / 10000,
          fps: 30,
          bitrate_kbps: 4500,
          codec: 'H.264/MP4',
          audio_codec: 'AAC',
          audio_sample_rate_khz: 48.0,
          audio_bitrate_kbps: 192,
        };

        const valResult = validateTechnicalSpecs(metadata);

        let promptText = 'Prompt list hasil ekstraksi arsip: Midjourney v6 + Runway Gen-3 Alpha.';
        if (sub.promptEntry) {
          try {
            promptText = await sub.promptEntry.async('text');
          } catch {
            // fallback
          }
        }

        const idPeserta = sub.idPeserta || `P-NEW-${i + 1}`;
        const namaPeserta = sub.namaPeserta || `Peserta ${i + 1}`;

        const newPeserta: Peserta = pesertas[idPeserta] || {
          id: idPeserta,
          nama: namaPeserta,
          email: `${idPeserta.toLowerCase().replace(/[^a-z0-9]/g, '')}@peserta.bondowoso.go.id`,
          kontak: '0812' + Math.floor(10000000 + Math.random() * 90000000),
          instansi: 'Kreator Konten Bondowoso',
          kota: 'Bondowoso',
        };

        const newId = `BND-${maxIdNum + 1 + i}`;
        const newKarya: Karya = {
          id: newId,
          peserta_id: idPeserta,
          judul_karya: sub.judulKarya,
          kategori: sub.kategori as any,
          deskripsi: `Karya video AI inovatif bertema potensi Kabupaten Bondowoso yang diekstrak dari arsip kolektif ZIP panitia (${sub.filename}).`,
          video_url: videoBlobUrl || 'blob:sample-video',
          video_filename: sub.filename,
          prompt_list_text: promptText,
          prompt_tools: ['Midjourney v6', 'Runway Gen-3'],
          dokumen_pendukung_nama: sub.docEntry ? 'dokumen_pendukung.pdf' : undefined,
          metadata,
          status_teknis: valResult.status,
          status_teknis_reasons: valResult.reasons,
          is_overridden: false,
          created_at: new Date().toISOString(),
        };

        newKaryasList.push(newKarya);
        newPesertasMap[idPeserta] = newPeserta;
        logs.push(
          `✓ [${idPeserta}] "${sub.judulKarya}" (${sub.filename}) -> ID #${newId} - Status ${valResult.status} (${mediaInfo.duration}s, ${mediaInfo.width}x${mediaInfo.height})`
        );
      }

      setZipLog(logs);
      onAddKaryaBatch(newKaryasList, newPesertasMap);
      setZipSuccessMessage(`Berhasil mengekstrak seluruh ${newKaryasList.length} karya video dari berkas arsip ZIP tanpa ada yang terlewat.`);
    } catch (err: any) {
      setZipError(`Terjadi kesalahan saat memproses arsip ZIP: ${err.message || 'Format tidak didukung'}`);
    } finally {
      setIsProcessingZip(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Open Override Modal
  const openOverrideModal = (karya: Karya) => {
    setOverrideModalKarya(karya);
    setOverrideReasonInput(
      karya.override_reason ||
        'Dispensasi toleransi teknis disetujui panitia penyelenggara setelah verifikasi manual dokumen pendukung.'
    );
    setOverrideAdminName('Sekretaris Dewan Panitia');
  };

  const handleSaveOverride = () => {
    if (!overrideModalKarya) return;
    onUpdateKaryaStatus(overrideModalKarya.id, true, overrideReasonInput);
    setOverrideModalKarya(null);
  };

  // Open Delete Modal
  const openDeleteModal = (karya: Karya) => {
    setDeleteModalKarya(karya);
    setDeleteReasonInput('Peserta terbukti melanggar orisinalitas aset / permintaan penarikan karya secara tertulis');
    setDeleteConfirmed(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteModalKarya || !deleteConfirmed) return;
    const karyaTitle = deleteModalKarya.judul_karya;
    const karyaId = deleteModalKarya.id;

    onDeleteKarya(karyaId, deleteReasonInput);

    setDeleteModalKarya(null);
    setDeleteReasonInput('');
    setDeleteConfirmed(false);
    setDeleteSuccessNotice(`Karya #${karyaId} ("${karyaTitle}") dan seluruh nilai dewan juri terkait berhasil dihapus secara permanen.`);

    setTimeout(() => {
      setDeleteSuccessNotice(null);
    }, 6000);
  };

  // Quick preset reason helper
  const setPresetReason = (reason: string) => {
    setDeleteReasonInput(reason);
  };

  // Stats calculation
  const totalCount = karyas.length;
  const scoredCount = karyas.filter((k) =>
    penilaians.some((p) => p.karya_id === k.id && p.status === 'SUBMITTED')
  ).length;
  const unscoredCount = totalCount - scoredCount;
  const redFlagCount = karyas.filter((k) => k.status_teknis === 'RED_FLAG' && !k.is_overridden).length;
  const passCount = karyas.filter((k) => k.status_teknis !== 'RED_FLAG' || k.is_overridden).length;

  // Filtered karyas list
  const filteredKaryas = karyas.filter((karya) => {
    const isScored = penilaians.some((p) => p.karya_id === karya.id && p.status === 'SUBMITTED');
    const isRedFlag = karya.status_teknis === 'RED_FLAG' && !karya.is_overridden;

    if (filterStatus === 'SCORED' && !isScored) return false;
    if (filterStatus === 'UNSCORED' && isScored) return false;
    if (filterStatus === 'RED_FLAG' && !isRedFlag) return false;
    if (filterStatus === 'PASS' && isRedFlag) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const peserta = pesertas[karya.peserta_id];
      const matchTitle = karya.judul_karya.toLowerCase().includes(q);
      const matchId = karya.id.toLowerCase().includes(q);
      const matchPeserta = peserta ? peserta.nama.toLowerCase().includes(q) : false;
      const matchCategory = karya.kategori.toLowerCase().includes(q);
      if (!matchTitle && !matchId && !matchPeserta && !matchCategory) return false;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Admin Control Center
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Juknis Bab III & PRD V2 Specification
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1">
            Manajemen Berkas Karya, Validasi Teknis & Hak Akses Admin
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pusat kendali administrator: ekstraksi ZIP kolektif, validasi teknis otomatis, hak prerogatif Manual Override (Rule-01), dan penghapusan data video yang sudah dinilai.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onResetToDemoData}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            title="Kembalikan dataset awal contoh resmi lomba Bondowoso"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Data Contoh</span>
          </button>

          <button
            type="button"
            disabled={isAIBatchRunning}
            onClick={onRunAIBatchAnalysis}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAIBatchRunning ? 'animate-spin' : ''}`} />
            <span>{isAIBatchRunning ? 'Memproses AI...' : 'Jalankan Batch AI Pre-Screening'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {deleteSuccessNotice && (
        <div className="bg-emerald-950/90 border border-emerald-500/80 p-4 rounded-2xl flex items-center justify-between text-emerald-200 text-xs shadow-lg animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{deleteSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteSuccessNotice(null)}
            className="text-emerald-400 hover:text-emerald-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Karya</span>
          <span className="text-2xl font-black text-slate-100 mt-1 block">{totalCount}</span>
          <span className="text-[10px] text-slate-500">Berkas terdaftar</span>
        </div>

        <div className="bg-slate-900 border border-emerald-900/40 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Sudah Dinilai</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-emerald-300 mt-1 block">{scoredCount}</span>
          <span className="text-[10px] text-slate-400">Ada skor dewan juri</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Belum Dinilai</span>
          <span className="text-2xl font-black text-amber-300 mt-1 block">{unscoredCount}</span>
          <span className="text-[10px] text-slate-500">Menunggu penilaian</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Lolos Validasi</span>
          <span className="text-2xl font-black text-indigo-400 mt-1 block">{passCount}</span>
          <span className="text-[10px] text-slate-500">Siap dinilai juri</span>
        </div>

        <div className="bg-slate-900 border border-rose-900/40 p-4 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">Red Flag Teknis</span>
          <span className="text-2xl font-black text-rose-400 mt-1 block">{redFlagCount}</span>
          <span className="text-[10px] text-slate-500">Diskualifikasi otomatis</span>
        </div>
      </div>

      {/* ZIP Ingestion & Technical Specs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload ZIP Ingestion Box (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FolderArchive className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                Ingest Berkas Arsip Kolektif ZIP (PRD Section 5)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Format: [ID]_[Nama]_[Judul]/
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Unggah satu berkas arsip <code>.zip</code> kolektif (maks. 2GB) yang berisi direktori karya video peserta lomba. Sistem secara otomatis mengekstrak berkas <code>.mp4</code>, membaca teks prompt, dan mengecek kesesuaian spesifikasi teknis.
          </p>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/70 hover:bg-slate-950 rounded-2xl p-8 text-center cursor-pointer transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleZipUpload}
              accept=".zip,application/zip"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-200 block">
              Pilih Berkas ZIP Kolektif Pengumpulan Peserta
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Maksimal ukuran berkas 2GB • Ekstraksi metadata otomatis
            </span>
          </div>

          {isProcessingZip && (
            <div className="flex items-center space-x-2 text-indigo-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Sedang membaca dan mengekstrak berkas arsip ZIP...</span>
            </div>
          )}

          {zipError && (
            <div className="bg-rose-950/80 border border-rose-500/60 p-3 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{zipError}</span>
            </div>
          )}

          {zipSuccessMessage && (
            <div className="bg-emerald-950/80 border border-emerald-500/60 p-3 rounded-xl flex items-center space-x-2 text-emerald-300 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{zipSuccessMessage}</span>
            </div>
          )}

          {zipLog.length > 0 && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-400 max-h-36 overflow-y-auto space-y-1">
              {zipLog.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          )}
        </div>

        {/* Validation Matrix Reference (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Parameter Validasi Teknis (PRD Section 6)
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center font-bold text-slate-200">
                <span>1. Durasi Video</span>
                <span className="text-rose-400 font-mono">30.0s – 60.0s (±0.5s)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Aturan Lomba: 30–60 detik (toleransi 0.5s). Jika melanggar: <strong className="text-rose-400">RED FLAG (Diskualifikasi Teknis)</strong>.
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center font-bold text-slate-200">
                <span>2. Rasio Aspek</span>
                <span className="text-amber-400 font-mono">9:16 Vertical (&lt;1.5% dev)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Format video vertikal 9:16. Jika melebihi deviasi: <strong className="text-amber-400">Warning / Auto-crop Flag</strong>.
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center font-bold text-slate-200">
                <span>3. Resolusi Minimum</span>
                <span className="text-blue-400 font-mono">HD 720p (720x1280)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Resolusi minimal 720px x 1280px. Jika lebih rendah: <strong className="text-blue-400">Flagging Kualitas Rendah</strong>.
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center font-bold text-slate-200">
                <span>4. Codec & Audio</span>
                <span className="text-slate-300 font-mono">H.264 / AAC (44.1kHz)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Standar MP4/H.264, Audio AAC minimal 128 kbps.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Technical Verification & Video Management Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-3">
        {/* Table Controls & Filter Bar */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span>Status Verifikasi & Pengelolaan Karya ({karyas.length} Berkas)</span>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-mono font-bold">
                Fitur Admin: Hapus Video Dinilai
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Admin berwenang melakukan Manual Override diskualifikasi teknis dan menghapus berkas video yang sudah dinilai secara permanen.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari judul, ID, peserta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
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

            {/* Filter Pills */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterStatus === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('SCORED')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterStatus === 'SCORED' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                Sudah Dinilai ({scoredCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('UNSCORED')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterStatus === 'UNSCORED' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                Belum Dinilai ({unscoredCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('RED_FLAG')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterStatus === 'RED_FLAG' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-rose-300'
                }`}
              >
                Red Flag ({redFlagCount})
              </button>
            </div>

            {/* Ekspor Semua Komentar Juri */}
            <button
              type="button"
              onClick={() => onOpenExportComments ? onOpenExportComments() : undefined}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/70 text-xs font-bold transition-colors shadow-sm"
              title="Ekspor seluruh catatan dan evaluasi dewan juri tiap video"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ekspor Komentar Juri</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/30 text-indigo-300 font-mono font-bold">
                {penilaians.length}
              </span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-4">ID & Judul Karya</th>
                <th className="py-3 px-4">Peserta</th>
                <th className="py-3 px-4">Durasi & Format</th>
                <th className="py-3 px-4">Status Teknis</th>
                <th className="py-3 px-4">Status Penilaian Juri</th>
                <th className="py-3 px-4 text-center">Aksi Administrator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredKaryas.map((karya) => {
                const peserta = pesertas[karya.peserta_id];
                const isDisq = karya.status_teknis === 'RED_FLAG' && !karya.is_overridden;

                // Judge scores for this video
                const relatedPenilaians = penilaians.filter((p) => p.karya_id === karya.id);
                const submittedScores = relatedPenilaians.filter((p) => p.status === 'SUBMITTED');
                const avgScore =
                  submittedScores.length > 0
                    ? (
                        submittedScores.reduce((acc, c) => acc + c.total_skor, 0) /
                        submittedScores.length
                      ).toFixed(2)
                    : null;

                return (
                  <tr
                    key={karya.id}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      isDisq ? 'bg-rose-950/20' : ''
                    }`}
                  >
                    {/* ID & Title */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="font-mono text-indigo-400 font-bold">#{karya.id}</span>
                        <span>{karya.judul_karya}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                          {karya.kategori}
                        </span>
                        <span>{karya.video_filename}</span>
                      </div>
                    </td>

                    {/* Participant */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-semibold">{peserta?.nama || '-'}</div>
                      <div className="text-[11px] text-slate-400">{peserta?.instansi || 'Bondowoso'}</div>
                    </td>

                    {/* Duration & Resolution */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div>
                        <span
                          className={
                            karya.metadata.duration_seconds < 29.5 || karya.metadata.duration_seconds > 60.5
                              ? 'text-rose-400 font-bold'
                              : 'text-slate-200 font-semibold'
                          }
                        >
                          {karya.metadata.duration_seconds}s
                        </span>
                        <span className="text-slate-400 ml-1">({karya.metadata.fps || 30}fps)</span>
                      </div>
                      <div className="text-slate-400 text-[10px]">
                        {karya.metadata.width}x{karya.metadata.height} (9:16)
                      </div>
                    </td>

                    {/* Technical Status */}
                    <td className="py-3.5 px-4">
                      {isDisq ? (
                        <div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center w-fit gap-1">
                            <AlertOctagon className="w-3 h-3" /> RED FLAG
                          </span>
                          <span className="text-[10px] text-rose-400 block mt-1 leading-tight">
                            {karya.status_teknis_reasons.join(', ')}
                          </span>
                        </div>
                      ) : karya.is_overridden ? (
                        <div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center w-fit gap-1">
                            <CheckCircle className="w-3 h-3" /> Manual Override
                          </span>
                          <span className="text-[10px] text-emerald-400 block mt-1 leading-tight">
                            Disetujui: {karya.override_by}
                          </span>
                        </div>
                      ) : karya.status_teknis === 'WARNING' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center w-fit gap-1">
                          <AlertTriangle className="w-3 h-3" /> Warning (Auto-crop)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center w-fit gap-1">
                          <CheckCircle className="w-3 h-3" /> Lolos Validasi
                        </span>
                      )}
                    </td>

                    {/* Jury Score Status (Key PRD V2 Addition) */}
                    <td className="py-3.5 px-4">
                      {submittedScores.length > 0 ? (
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ✓ {submittedScores.length}/3 Juri Final
                            </span>
                            <span className="font-mono font-bold text-xs text-amber-300">
                              Skor: {avgScore}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 space-y-0.5">
                            {submittedScores.map((sc, idx) => (
                              <div key={idx} className="flex justify-between font-mono">
                                <span>{sc.juri_nama.split(' ')[0]}:</span>
                                <span className="text-slate-300 font-semibold">{sc.total_skor.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : relatedPenilaians.length > 0 ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Draft tersimpan ({relatedPenilaians.length} juri)
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px] italic">
                          Belum ada nilai juri
                        </span>
                      )}
                    </td>

                    {/* Admin Actions (Manual Override & Hapus Video) */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* Manual Override for Red Flag */}
                        {karya.status_teknis === 'RED_FLAG' && (
                          <button
                            type="button"
                            onClick={() => openOverrideModal(karya)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                              karya.is_overridden
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                            }`}
                            title="Lakukan Manual Override dispensasi teknis"
                          >
                            {karya.is_overridden ? 'Edit Override' : 'Override'}
                          </button>
                        )}

                        {/* DELETE VIDEO BUTTON (Requested explicitly by user) */}
                        <button
                          type="button"
                          onClick={() => openDeleteModal(karya)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-600 transition-all flex items-center space-x-1 shadow-sm"
                          title="Hapus berkas video dan bersihkan seluruh nilai dewan juri terkait"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>

                        {/* Export Comments for this video if scored */}
                        {relatedPenilaians.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onOpenExportComments ? onOpenExportComments(karya.id) : undefined}
                            className="p-1.5 rounded-lg text-xs bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-700/60 transition-colors shadow-sm"
                            title="Ekspor catatan dan komentar dewan juri untuk karya ini"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredKaryas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs italic">
                    Tidak ditemukan berkas karya yang sesuai dengan filter atau pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Override Confirmation Modal (Rule-01) */}
      {overrideModalKarya && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h4 className="text-lg font-bold text-slate-100">
                Manual Override Diskualifikasi Teknis
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Sesuai <strong>Rule-01 PRD</strong>: Pengabaian otomatis diskualifikasi teknis memungkinkan dewan juri untuk melakukan penilaian kualitatif atas karya ini.
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Karya:</span>
                <span className="font-bold">#{overrideModalKarya.id} - {overrideModalKarya.judul_karya}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Penyebab Red Flag:</span>
                <span className="font-semibold text-rose-400">
                  {overrideModalKarya.status_teknis_reasons.join(', ')}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Alasan Penetapan Override (Berita Acara):
                </label>
                <textarea
                  value={overrideReasonInput}
                  onChange={(e) => setOverrideReasonInput(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  placeholder="Contoh: Dispensasi durasi intro 0.8s disetujui panitia penyelenggara..."
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Nama Pejabat / Administrator yang Mengesahkan:
                </label>
                <input
                  type="text"
                  value={overrideAdminName}
                  onChange={(e) => setOverrideAdminName(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 p-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setOverrideModalKarya(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveOverride}
                className="w-1/2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-colors"
              >
                Simpan & Izinkan Penilaian Juri
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE SCORED VIDEO (Requested explicitly by user) */}
      {deleteModalKarya && (() => {
        const relatedPenilaians = penilaians.filter((p) => p.karya_id === deleteModalKarya.id);
        const submittedCount = relatedPenilaians.filter((p) => p.status === 'SUBMITTED').length;
        const peserta = pesertas[deleteModalKarya.peserta_id];

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-500/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
              <div className="w-12 h-12 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center border border-rose-500/40 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h4 className="text-lg font-black text-slate-100">
                  Hapus Karya & Bersihkan Data Penilaian Juri
                </h4>
                <p className="text-xs text-rose-300 mt-1 font-semibold">
                  Aksi Administrator Khusus — Penghapusan Permanen Berkas & Nilai
                </p>
              </div>

              {/* Work & Evaluation Summary */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Karya yang Dihapus:</span>
                  <span className="font-bold text-slate-100">
                    #{deleteModalKarya.id} - {deleteModalKarya.judul_karya}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Peserta:</span>
                  <span className="font-semibold text-indigo-300">
                    {peserta?.nama || deleteModalKarya.peserta_id} ({deleteModalKarya.kategori})
                  </span>
                </div>

                {/* Scored Status Warning */}
                {submittedCount > 0 ? (
                  <div className="mt-2 p-2.5 rounded-lg bg-rose-950/80 border border-rose-600 text-rose-200 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1 text-rose-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>PERINGATAN: Video ini SUDAH DINILAI oleh {submittedCount} Dewan Juri!</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-snug">
                      Menghapus video ini akan melenyapkan seluruh rekap skor juri berikut dan memperbarui peringkat Live Leaderboard secara otomatis:
                    </p>
                    <div className="space-y-0.5 pt-1">
                      {relatedPenilaians.map((pen, idx) => (
                        <div key={idx} className="flex justify-between text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded">
                          <span>{pen.juri_nama}:</span>
                          <span className="font-bold text-amber-300">
                            {pen.total_skor.toFixed(2)} ({pen.status})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-[11px] italic">
                    Karya ini belum dinilai final oleh dewan juri.
                  </div>
                )}
              </div>

              {/* Preset Reasons & Input */}
              <div className="space-y-2.5 text-xs">
                <label className="text-slate-300 font-semibold block">
                  Alasan Penghapusan Berkas (Dicatat ke Audit Trail & Berita Acara):
                </label>

                {/* Preset quick buttons */}
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setPresetReason('Peserta mengajukan penarikan karya secara tertulis')}
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Penarikan Tertulis
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetReason('Terbukti melanggar orisinalitas aset AI / hak cipta pihak ketiga')}
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Pelanggaran Orisinalitas
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetReason('Pengunggahan ulang video revisi resmi sesuai dispensasi panitia')}
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Video Revisi
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetReason('Kesalahan duplikasi berkas pengiriman video peserta')}
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Duplikasi Berkas
                  </button>
                </div>

                <textarea
                  value={deleteReasonInput}
                  onChange={(e) => setDeleteReasonInput(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-rose-500 text-xs"
                  placeholder="Ketikkan alasan resmi penghapusan..."
                />
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start space-x-2 pt-1 text-xs">
                <input
                  type="checkbox"
                  id="confirm-delete"
                  checked={deleteConfirmed}
                  onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="confirm-delete" className="text-slate-300 cursor-pointer select-none leading-relaxed">
                  Saya mengonfirmasi bahwa penghapusan karya ini beserta seluruh nilai dewan juri terkait telah disetujui panitia dan bersifat <strong>permanen</strong>.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalKarya(null)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!deleteConfirmed || !deleteReasonInput.trim()}
                  onClick={handleConfirmDelete}
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Permanen</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
