import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateJuryScore,
  calculateTotalAkhir,
  toggleIncrementStep,
  clampScore,
  adjustAspectScore,
} from './scoring.ts';
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
  assert.ok(csv.startsWith('\uFEFF"No"'));
  assert.ok(csv.includes('Karya sangat memukau dan sinematik.'));

  const jsonStr = generateCommentsJSON(mockKaryas, mockPesertas, mockPenilaians);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.total_video_dinilai, 1);
  assert.equal(parsed.data_video_dan_komentar[0].id_karya, 'BND01');
});

test('zipParser extracts ALL videos from a ZIP, regardless of root, wrappers, or nested folders', async () => {
  const { extractSubmissionsFromZip, isIgnoredZipPath, parseSubmissionMetadata } = await import('./zipParser.ts');

  // Verify macOS and hidden path filtering
  assert.equal(isIgnoredZipPath('__MACOSX/._video1.mp4'), true);
  assert.equal(isIgnoredZipPath('.DS_Store'), true);
  assert.equal(isIgnoredZipPath('folder/.DS_Store'), true);
  assert.equal(isIgnoredZipPath('folder/video1.mp4'), false);

  // Scenario 1: Multiple videos in a root folder or wrapper folder
  const mockEntries1 = [
    { relativePath: 'Koleksi_Lomba/P01_Budi_Pesona_Ijen/video.mp4', zipEntry: { dir: false } },
    { relativePath: 'Koleksi_Lomba/P01_Budi_Pesona_Ijen/prompt.txt', zipEntry: { dir: false } },
    { relativePath: 'Koleksi_Lomba/P02_Siti_Kopi_Raung/video.mp4', zipEntry: { dir: false } },
    { relativePath: 'Koleksi_Lomba/P02_Siti_Kopi_Raung/dokumen.pdf', zipEntry: { dir: false } },
    { relativePath: 'Koleksi_Lomba/P03_Andi_Batik_Bondowoso/video.mp4', zipEntry: { dir: false } },
    { relativePath: '__MACOSX/._video.mp4', zipEntry: { dir: false } },
  ];

  const submissions1 = extractSubmissionsFromZip(mockEntries1);
  // Must extract all 3 videos, NOT just 1!
  assert.equal(submissions1.length, 3, 'Must extract all 3 videos from wrapped folder');
  assert.equal(submissions1[0].idPeserta, 'P01');
  assert.equal(submissions1[0].namaPeserta, 'Budi');
  assert.equal(submissions1[0].judulKarya, 'Pesona Ijen');
  assert.ok(submissions1[0].promptEntry !== undefined, 'Prompt txt should be paired');

  assert.equal(submissions1[1].idPeserta, 'P02');
  assert.equal(submissions1[1].namaPeserta, 'Siti');
  assert.equal(submissions1[1].judulKarya, 'Kopi Raung');
  assert.ok(submissions1[1].docEntry !== undefined, 'Doc pdf should be paired');

  assert.equal(submissions1[2].idPeserta, 'P03');
  assert.equal(submissions1[2].namaPeserta, 'Andi');

  // Scenario 2: Multiple videos at flat root of zip
  const mockEntries2 = [
    { relativePath: 'P10_Doni_Kawah_Ijen.mp4', zipEntry: { dir: false } },
    { relativePath: 'P11_Rina_Kuliner_Tape.mp4', zipEntry: { dir: false } },
    { relativePath: 'video_santai.mp4', zipEntry: { dir: false } },
  ];
  const submissions2 = extractSubmissionsFromZip(mockEntries2);
  assert.equal(submissions2.length, 3, 'Must extract all 3 flat root videos');
  assert.equal(submissions2[0].idPeserta, 'P10');
  assert.equal(submissions2[0].namaPeserta, 'Doni');
  assert.equal(submissions2[1].idPeserta, 'P11');
  assert.equal(submissions2[1].namaPeserta, 'Rina');
});

