import type { Karya, PenilaianJuri, Peserta } from '../types/index.ts';

export interface ScoredVideoCommentEntry {
  karya_id: string;
  judul_karya: string;
  kategori: string;
  durasi_detik: number;
  peserta_nama: string;
  peserta_kota: string;
  penilaian_id: string;
  juri_id: string;
  juri_nama: string;
  juri_peran: string;
  total_skor: number;
  catatan_evaluasi: string;
  catatan_ide_konten: string;
  catatan_pemanfaatan_ai: string;
  catatan_alur_cerita: string;
  catatan_kerapian: string;
  catatan_kualitas_video: string;
  alasan_ai_multiagent: string;
  catatan_kultural_bondowoso: string;
  status_penilaian: string;
  waktu_submit: string;
}

/**
 * Extracts flat comment rows from scored videos and jury assessments
 */
export function extractCommentRows(
  karyas: Karya[],
  pesertas: Record<string, Peserta>,
  penilaians: PenilaianJuri[],
  filterKaryaId?: string
): ScoredVideoCommentEntry[] {
  const result: ScoredVideoCommentEntry[] = [];

  const targetKaryas = filterKaryaId
    ? karyas.filter((k) => k.id === filterKaryaId)
    : karyas;

  targetKaryas.forEach((karya) => {
    const peserta = pesertas[karya.peserta_id] || {
      id: karya.peserta_id,
      nama: 'Peserta Tidak Diketahui',
      email: '-',
      kontak: '-',
      kota: 'Bondowoso',
    };

    const karyaPenilaians = penilaians.filter((p) => p.karya_id === karya.id);

    // If there are jury evaluations
    if (karyaPenilaians.length > 0) {
      karyaPenilaians.forEach((penilaian) => {
        result.push({
          karya_id: karya.id,
          judul_karya: karya.judul_karya,
          kategori: karya.kategori,
          durasi_detik: karya.metadata.duration_seconds,
          peserta_nama: peserta.nama,
          peserta_kota: peserta.kota,
          penilaian_id: penilaian.id,
          juri_id: penilaian.juri_id,
          juri_nama: penilaian.juri_nama,
          juri_peran: penilaian.juri_peran,
          total_skor: penilaian.total_skor,
          catatan_evaluasi: penilaian.catatan_evaluasi || '-',
          catatan_ide_konten: penilaian.aspect_reasons?.ide_konten || '-',
          catatan_pemanfaatan_ai: penilaian.aspect_reasons?.pemanfaatan_ai || '-',
          catatan_alur_cerita: penilaian.aspect_reasons?.alur_cerita || '-',
          catatan_kerapian: penilaian.aspect_reasons?.kerapian || '-',
          catatan_kualitas_video: penilaian.aspect_reasons?.kualitas_video || '-',
          alasan_ai_multiagent: karya.ai_analysis?.agent_scorecard?.alasan_umum || karya.ai_analysis?.summary || '-',
          catatan_kultural_bondowoso: karya.ai_analysis?.cultural_rag?.cultural_verification_notes || '-',
          status_penilaian: penilaian.status,
          waktu_submit: penilaian.submitted_at || penilaian.autosaved_at || '-',
        });
      });
    }
  });

  return result;
}

/**
 * Generates RFC 4180 compliant CSV string with UTF-8 BOM
 */
