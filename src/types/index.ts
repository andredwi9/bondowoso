export type KategoriLomba = 'Pariwisata' | 'Budaya' | 'Kuliner' | 'Ekonomi Kreatif' | 'Potensi Desa';

export type StatusTeknis = 'PASS' | 'RED_FLAG' | 'WARNING' | 'LOW_QUALITY';

export interface Peserta {
  id: string;
  nama: string;
  email: string;
  kontak: string;
  instansi?: string;
  kota: string;
  social_media_link?: string;
}

export interface VideoMetadata {
  duration_seconds: number;
  width: number;
  height: number;
  aspect_ratio: number; // width / height
  fps: number;
  bitrate_kbps: number;
  codec: string;
  audio_codec: string;
  audio_sample_rate_khz: number;
  audio_bitrate_kbps: number;
}

export interface ReverseStoryboardScene {
  scene_index: number;
  start_timecode: string;
  end_timecode: string;
  keyframe_description: string;
  estimated_prompt: string;
  detected_ai_platform: string; // e.g. "Google Veo", "Kling AI v1.5", "Runway Gen-3", "Midjourney v6", "Luma Dream Machine"
}

export interface CulturalRAGResult {
  detected_bondowoso_entities: string[];
  subtema_match_score: number; // 0 - 100
  audio_transcript_text: string;
  indonesian_grammar_score: number;
  cultural_verification_notes: string;
}

export interface ForensicAnomaly {
  timecode: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ForensicInspection {
  ai_visual_percentage: number; // e.g. 85%
  live_action_percentage: number; // e.g. 15%
  visual_consistency_score: number; // 0 - 100
  temporal_flicker_index: number; // 0 - 100
  audio_sync_score: number; // 0 - 100
  anomaly_timecodes: ForensicAnomaly[];
  fraud_risk_score: number; // 0 - 100 (if > 40% and score > 85, triggers verification ticket)
}

export interface AgentAspectScore {
  score: number; // 1 - 100
  reason: string;
}

export interface AgentScorecard {
  ide_konten: AgentAspectScore; // Bobot 0.25
  pemanfaatan_ai: AgentAspectScore; // Bobot 0.20
  alur_cerita: AgentAspectScore; // Bobot 0.20
  kerapian: AgentAspectScore; // Bobot 0.15
  kualitas_video: AgentAspectScore; // Bobot 0.20
  total_score: number;
  alasan_umum: string;
  generated_at: string;
}

export interface AIAnalysisResult {
  karya_id: string;
  score: number; // 1 - 100
  status: 'PASS' | 'REVIEW';
  confidence: number;
  reverse_storyboard?: ReverseStoryboardScene[];
  cultural_rag?: CulturalRAGResult;
  forensics?: ForensicInspection;
  agent_scorecard?: AgentScorecard;
  summary: string;
  analyzed_at: string;
}

export interface VerificationTicket {
  id: string;
  submission_id: string;
  karya_title: string;
  participant_name: string;
  trigger_reason: string;
  requested_files: string[];
  fraud_risk_score: number;
  agent_score: number;
  status: 'TERKIRIM' | 'MENUNGGU_VERIFIKASI' | 'TERVERIFIKASI' | 'DITOLAK';
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface CoPilotMessage {
  id: string;
  karya_id: string;
  sender: 'judge' | 'copilot';
  text: string;
  cited_timecodes?: string[];
  timestamp: string;
}

export interface Karya {
  id: string; // e.g. "BND01"
  peserta_id: string;
  judul_karya: string;
  kategori: KategoriLomba;
  deskripsi: string;
  video_url: string;
  video_filename: string;
  thumbnail_url?: string;
  prompt_list_text?: string;
  prompt_tools?: string[];
  dokumen_pendukung_nama?: string;
  metadata: VideoMetadata;
  status_teknis: StatusTeknis;
  status_teknis_reasons: string[];
  is_overridden: boolean;
  override_reason?: string;
  override_by?: string;
  override_at?: string;
  ai_analysis?: AIAnalysisResult;
  verification_ticket_id?: string;
  created_at: string;
}

export interface AspectScores {
  skor_tema: number; // Bobot 25% (Ide Konten di v2)
  skor_kreativitas: number; // Bobot 20% (Pemanfaatan AI di v2)
  skor_visual_ai: number; // Bobot 20% (Alur Cerita di v2)
  skor_editing: number; // Bobot 15% (Kerapian Pengerjaan di v2)
  skor_audio: number; // Bobot 20% (Kualitas Video di v2)
}

export interface PenilaianJuri extends AspectScores {
  id: string;
  karya_id: string;
  juri_id: string;
  juri_nama: string;
  juri_peran: string;
  total_skor: number;
  catatan_evaluasi: string;
  aspect_reasons?: {
    ide_konten: string;
    pemanfaatan_ai: string;
    alur_cerita: string;
    kerapian: string;
    kualitas_video: string;
  };
  is_overridden_from_ai?: boolean;
  status: 'DRAFT' | 'SUBMITTED';
  autosaved_at?: string;
  submitted_at?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  ip_address: string;
  user_role: string;
  user_name: string;
  action: string;
  karya_id?: string;
  details: string;
}

export interface UserRoleSession {
  role: 'admin' | 'juri' | 'executive' | 'viewer';
  juri_id?: string;
  name: string;
  blind_review_mode: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  karya: Karya;
  peserta: Peserta;
  skor_ai: number;
  skor_ai_pass: boolean;
  juri_scores: {
    juri_id: string;
    juri_nama: string;
    total: number;
    submitted: boolean;
  }[];
  skor_juri_avg: number;
  total_akhir: number;
  is_disqualified: boolean;
  semua_juri_selesai: boolean;
}
