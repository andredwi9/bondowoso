import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateJuryScore, calculateTotalAkhir } from './scoring.ts';
import { validateTechnicalSpecs, canJuryScoreWork } from './validation.ts';

test('calculateJuryScore calculates weighted formula correctly based on PRD V2 Lampiran D.1', () => {
  // PRD V2 Lampiran D.1 Official Example (Judul: BONDOWOSO BUKAN YANG INI):
  // 1. Ide Konten (25%): 85 * 0.25 = 21.25
  // 2. Pemanfaatan AI (20%): 80 * 0.20 = 16.00
  // 3. Alur Cerita (20%): 88 * 0.20 = 17.60
  // 4. Kerapian Pengerjaan (15%): 85 * 0.15 = 12.75
  // 5. Kualitas Video (20%): 85 * 0.20 = 17.00
  // Total = 21.25 + 16.00 + 17.60 + 12.75 + 17.00 = 84.60
  const score = calculateJuryScore({
    skor_tema: 85,
    skor_kreativitas: 80,
    skor_visual_ai: 88,
    skor_editing: 85,
    skor_audio: 85,
  });

  assert.equal(score, 84.6);
});

test('calculateTotalAkhir computes 80% jury + 20% AI score', () => {
  // PRD Page 6 example: Juri 92.4, AI 98.5
  // 92.4 * 0.8 = 73.92, 98.5 * 0.2 = 19.70 -> Total = 93.62
  const total = calculateTotalAkhir(92.4, 98.5, true);
  assert.equal(Math.round(total * 10) / 10, 93.6);
});

test('validateTechnicalSpecs accepts valid 9:16 vertical video within 30-60s', () => {
  const result = validateTechnicalSpecs({
    duration_seconds: 45.2,
    width: 1080,
    height: 1920,
    aspect_ratio: 1080 / 1920, // 0.5625
    fps: 30,
    bitrate_kbps: 4500,
    codec: 'H.264/MP4',
    audio_codec: 'AAC',
    audio_sample_rate_khz: 48,
    audio_bitrate_kbps: 192,
  });

  assert.equal(result.status, 'PASS');
  assert.equal(result.durationValid, true);
  assert.equal(result.aspectRatioValid, true);
  assert.equal(result.resolutionValid, true);
  assert.equal(result.reasons.length, 0);
});

test('validateTechnicalSpecs red flags video under 29.5s or over 60.5s', () => {
  const tooShort = validateTechnicalSpecs({
    duration_seconds: 24.0,
    width: 1080,
    height: 1920,
    aspect_ratio: 0.5625,
    fps: 30,
    bitrate_kbps: 3000,
    codec: 'H.264',
    audio_codec: 'AAC',
    audio_sample_rate_khz: 44.1,
    audio_bitrate_kbps: 128,
  });
  assert.equal(tooShort.status, 'RED_FLAG');
  assert.equal(tooShort.durationValid, false);

  const tooLong = validateTechnicalSpecs({
    duration_seconds: 68.4,
    width: 1080,
    height: 1920,
    aspect_ratio: 0.5625,
    fps: 30,
    bitrate_kbps: 3000,
    codec: 'H.264',
    audio_codec: 'AAC',
    audio_sample_rate_khz: 44.1,
    audio_bitrate_kbps: 128,
  });
  assert.equal(tooLong.status, 'RED_FLAG');
  assert.equal(tooLong.durationValid, false);
});

test('validateTechnicalSpecs flags non 9:16 aspect ratio with Warning', () => {
  const horizontalVideo = validateTechnicalSpecs({
    duration_seconds: 45.0,
    width: 1920,
    height: 1080, // 16:9 landscape!
    aspect_ratio: 1920 / 1080,
    fps: 30,
    bitrate_kbps: 4000,
    codec: 'H.264',
    audio_codec: 'AAC',
    audio_sample_rate_khz: 48,
    audio_bitrate_kbps: 128,
  });
  assert.equal(horizontalVideo.status, 'WARNING');
  assert.equal(horizontalVideo.aspectRatioValid, false);
});