export function generateCommentsCSV(
  karyas: Karya[],
  pesertas: Record<string, Peserta>,
  penilaians: PenilaianJuri[],
  filterKaryaId?: string
): string {
  const rows = extractCommentRows(karyas, pesertas, penilaians, filterKaryaId);

  const headers = [
    'ID Karya',
    'Judul Karya',
    'Kategori',
    'Nama Peserta',
    'Kota Peserta',
    'Durasi (s)',
    'ID Penilaian',
    'ID Juri',
    'Nama Dewan Juri',
    'Peran / Bidang Juri',
    'Total Skor',
    'Catatan Evaluasi Umum',
    'Alasan: Ide Konten (Bobot 25%)',
    'Alasan: Pemanfaatan AI (Bobot 20%)',
    'Alasan: Alur Cerita (Bobot 20%)',
    'Alasan: Kerapian Pengerjaan (Bobot 15%)',
    'Alasan: Kualitas Video (Bobot 20%)',
    'Catatan Evaluasi Multi-Agent AI',
    'Catatan Kultural Bondowoso',
    'Status Penilaian',
    'Waktu Penilaian',
  ];

  const escapeCSV = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return `"${s}"`;
  };

  const csvRows = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((r) =>
      [
        escapeCSV(r.karya_id),
        escapeCSV(r.judul_karya),
        escapeCSV(r.kategori),
        escapeCSV(r.peserta_nama),
        escapeCSV(r.peserta_kota),
        escapeCSV(r.durasi_detik),
        escapeCSV(r.penilaian_id),
        escapeCSV(r.juri_id),
        escapeCSV(r.juri_nama),
        escapeCSV(r.juri_peran),
        escapeCSV(r.total_skor.toFixed(2)),
        escapeCSV(r.catatan_evaluasi),
        escapeCSV(r.catatan_ide_konten),
        escapeCSV(r.catatan_pemanfaatan_ai),
        escapeCSV(r.catatan_alur_cerita),
        escapeCSV(r.catatan_kerapian),
        escapeCSV(r.catatan_kualitas_video),
        escapeCSV(r.alasan_ai_multiagent),
        escapeCSV(r.catatan_kultural_bondowoso),
        escapeCSV(r.status_penilaian),
        escapeCSV(r.waktu_submit),
      ].join(',')
    ),
  ];

  // Prepend UTF-8 BOM so Excel opens with proper UTF-8 decoding
  return '\uFEFF' + csvRows.join('\r\n');
}

/**
 * Generates structured JSON representation of scored videos and jury comments
 */
export function generateCommentsJSON(
  karyas: Karya[],
  pesertas: Record<string, Peserta>,
  penilaians: PenilaianJuri[],
  filterKaryaId?: string
): string {
  const targetKaryas = filterKaryaId
    ? karyas.filter((k) => k.id === filterKaryaId)
    : karyas;

  const data = targetKaryas
    .filter((karya) => penilaians.some((p) => p.karya_id === karya.id))
    .map((karya) => {
      const peserta = pesertas[karya.peserta_id];
      const karyaPenilaians = penilaians.filter((p) => p.karya_id === karya.id);

      return {
        id_karya: karya.id,
        judul_karya: karya.judul_karya,
        kategori: karya.kategori,
        deskripsi: karya.deskripsi,
        durasi_detik: karya.metadata.duration_seconds,
        peserta: peserta
          ? {
              id: peserta.id,
              nama: peserta.nama,
              email: peserta.email,
              kota: peserta.kota,
              instansi: peserta.instansi,
            }
          : null,
        evaluasi_ai: {
          skor_ai: karya.ai_analysis?.score,
          status_ai: karya.ai_analysis?.status,
          ringkasan: karya.ai_analysis?.summary,
          alasan_umum: karya.ai_analysis?.agent_scorecard?.alasan_umum,
          catatan_kultural: karya.ai_analysis?.cultural_rag?.cultural_verification_notes,
          entitas_kultural: karya.ai_analysis?.cultural_rag?.detected_bondowoso_entities,
        },
        komentar_dewan_juri: karyaPenilaians.map((p) => ({
          penilaian_id: p.id,
          juri_id: p.juri_id,
          juri_nama: p.juri_nama,
          juri_peran: p.juri_peran,
          total_skor: p.total_skor,
          catatan_evaluasi_umum: p.catatan_evaluasi,
          alasan_per_aspek: {
            ide_konten_25_persen: p.aspect_reasons?.ide_konten,
            pemanfaatan_ai_20_persen: p.aspect_reasons?.pemanfaatan_ai,
            alur_cerita_20_persen: p.aspect_reasons?.alur_cerita,
            kerapian_15_persen: p.aspect_reasons?.kerapian,
            kualitas_video_20_persen: p.aspect_reasons?.kualitas_video,
          },
          skor_per_aspek: {
            skor_tema: p.skor_tema,
            skor_kreativitas: p.skor_kreativitas,
            skor_visual_ai: p.skor_visual_ai,
            skor_editing: p.skor_editing,
            skor_audio: p.skor_audio,
          },
          status: p.status,
          submitted_at: p.submitted_at,
        })),
      };
    });

  return JSON.stringify(
    {
      nama_kegiatan: 'Lomba Konten Video AI Kabupaten Bondowoso 2026',
      instansi: 'Dinas Komunikasi dan Informatika Kabupaten Bondowoso',
      waktu_ekspor: new Date().toISOString(),
      total_video_dinilai: data.length,
      data_video_dan_komentar: data,
    },
    null,
    2
  );
}

