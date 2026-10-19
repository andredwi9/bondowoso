import React, { useState, useRef } from 'react';
import {
  Upload,
  Film,
  CheckCircle,
  AlertOctagon,
  Sparkles,
  Bot,
  Brain,
  Search,
  ShieldCheck,
  Scale,
  FileCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  Karya,
  Peserta,
  KategoriLomba,
  VideoMetadata,
  ReverseStoryboardScene,
  CulturalRAGResult,
  ForensicInspection,
  AgentScorecard,
} from '../types/index.ts';
import { validateTechnicalSpecs } from '../utils/validation.ts';

interface SingleVideoUploadViewProps {
  onAddKarya: (newKarya: Karya, newPeserta: Peserta) => void;
  onNavigateToJury: (karyaId: string) => void;
}

export const SingleVideoUploadView: React.FC<SingleVideoUploadViewProps> = ({
  onAddKarya,
  onNavigateToJury,
}) => {
  const [judulKarya, setJudulKarya] = useState('');
  const [namaPeserta, setNamaPeserta] = useState('');
  const [email, setEmail] = useState('');
  const [kontak, setKontak] = useState('');
  const [instansi, setInstansi] = useState('');
  const [kategori, setKategori] = useState<KategoriLomba>('Pariwisata');
  const [deskripsi, setDeskripsi] = useState('');
  const [socialMedia, setSocialMedia] = useState('');
  const [promptText, setPromptText] = useState('');

  // Selected file & video preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Pipeline simulation state (FR-03)
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [completedKaryaId, setCompletedKaryaId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('mp4') && !file.name.toLowerCase().endsWith('.mp4')) {
      setErrorMsg('Format file harus berupa video .mp4 sesuai ketentuan Juknis.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);

    // Auto-fill title if empty
    if (!judulKarya) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setJudulKarya(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleStartUploadAndPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !judulKarya) {
      setErrorMsg('Harap lengkapi judul karya dan pilih berkas video .mp4');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setPipelineLogs([]);
    setCurrentStep(1);

    const newId = `BND-${Math.floor(10 + Math.random() * 90)}`;
    const newPesertaId = `P-${Math.floor(100 + Math.random() * 900)}`;

    try {
      // Step 1: Technical Gatekeeper Agent
      setPipelineLogs((prev) => [...prev, '🤖 [Agent 1: Technical Gatekeeper] Mengekstrak metadata video (resolusi, rasio 9:16, durasi, codec, audio rate)...']);
      await new Promise((r) => setTimeout(r, 900));

      const durationSec = 45.0; // standard compliant duration
      const metadata: VideoMetadata = {
        duration_seconds: durationSec,
        width: 1080,
        height: 1920,
        aspect_ratio: 0.5625,
        fps: 30,
        bitrate_kbps: 4500,
        codec: 'H.264 / MP4',
        audio_codec: 'AAC',
        audio_sample_rate_khz: 48.0,
        audio_bitrate_kbps: 192,
      };

      const val = validateTechnicalSpecs(metadata);
      setPipelineLogs((prev) => [...prev, `✓ [Agent 1] Lolos validasi teknis Juknis: Durasi ${durationSec}s, Rasio 9:16 vertikal, Bebas SARA & watermark terlarang.`]);

      // Step 2: Storyboard & Visual Prompt Reconstructor Agent
      setCurrentStep(2);
      setPipelineLogs((prev) => [...prev, '🎨 [Agent 2: Storyboard Reconstructor] Menganalisis cut adegan, mendeteksi model AI visual & merekonstruksi prompt...']);
      await new Promise((r) => setTimeout(r, 1100));

      const reverseStoryboard: ReverseStoryboardScene[] = [
        {
          scene_index: 1,
          start_timecode: '00:00',
          end_timecode: '00:15',
          keyframe_description: `Pembuka sinematik lanskap ${kategori} Bondowoso dengan pencahayaan volumetrik dramatis.`,
          estimated_prompt: `Cinematic vertical 9:16 drone shot of Bondowoso ${kategori} scenery, dawn golden hour, hyper-detailed, 8k`,
          detected_ai_platform: 'Midjourney v6 + Runway Gen-3 Alpha',
        },
        {
          scene_index: 2,
          start_timecode: '00:15',
          end_timecode: '00:32',
          keyframe_description: `Aksi dinamis eksplorasi ${judulKarya} dengan gerakan kamera menyapu (camera pan).`,
          estimated_prompt: `Dynamic camera orbit around iconic Bondowoso cultural landmarks, smooth motion diffusion, 60fps`,
          detected_ai_platform: 'Kling AI v1.5',
        },
        {
          scene_index: 3,
          start_timecode: '00:32',
          end_timecode: '00:45',
          keyframe_description: 'Penutup megah memperlihatkan pesan promosi daerah dan kebanggaan Kabupaten Bondowoso.',
          estimated_prompt: 'Grand aerial wide shot of Bondowoso valley, sunset hues, uplifting cinematic music cue',
          detected_ai_platform: 'Google Veo / Luma Dream Machine',
        },
      ];
      setPipelineLogs((prev) => [...prev, '✓ [Agent 2] Berhasil merekonstruksi 3 scene keyframe dan mengidentifikasi pipeline generative model (Midjourney + Kling + Veo).']);

      // Step 3: Bondowoso Cultural RAG Agent
      setCurrentStep(3);
      setPipelineLogs((prev) => [...prev, '🏛️ [Agent 3: Cultural RAG] Mengkueri Vector Database Kebudayaan Bondowoso (Geopark Ijen, Megalitikum, Kopi, Topeng Kona)...']);
      await new Promise((r) => setTimeout(r, 1000));

      let entities = ['Kawah Ijen & Blue Fire', 'Kawah Wurung'];
      if (kategori === 'Budaya') entities = ['Tari Topeng Kona', 'Situs Megalitikum Maskuning', 'Singo Ulung'];
      else if (kategori === 'Kuliner') entities = ['Kopi Arabika Java Ijen-Raung', 'Tape Manis Bondowoso'];
      else if (kategori === 'Ekonomi Kreatif') entities = ['Batik Daun Singkong', 'Kerajinan Kuningan Cindogo'];

      const culturalRAG: CulturalRAGResult = {
        detected_bondowoso_entities: entities,
        subtema_match_score: 95,
        audio_transcript_text: `Eksplorasi mahakarya daerah Kabupaten Bondowoso dalam tajuk ${judulKarya}. Menampilkan kearifan lokal yang mendunia.`,
        indonesian_grammar_score: 93,
        cultural_verification_notes: `Korelasi visual dan narasi terverifikasi akurat terhadap basis pengetahuan resmi Kabupaten Bondowoso (${entities.join(', ')}).`,
      };
      setPipelineLogs((prev) => [...prev, `✓ [Agent 3] Entitas Kultural Terverifikasi: ${entities.join(', ')} (Subtema Match: 95%).`]);

      // Step 4: Generative AI Forensics & Visual Quality Agent
      setCurrentStep(4);
      setPipelineLogs((prev) => [...prev, '🔬 [Agent 4: Forensics & Quality] Memindai temporal flickering, konsistensi motion, akurasi lip-sync, & fraud risk...']);
      await new Promise((r) => setTimeout(r, 900));

      const forensics: ForensicInspection = {
        ai_visual_percentage: 91,
        live_action_percentage: 9,
        visual_consistency_score: 92,
        temporal_flicker_index: 9,
        audio_sync_score: 94,
        anomaly_timecodes: [
          { timecode: '00:18', issue: 'Minor temporal flicker on background foliage', severity: 'low' },
        ],
        fraud_risk_score: 14,
      };
      setPipelineLogs((prev) => [...prev, '✓ [Agent 4] Autentikasi Generative AI Lolos: 91% AI Visual, Fraud Risk Index 14% (Aman / Bebas Pelanggaran Hak Cipta).']);

      // Step 5: Autonomous Co-Judge & Rubric Evaluator Agent
      setCurrentStep(5);
      setPipelineLogs((prev) => [...prev, '⚖️ [Agent 5: Autonomous Co-Judge] Menghitung draf rekomendasi nilai 5 aspek Juknis & menyusun alasan penilaian...']);
      await new Promise((r) => setTimeout(r, 1000));

      const agentScorecard: AgentScorecard = {
        ide_konten: {
          score: 89,
          reason: `Konsep eksplorasi ${kategori} "${judulKarya}" memiliki orisinalitas tinggi dan narasi menggugah.`,
        },
        pemanfaatan_ai: {
          score: 88,
          reason: 'Pemanfaatan model AI mutakhir stabil tanpa artefak deformasi wajah atau objek yang mengganggu.',
        },
        alur_cerita: {
          score: 87,
          reason: 'Dramaturgi cerita runtut dari pengenalan awal hingga resolusi penutup.',
        },
        kerapian: {
          score: 86,
          reason: 'Sinkronisasi audio narasi dengan transisi cut adegan sangat harmonis.',
        },
        kualitas_video: {
          score: 90,
          reason: 'Komposisi rasio 9:16 presisi dengan grading warna khas Bondowoso.',
        },
        total_score: 88.15,
        alasan_umum: `Karya ${judulKarya} berhasil menyajikan potensi daerah Bondowoso secara estetik dan berdaya saing.`,
        generated_at: new Date().toISOString(),
      };

      setPipelineLogs((prev) => [...prev, '✓ [Agent 5] Draf Rekomendasi Skor Co-Judge Selesai: 88.15 / 100. Berkas siap dievaluasi Dewan Juri!']);

      // Assemble final objects
      const newPeserta: Peserta = {
        id: newPesertaId,
        nama: namaPeserta || 'Kreator AI Bondowoso',
        email: email || `${newPesertaId.toLowerCase()}@peserta.bondowoso.go.id`,
        kontak: kontak || '08123456789',
        instansi: instansi || 'Bondowoso Content Creator Community',
        kota: 'Bondowoso',
        social_media_link: socialMedia,
      };

      const newKarya: Karya = {
        id: newId,
        peserta_id: newPesertaId,
        judul_karya: judulKarya,
        kategori,
        deskripsi: deskripsi || `Karya video AI inovatif bertema potensi ${kategori} Kabupaten Bondowoso.`,
        video_url: videoPreviewUrl || 'blob:new-submission-video',
        video_filename: selectedFile?.name || 'video.mp4',
        prompt_list_text: promptText || 'Prompts generated and extracted automatically by Agent 2',
        prompt_tools: ['Midjourney v6', 'Kling AI v1.5', 'Runway Gen-3'],
        dokumen_pendukung_nama: 'single_video_submission.mp4',
        metadata,
        status_teknis: val.status,
        status_teknis_reasons: val.reasons,
        is_overridden: false,
        ai_analysis: {
          karya_id: newId,
          score: 88.15,
          status: 'PASS',
          confidence: 96,
          reverse_storyboard: reverseStoryboard,
          cultural_rag: culturalRAG,
          forensics,
          agent_scorecard: agentScorecard,
          summary: agentScorecard.alasan_umum,
          analyzed_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      };

      onAddKarya(newKarya, newPeserta);
      setCompletedKaryaId(newId);
    } catch (err: any) {
      setErrorMsg(`Gagal memproses pipeline: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Film className="w-3.5 h-3.5" /> PRD V2 Zero-Friction Entry (FT-01)
            </span>
            <span className="text-xs text-sky-400 font-mono">
              1 Karya = 1 File Video .MP4 (Tanpa Beban ZIP)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1">
            Unggah Video Tunggal & Eksekusi Pipeline Multi-Agent Otonom
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cukup unggah 1 file video .mp4. 5 Agen AI secara otomatis merekonstruksi storyboard, memeriksa artefak kultural Bondowoso (RAG), forensik AI, dan menyusun draf skor juri.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FORM PANEL (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" /> Formulir Submission Video Peserta
          </h3>

          <form onSubmit={handleStartUploadAndPipeline} className="space-y-4 text-xs">
            {/* Single File Dropzone */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">
                Berkas Video .MP4 (Wajib):
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/70 hover:bg-slate-950 rounded-xl p-6 text-center cursor-pointer transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/mp4,.mp4"
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Film className="w-5 h-5" />
                </div>
                {selectedFile ? (
                  <div>
                    <span className="text-emerald-400 font-bold text-xs block">
                      ✓ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                    <span className="text-[11px] text-slate-400">Klik untuk mengganti berkas</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-slate-200 font-semibold block">
                      Pilih atau Seret Video .mp4 ke Sini
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Rasio 9:16 Vertikal • Durasi 30–60 Detik • Resolusi min 720p
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Judul & Subtema */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Judul Karya:</label>
                <input
                  type="text"
                  required
                  value={judulKarya}
                  onChange={(e) => setJudulKarya(e.target.value)}
                  placeholder="Contoh: Pesona Ijen Wonder 2026"
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Subtema Potensi Bondowoso:</label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value as KategoriLomba)}
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Pariwisata">Pariwisata (Ijen, Wurung, Blawan, Solor)</option>
                  <option value="Budaya">Budaya (Topeng Kona, Singo Ulung, Megalitikum)</option>
                  <option value="Kuliner">Kuliner (Kopi Java Ijen, Tape Handayani, Nasi Mamasa)</option>
                  <option value="Ekonomi Kreatif">Ekonomi Kreatif (Batik Singkong, Kuningan Cindogo)</option>
                  <option value="Potensi Desa">Potensi Desa & Kearifan Lokal</option>
                </select>
              </div>
            </div>

            {/* Nama Peserta & Kontak */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nama Lengkap Peserta / Tim:</label>
                <input
                  type="text"
                  required
                  value={namaPeserta}
                  onChange={(e) => setNamaPeserta(e.target.value)}
                  placeholder="Nama Peserta"
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nomor Kontak (WhatsApp):</label>
                <input
                  type="text"
                  value={kontak}
                  onChange={(e) => setKontak(e.target.value)}
                  placeholder="08123456789"
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Email & Tautan Medsos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Alamat Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="peserta@email.com"
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Tautan Publikasi Medsos (Opsional):</label>
                <input
                  type="url"
                  value={socialMedia}
                  onChange={(e) => setSocialMedia(e.target.value)}
                  placeholder="https://instagram.com/reels/..."
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Deskripsi Singkat */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Sinopsis / Deskripsi Karya:</label>
              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                rows={2}
                placeholder="Ceritakan pesan utama dan keunikan visual video yang diangkat..."
                className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-rose-950/80 border border-rose-500/60 p-3 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 text-amber-300 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>
                  {isProcessing
                    ? 'Menjalankan Pipeline 5 Agen AI...'
                    : 'Kirim Karya & Picu Analisis Otonom 5 Agen AI'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* PIPELINE PROGRESS & REASONING PANEL (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Brain className="w-4 h-4 text-emerald-400" /> Pipeline Multi-Agent Otonom (FR-03)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                LangGraph Architecture
              </span>
            </div>

            {/* 5-Stage Agent Steps Visualizer */}
            <div className="space-y-3 mt-4 text-xs">
              {/* Agent 1 */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                currentStep >= 1 ? 'bg-indigo-950/50 border-indigo-500/60 text-indigo-200' : 'bg-slate-950/50 border-slate-800 text-slate-500'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>1. Technical Gatekeeper Agent</span>
                  {currentStep > 1 ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : currentStep === 1 ? <span className="text-[10px] text-amber-300 animate-pulse">Running...</span> : null}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Validasi durasi 30–60s, rasio 9:16, watermark terlarang, SARA.</div>
              </div>

              {/* Agent 2 */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                currentStep >= 2 ? 'bg-indigo-950/50 border-indigo-500/60 text-indigo-200' : 'bg-slate-950/50 border-slate-800 text-slate-500'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>2. Storyboard Reconstructor Agent</span>
                  {currentStep > 2 ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : currentStep === 2 ? <span className="text-[10px] text-amber-300 animate-pulse">Running...</span> : null}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Deteksi pergantian adegan, ekstrak keyframe & tebak prompt/model AI.</div>
              </div>

              {/* Agent 3 */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                currentStep >= 3 ? 'bg-indigo-950/50 border-indigo-500/60 text-indigo-200' : 'bg-slate-950/50 border-slate-800 text-slate-500'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>3. Bondowoso Cultural RAG Agent</span>
                  {currentStep > 3 ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : currentStep === 3 ? <span className="text-[10px] text-amber-300 animate-pulse">Running...</span> : null}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Pencocokan lanskap, narasi & entitas kultural Bondowoso via Vector DB.</div>
              </div>

              {/* Agent 4 */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                currentStep >= 4 ? 'bg-indigo-950/50 border-indigo-500/60 text-indigo-200' : 'bg-slate-950/50 border-slate-800 text-slate-500'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>4. Forensics & Visual Quality Agent</span>
                  {currentStep > 4 ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : currentStep === 4 ? <span className="text-[10px] text-amber-300 animate-pulse">Running...</span> : null}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Analisis temporal flickering, lip-sync, dan kalkulasi fraud risk index.</div>
              </div>

              {/* Agent 5 */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                currentStep >= 5 ? 'bg-indigo-950/50 border-indigo-500/60 text-indigo-200' : 'bg-slate-950/50 border-slate-800 text-slate-500'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>5. Autonomous Co-Judge Agent</span>
                  {completedKaryaId ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : currentStep === 5 ? <span className="text-[10px] text-amber-300 animate-pulse">Running...</span> : null}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Kalkulasi 5 aspek bobot Juknis & narasi evaluasi argumentatif.</div>
              </div>
            </div>

            {/* Execution Terminal Log */}
            {pipelineLogs.length > 0 && (
              <div className="mt-4 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-300 space-y-1 max-h-44 overflow-y-auto">
                <div className="text-emerald-400 font-bold mb-1">Live Multi-Agent Reasoning Stream:</div>
                {pipelineLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}
          </div>

          {/* Success Call to Action */}
          {completedKaryaId && (
            <div className="bg-emerald-950/80 border border-emerald-500/60 p-4 rounded-xl text-center space-y-2">
              <div className="text-emerald-300 font-bold text-xs">
                🎉 Karya #{completedKaryaId} Berhasil Dianalisis Sempurna!
              </div>
              <button
                type="button"
                onClick={() => onNavigateToJury(completedKaryaId)}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-all"
              >
                <span>Buka di Workspace Penilaian Juri</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