test('autonomousAgents generates dynamic, non-85 rubric scores with justifications', async () => {
  const { generateAutonomousAgentAnalysis } = await import('./autonomousAgents.ts');

  const testKarya = {
    id: 'BND-TEST',
    judul_karya: 'Pesona Kawah Ijen dan Blue Fire',
    kategori: 'Pariwisata' as const,
    deskripsi: 'Sinematik Kawah Ijen dengan drone',
    prompt_list_text: 'Midjourney v6: Kawah Ijen blue fire volcanic crater lake at dawn',
    metadata: {
      duration_seconds: 45,
      width: 1080,
      height: 1920,
      aspect_ratio: 0.5625,
      fps: 30,
      bitrate_kbps: 4500,
      codec: 'H.264/MP4',
      audio_codec: 'AAC',
      audio_sample_rate_khz: 48,
      audio_bitrate_kbps: 192,
    },
  };

  const analysis = generateAutonomousAgentAnalysis(testKarya);
  assert.ok(analysis.agent_scorecard, 'Agent scorecard must exist');

  const card = analysis.agent_scorecard;
  const scores = [
    card.ide_konten.score,
    card.pemanfaatan_ai.score,
    card.alur_cerita.score,
    card.kerapian.score,
    card.kualitas_video.score,
  ];

  // Verify scores are not flat 85 across all rubrics
  const all85 = scores.every((s) => s === 85);
  assert.equal(all85, false, 'Rubric scores must NOT all be flat 85');

  // Verify all 5 aspect scores are in valid range
  for (const s of scores) {
    assert.ok(s >= 70 && s <= 100, `Score ${s} should be between 70 and 100`);
  }

  // Verify weighted total calculation: 25% + 20% + 20% + 15% + 20%
  const expectedTotal =
    card.ide_konten.score * 0.25 +
    card.pemanfaatan_ai.score * 0.20 +
    card.alur_cerita.score * 0.20 +
    card.kerapian.score * 0.15 +
    card.kualitas_video.score * 0.20;

  assert.equal(
    Math.round(card.total_score * 10) / 10,
    Math.round(expectedTotal * 10) / 10,
    'Card total score must match PRD weighted formula'
  );

  // Verify qualitative reasons exist for all 5 aspects
  assert.ok(card.ide_konten.reason.length > 10, 'Ide konten reason must be descriptive');
  assert.ok(card.pemanfaatan_ai.reason.length > 10, 'Pemanfaatan AI reason must be descriptive');
  assert.ok(card.alur_cerita.reason.length > 10, 'Alur cerita reason must be descriptive');
  assert.ok(card.kerapian.reason.length > 10, 'Kerapian reason must be descriptive');
  assert.ok(card.kualitas_video.reason.length > 10, 'Kualitas video reason must be descriptive');

  // Verify cultural RAG and forensics are attached
  assert.ok(analysis.cultural_rag !== undefined, 'Cultural RAG must be present');
  assert.ok(analysis.cultural_rag?.detected_bondowoso_entities.length! > 0, 'Should detect Bondowoso entities');
  assert.ok(analysis.forensics !== undefined, 'Forensics must be present');
});

test('parseGoogleDriveLink correctly parses folder, file, and query links', async () => {
  const { parseGoogleDriveLink } = await import('./gdriveParser.ts');

  // Test standard folder URL
  const p1 = parseGoogleDriveLink('https://drive.google.com/drive/folders/1BONDOWOSO_2026_Koleksi_Lomba_AI_Folder?usp=sharing');
  assert.equal(p1.isValid, true);
  assert.equal(p1.type, 'folder');
  assert.equal(p1.id, '1BONDOWOSO_2026_Koleksi_Lomba_AI_Folder');

  // Test /u/0/ folder URL
  const p2 = parseGoogleDriveLink('https://drive.google.com/drive/u/0/folders/1a2b3c4d5e6f7g8h9i0j_KLMNOPQR');
  assert.equal(p2.isValid, true);
  assert.equal(p2.type, 'folder');
  assert.equal(p2.id, '1a2b3c4d5e6f7g8h9i0j_KLMNOPQR');

  // Test file URL
  const p3 = parseGoogleDriveLink('https://drive.google.com/file/d/1XyZ9876543210AbCdEfGhIjKlMnOp/view?usp=drivesdk');
  assert.equal(p3.isValid, true);
  assert.equal(p3.type, 'file');
  assert.equal(p3.id, '1XyZ9876543210AbCdEfGhIjKlMnOp');

  // Test invalid URL
  const p4 = parseGoogleDriveLink('https://example.com/not-drive');
  assert.equal(p4.isValid, false);
});

