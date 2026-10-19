import type { AspectScores, Karya, LeaderboardEntry, PenilaianJuri, Peserta } from '../types/index.ts';

/**
 * Bobot Resmi Juknis Penilaian PRD V2 (Lampiran D.1):
 * 1. Ide Konten: 0.25 (25%)
 * 2. Pemanfaatan Teknologi AI: 0.20 (20%)
 * 3. Alur Cerita: 0.20 (20%)
 * 4. Kerapian Pengerjaan Konten: 0.15 (15%)
 * 5. Kualitas Video: 0.20 (20%)
 * TOTAL BOBOT = 1.00 (100%)
 */
export const BOBOT_PENILAIAN_V2 = {
  ide_konten: 0.25,
  pemanfaatan_ai: 0.20,
  alur_cerita: 0.20,
  kerapian: 0.15,
  kualitas_video: 0.20,
} as const;

export const BOBOT_TOTAL_AKHIR = {
  juri: 0.80,
  ai: 0.20,
} as const;

/**
 * Menghitung skor terbobot individual juri (1 - 100) sesuai PRD V2 Lampiran D.1
 */
export function calculateJuryScore(scores: AspectScores): number {
  const ide = Math.max(0, Math.min(100, scores.skor_tema || 0));
  const ai = Math.max(0, Math.min(100, scores.skor_kreativitas || 0));
  const alur = Math.max(0, Math.min(100, scores.skor_visual_ai || 0));
  const kerapian = Math.max(0, Math.min(100, scores.skor_editing || 0));
  const kualitas = Math.max(0, Math.min(100, scores.skor_audio || 0));

  const weighted =
    ide * BOBOT_PENILAIAN_V2.ide_konten +
    ai * BOBOT_PENILAIAN_V2.pemanfaatan_ai +
    alur * BOBOT_PENILAIAN_V2.alur_cerita +
    kerapian * BOBOT_PENILAIAN_V2.kerapian +
    kualitas * BOBOT_PENILAIAN_V2.kualitas_video;

  return Math.round(weighted * 100) / 100;
}

/**
 * Menghitung Total Akhir:
 * Total Akhir = (Skor Rata-rata Juri * 0.80) + (Skor AI * 0.20)
 */
export function calculateTotalAkhir(skorJuriAvg: number, skorAI: number, hasJuryScore: boolean): number {
  if (!hasJuryScore) {
    return 0;
  }
  const total = skorJuriAvg * BOBOT_TOTAL_AKHIR.juri + skorAI * BOBOT_TOTAL_AKHIR.ai;
  return Math.round(total * 100) / 100;
}

/**
 * Menghitung akumulasi nilai dan ranking untuk Live Leaderboard
 */
export function buildLeaderboardEntries(
  karyas: Karya[],
  pesertas: Record<string, Peserta>,
  penilaians: PenilaianJuri[]
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = karyas.map((karya) => {
    const peserta = pesertas[karya.peserta_id] || {
      id: karya.peserta_id,
      nama: 'Anonim',
      email: '-',
      kontak: '-',
      kota: 'Bondowoso',
    };

    const relatedPenilaians = penilaians.filter((p) => p.karya_id === karya.id);
    const submittedPenilaians = relatedPenilaians.filter((p) => p.status === 'SUBMITTED');

    const juriScores = relatedPenilaians.map((p) => ({
      juri_id: p.juri_id,
      juri_nama: p.juri_nama,
      total: p.total_skor,
      submitted: p.status === 'SUBMITTED',
    }));

    const sumJuri = submittedPenilaians.reduce((acc, curr) => acc + curr.total_skor, 0);
    const avgJuri = submittedPenilaians.length > 0 ? Math.round((sumJuri / submittedPenilaians.length) * 100) / 100 : 0;

    const skorAI = karya.ai_analysis ? karya.ai_analysis.score : 0;
    const skorAIPass = karya.ai_analysis ? karya.ai_analysis.status === 'PASS' : false;

    const isDisqualified = karya.status_teknis === 'RED_FLAG' && !karya.is_overridden;
    const totalAkhir = isDisqualified ? 0 : calculateTotalAkhir(avgJuri, skorAI, submittedPenilaians.length > 0);

    return {
      rank: 0,
      karya,
      peserta,
      skor_ai: skorAI,
      skor_ai_pass: skorAIPass,
      juri_scores: juriScores,
      skor_juri_avg: avgJuri,
      total_akhir: totalAkhir,
      is_disqualified: isDisqualified,
      semua_juri_selesai: submittedPenilaians.length >= 3,
    };
  });

  // Sort: non-disqualified first sorted by total_akhir desc, then disqualified at the bottom
  entries.sort((a, b) => {
    if (a.is_disqualified && !b.is_disqualified) return 1;
    if (!a.is_disqualified && b.is_disqualified) return -1;
    if (b.total_akhir !== a.total_akhir) {
      return b.total_akhir - a.total_akhir;
    }
    return b.skor_ai - a.skor_ai;
  });

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = entry.is_disqualified ? 999 : index + 1;
  });

  return entries;
}