test('Rule-01: Disqualified video cannot be scored unless overridden by Admin', () => {
  assert.equal(canJuryScoreWork('RED_FLAG', false), false);
  assert.equal(canJuryScoreWork('RED_FLAG', true), true);
  assert.equal(canJuryScoreWork('PASS', false), true);
  assert.equal(canJuryScoreWork('WARNING', false), true);
});

test('PRD V2 bobot penilaian sums to 1.00 (100%)', () => {
  const sum = 0.25 + 0.20 + 0.20 + 0.15 + 0.20;
  assert.equal(Math.round(sum * 100) / 100, 1.00);
});

test('extractCommentRows correctly extracts comments and aspects from scored videos', async () => {
  const { extractCommentRows, generateCommentsCSV, generateCommentsJSON } = await import('./exportComments.ts');
  const mockKaryas = [
    {
      id: 'BND01',
      peserta_id: 'P-001',
      judul_karya: 'Ijen Wonder',
      kategori: 'Pariwisata' as const,
      deskripsi: 'Deskripsi Ijen',
      video_url: '',
      video_filename: 'video.mp4',
      metadata: { duration_seconds: 45, width: 1080, height: 1920, aspect_ratio: 0.5625, fps: 30, bitrate_kbps: 4000, codec: 'H.264', audio_codec: 'AAC', audio_sample_rate_khz: 48, audio_bitrate_kbps: 128 },
      status_teknis: 'PASS' as const,
      status_teknis_reasons: [],
      is_overridden: false,
      created_at: '2026-10-18T09:00:00Z',
    },
    {
      id: 'BND02',
      peserta_id: 'P-002',
      judul_karya: 'Unscored Video',
      kategori: 'Budaya' as const,
      deskripsi: 'Deskripsi',
      video_url: '',
      video_filename: 'video.mp4',
      metadata: { duration_seconds: 40, width: 1080, height: 1920, aspect_ratio: 0.5625, fps: 30, bitrate_kbps: 4000, codec: 'H.264', audio_codec: 'AAC', audio_sample_rate_khz: 48, audio_bitrate_kbps: 128 },
      status_teknis: 'PASS' as const,
      status_teknis_reasons: [],
      is_overridden: false,
      created_at: '2026-10-18T09:00:00Z',
    },
  ];

  const mockPesertas = {
    'P-001': { id: 'P-001', nama: 'Ahmad Fauzan', email: 'fauzan@test.com', kontak: '0812', kota: 'Bondowoso' },
    'P-002': { id: 'P-002', nama: 'Siti Aminah', email: 'siti@test.com', kontak: '0813', kota: 'Bondowoso' },
  };

  const mockPenilaians = [
    {
      id: 'PEN-1',
      karya_id: 'BND01',
      juri_id: 'juri-1',
      juri_nama: 'Dr. Ir. Budi Santoso',
      juri_peran: 'Ketua Juri',
      skor_tema: 90,
      skor_kreativitas: 90,
      skor_visual_ai: 90,
      skor_editing: 90,
      skor_audio: 90,
      total_skor: 90,
      catatan_evaluasi: 'Karya sangat memukau dan sinematik.',
      aspect_reasons: {
        ide_konten: 'Ide orisinal.',
        pemanfaatan_ai: 'Prompt akurat.',
        alur_cerita: 'Transisi halus.',
        kerapian: 'Audio bersih.',
        kualitas_video: 'Grading warna tepat.',
      },
      status: 'SUBMITTED' as const,
    },
  ];

  const rows = extractCommentRows(mockKaryas, mockPesertas, mockPenilaians);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].karya_id, 'BND01');
  assert.equal(rows[0].juri_nama, 'Dr. Ir. Budi Santoso');
  assert.equal(rows[0].catatan_evaluasi, 'Karya sangat memukau dan sinematik.');
  assert.equal(rows[0].catatan_ide_konten, 'Ide orisinal.');

  const csv = generateCommentsCSV(mockKaryas, mockPesertas, mockPenilaians);
  assert.ok(csv.startsWith('\uFEFF"ID Karya"'));
  assert.ok(csv.includes('Karya sangat memukau dan sinematik.'));

  const jsonStr = generateCommentsJSON(mockKaryas, mockPesertas, mockPenilaians);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.total_video_dinilai, 1);
  assert.equal(parsed.data_video_dan_komentar[0].id_karya, 'BND01');
});