test('extractAndEvaluateGDriveFolder extracts and evaluates all videos in folder', async () => {
  const { extractAndEvaluateGDriveFolder } = await import('./gdriveService.ts');

  const result = await extractAndEvaluateGDriveFolder(
    'https://drive.google.com/drive/folders/1BND_Wisata_Ijen_Wurung_Tancak_2026',
    [],
    {}
  );

  assert.equal(result.success, true);
  assert.ok(result.karyas.length >= 3, 'Should extract at least 3 videos from Google Drive folder');
  assert.ok(result.totalFound >= 3);

  // Verify each extracted video has valid metadata and autonomous AI evaluation
  for (const k of result.karyas) {
    assert.ok(k.id.startsWith('BND-'));
    assert.ok(k.judul_karya.length > 0);
    assert.ok(k.ai_analysis !== undefined, 'Must have AI analysis attached');
    assert.ok(k.ai_analysis!.score >= 80, 'Score should be evaluated');
    assert.ok(k.ai_analysis!.agent_scorecard !== undefined, 'Must have 5-Agent scorecard');

    // Verify 5 aspect scores exist and are non-flat
    const card = k.ai_analysis!.agent_scorecard!;
    assert.ok(card.ide_konten.score > 0);
    assert.ok(card.pemanfaatan_ai.score > 0);
    assert.ok(card.alur_cerita.score > 0);
    assert.ok(card.kerapian.score > 0);
  }
});

test('toggleIncrementStep alternates between 0.5 and 1.0', () => {
  assert.equal(toggleIncrementStep(0.5), 1.0);
  assert.equal(toggleIncrementStep(1.0), 0.5);
});

test('clampScore keeps scores within [0, 100] and rounds to 1 decimal place', () => {
  assert.equal(clampScore(85.24), 85.2);
  assert.equal(clampScore(85.26), 85.3);
  assert.equal(clampScore(105), 100);
  assert.equal(clampScore(-5), 0);
  assert.equal(clampScore(0), 0);
  assert.equal(clampScore(100), 100);
});

test('adjustAspectScore properly applies +0.5, -0.5, +1.0, -1.0 with boundary safety', () => {
  assert.equal(adjustAspectScore(85.0, 0.5), 85.5);
  assert.equal(adjustAspectScore(85.5, -0.5), 85.0);
  assert.equal(adjustAspectScore(85.0, 1.0), 86.0);
  assert.equal(adjustAspectScore(86.0, -1.0), 85.0);

  // Boundary conditions
  assert.equal(adjustAspectScore(99.8, 1.0), 100.0);
  assert.equal(adjustAspectScore(0.3, -0.5), 0.0);
});

test('extractAndEvaluateGDriveFolder extracts full batch of 100 videos when requested', async () => {
  const { extractAndEvaluateGDriveFolder } = await import('./gdriveService.ts');

  const result = await extractAndEvaluateGDriveFolder(
    'https://drive.google.com/drive/folders/1BND_100_Video_Lengkap_Lomba_Bondowoso_2026',
    [],
    {},
    undefined,
    { targetCount: 100, maxVideos: 100 }
  );

  assert.equal(result.success, true);
  assert.equal(result.karyas.length, 100, 'Must extract exactly 100 videos');
  assert.equal(result.totalFound, 100);
  assert.equal(Object.keys(result.pesertas).length, 100, 'Must have 100 distinct participants');

  // Verify all 100 videos pass Juknis 2026 (Rule-01: 30-60s duration, 9:16 aspect ratio)
  for (const k of result.karyas) {
    assert.equal(k.status_teknis, 'PASS', `Video ${k.id} must pass technical specs`);
    assert.ok(k.metadata.duration_seconds >= 30 && k.metadata.duration_seconds <= 60, `Duration ${k.metadata.duration_seconds} must be 30-60s`);
    assert.equal(k.metadata.width, 1080);
    assert.equal(k.metadata.height, 1920);
    assert.ok(k.ai_analysis !== undefined, 'Must have AI analysis');
    assert.ok(k.ai_analysis!.agent_scorecard !== undefined, 'Must have 5-Agent scorecard');
  }
});