/**
 * Generates formatted text summary for copy-pasting
 */
export function generateCommentsTextSummary(
  karyas: Karya[],
  pesertas: Record<string, Peserta>,
  penilaians: PenilaianJuri[],
  filterKaryaId?: string
): string {
  const targetKaryas = filterKaryaId
    ? karyas.filter((k) => k.id === filterKaryaId)
    : karyas;

  const scoredKaryas = targetKaryas.filter((karya) =>
    penilaians.some((p) => p.karya_id === karya.id)
  );

  let output = `REKAPITULASI SELURUH KOMENTAR DEWAN JURI & EVALUASI KARYA\n`;
  output += `Lomba Konten Video AI Kabupaten Bondowoso 2026\n`;
  output += `Dinas Komunikasi dan Informatika Kabupaten Bondowoso\n`;
  output += `Tanggal Cetak/Ekspor: ${new Date().toLocaleString('id-ID')}\n`;
  output += `Total Video Dinilai: ${scoredKaryas.length}\n`;
  output += `========================================================================\n\n`;

  scoredKaryas.forEach((karya, index) => {
    const peserta = pesertas[karya.peserta_id];
    const karyaPenilaians = penilaians.filter((p) => p.karya_id === karya.id);

    output += `[${index + 1}] KARYA: #${karya.id} - ${karya.judul_karya.toUpperCase()}\n`;
    output += `Peserta: ${peserta ? peserta.nama : '-'} (${peserta ? peserta.kota : 'Bondowoso'})\n`;
    output += `Kategori: ${karya.kategori} | Durasi: ${karya.metadata.duration_seconds}s\n`;
    if (karya.ai_analysis?.agent_scorecard?.alasan_umum) {
      output += `Catatan Multi-Agent AI: "${karya.ai_analysis.agent_scorecard.alasan_umum}"\n`;
    }
    output += `------------------------------------------------------------------------\n`;
    output += `CATATAN & EVALUASI DEWAN JURI (${karyaPenilaians.length} Juri):\n`;

    karyaPenilaians.forEach((p, pIdx) => {
      output += `  Juri ${pIdx + 1}: ${p.juri_nama} (${p.juri_peran})\n`;
      output += `  Skor: ${p.total_skor.toFixed(2)} / 100 [Status: ${p.status}]\n`;
      output += `  > Evaluasi Umum: "${p.catatan_evaluasi}"\n`;
      if (p.aspect_reasons) {
        if (p.aspect_reasons.ide_konten) {
          output += `    - Ide Konten (25%): ${p.aspect_reasons.ide_konten}\n`;
        }
        if (p.aspect_reasons.pemanfaatan_ai) {
          output += `    - Pemanfaatan AI (20%): ${p.aspect_reasons.pemanfaatan_ai}\n`;
        }
        if (p.aspect_reasons.alur_cerita) {
          output += `    - Alur Cerita (20%): ${p.aspect_reasons.alur_cerita}\n`;
        }
        if (p.aspect_reasons.kerapian) {
          output += `    - Kerapian (15%): ${p.aspect_reasons.kerapian}\n`;
        }
        if (p.aspect_reasons.kualitas_video) {
          output += `    - Kualitas Video (20%): ${p.aspect_reasons.kualitas_video}\n`;
        }
      }
      output += `\n`;
    });

    output += `========================================================================\n\n`;
  });

  return output;
}

/**
 * Triggers a browser download of text/csv/json content
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
