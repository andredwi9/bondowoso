import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Karya, PenilaianJuri, Peserta } from '../types/index.ts';
import { calculateTotalAkhir, getPredikatSkor } from './scoring.ts';

export interface ScoredVideoCommentEntry {
  no: number;
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
  skor_tema: number;
  skor_kreativitas: number;
  skor_visual_ai: number;
  skor_editing: number;
  skor_audio: number;
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

  let rowCounter = 1;

  targetKaryas.forEach((karya) => {
    const peserta = pesertas[karya.peserta_id] || {
      id: karya.peserta_id,
      nama: 'Peserta Tidak Diketahui',
      email: '-',
      kontak: '-',
      kota: 'Bondowoso',
      instansi: 'Kreator Bondowoso',
    };

    const karyaPenilaians = penilaians.filter((p) => p.karya_id === karya.id);

    if (karyaPenilaians.length > 0) {
      karyaPenilaians.forEach((penilaian) => {
        result.push({
          no: rowCounter++,
          karya_id: karya.id,
          judul_karya: karya.judul_karya,
          kategori: karya.kategori,
          durasi_detik: karya.metadata?.duration_seconds || 0,
          peserta_nama: peserta.nama,
          peserta_kota: peserta.kota,
          penilaian_id: penilaian.id,
          juri_id: penilaian.juri_id,
          juri_nama: penilaian.juri_nama,
          juri_peran: penilaian.juri_peran,
          total_skor: Number(penilaian.total_skor.toFixed(2)),
          skor_tema: penilaian.skor_tema,
          skor_kreativitas: penilaian.skor_kreativitas,
          skor_visual_ai: penilaian.skor_visual_ai,
          skor_editing: penilaian.skor_editing,
          skor_audio: penilaian.skor_audio,
          catatan_evaluasi: penilaian.catatan_evaluasi || '-',
          catatan_ide_konten: penilaian.aspect_reasons?.ide_konten || '-',
          catatan_pemanfaatan_ai: penilaian.aspect_reasons?.pemanfaatan_ai || '-',
          catatan_alur_cerita: penilaian.aspect_reasons?.alur_cerita || '-',
          catatan_kerapian: penilaian.aspect_reasons?.kerapian || '-',
          catatan_kualitas_video: penilaian.aspect_reasons?.kualitas_video || '-',
          alasan_ai_multiagent:
            karya.ai_analysis?.agent_scorecard?.alasan_umum ||
            karya.ai_analysis?.summary ||
            '-',
          catatan_kultural_bondowoso:
            karya.ai_analysis?.cultural_rag?.cultural_verification_notes || '-',
          status_penilaian: penilaian.status,
          waktu_submit:
            penilaian.submitted_at || penilaian.autosaved_at || new Date().toISOString(),
        });
      });
    }
  });

  return result;
}

/**
 * Generates and downloads native Excel Spreadsheet (.xlsx) with multiple formatted sheets
 */
export function exportCommentsDirectXLSX(
  karyas: Karya[],
  pesertas: Record<string, Peserta>,
  penilaians: PenilaianJuri[],
  filterKaryaId?: string
): string {
  const rows = extractCommentRows(karyas, pesertas, penilaians, filterKaryaId);
  const timestamp = new Date().toISOString().slice(0, 10);
  const targetId = filterKaryaId || undefined;
  const filename = targetId
    ? `Tabel_Komentar_Karya_${targetId}_Bondowoso_${timestamp}.xlsx`
    : `Tabel_Rekap_Komentar_Juri_Video_AI_Bondowoso_${timestamp}.xlsx`;

  const wb = XLSX.utils.book_new();

  // Sheet 1: Rekapitulasi Komentar & Penilaian
  const sheet1Data = rows.map((r) => ({
    'No': r.no,
    'ID Karya': r.karya_id,
    'Judul Karya': r.judul_karya,
    'Kategori': r.kategori,
    'Nama Peserta': r.peserta_nama,
    'Kota Asal': r.peserta_kota,
    'Durasi (dtk)': r.durasi_detik,
    'Nama Dewan Juri': r.juri_nama,
    'Jabatan Juri': r.juri_peran,
    'Total Nilai Juri': r.total_skor,
    'Evaluasi Umum Juri': r.catatan_evaluasi,
    'Alasan: Ide Konten (25%)': r.catatan_ide_konten,
    'Alasan: Pemanfaatan AI (20%)': r.catatan_pemanfaatan_ai,
    'Alasan: Alur Cerita (20%)': r.catatan_alur_cerita,
    'Alasan: Kerapian (15%)': r.catatan_kerapian,
    'Alasan: Kualitas Video (20%)': r.catatan_kualitas_video,
    'Catatan Multi-Agent AI': r.alasan_ai_multiagent,
    'Verifikasi Kultural Bondowoso': r.catatan_kultural_bondowoso,
    'Status Penilaian': r.status_penilaian,
    'Waktu Penilaian': r.waktu_submit,
  }));

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  ws1['!cols'] = [
    { wch: 5 },  // No
    { wch: 10 }, // ID Karya
    { wch: 35 }, // Judul Karya
    { wch: 15 }, // Kategori
    { wch: 24 }, // Nama Peserta
    { wch: 15 }, // Kota Asal
    { wch: 12 }, // Durasi
    { wch: 30 }, // Juri
    { wch: 30 }, // Jabatan
    { wch: 15 }, // Skor
    { wch: 45 }, // Evaluasi Umum
    { wch: 35 }, // Ide Konten
    { wch: 35 }, // Pemanfaatan AI
    { wch: 35 }, // Alur Cerita
    { wch: 35 }, // Kerapian
    { wch: 35 }, // Kualitas Video
    { wch: 40 }, // Multi-Agent AI
    { wch: 35 }, // Kultural
    { wch: 15 }, // Status
    { wch: 22 }, // Waktu
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Rekap Komentar Juri');

  // Sheet 2: Matriks 5 Kriteria Nilai Juknis
  const sheet2Data = rows.map((r) => ({
    'No': r.no,
    'ID Karya': r.karya_id,
    'Judul Karya': r.judul_karya,
    'Kategori': r.kategori,
    'Nama Peserta': r.peserta_nama,
    'Nama Dewan Juri': r.juri_nama,
    'Ide Konten (25%)': r.skor_tema,
    'Pemanfaatan AI (20%)': r.skor_kreativitas,
    'Alur Cerita (20%)': r.skor_visual_ai,
    'Kerapian (15%)': r.skor_editing,
    'Kualitas Video (20%)': r.skor_audio,
    'Total Skor Juri': r.total_skor,
    'Predikat': getPredikatSkor(r.total_skor),
  }));

  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 5 },
    { wch: 10 },
    { wch: 35 },
    { wch: 15 },
    { wch: 24 },
    { wch: 30 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Matriks 5 Kriteria Nilai');

  // Sheet 3: Leaderboard & Akumulasi Nilai
  const scoredKaryas = karyas.filter((k) =>
    penilaians.some((p) => p.karya_id === k.id)
  );
  const leaderboardData = scoredKaryas
    .map((k) => {
      const pList = penilaians.filter((p) => p.karya_id === k.id && p.status === 'SUBMITTED');
      const avgJury =
        pList.length > 0
          ? pList.reduce((acc, curr) => acc + curr.total_skor, 0) / pList.length
          : 0;
      const aiScore = k.ai_analysis?.score || 85;
      const finalScore = calculateTotalAkhir(avgJury, aiScore, pList.length > 0);
      const peserta = pesertas[k.peserta_id];

      return {
        'ID Karya': k.id,
        'Judul Karya': k.judul_karya,
        'Kategori': k.kategori,
        'Nama Peserta': peserta?.nama || '-',
        'Kota': peserta?.kota || 'Bondowoso',
        'Rata-rata Skor Juri (80%)': Number(avgJury.toFixed(2)),
        'Skor AI Pre-Screening (20%)': Number(aiScore.toFixed(2)),
        'Total Skor Akhir': Number(finalScore.toFixed(2)),
        'Jumlah Juri Menilai': pList.length,
        'Status Teknis': k.status_teknis,
        'Predikat Akhir': getPredikatSkor(finalScore),
      };
    })
    .sort((a, b) => b['Total Skor Akhir'] - a['Total Skor Akhir'])
    .map((item, idx) => ({ 'Peringkat': idx + 1, ...item }));

  const ws3 = XLSX.utils.json_to_sheet(leaderboardData);
  ws3['!cols'] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 35 },
    { wch: 15 },
    { wch: 24 },
    { wch: 15 },
    { wch: 24 },
    { wch: 25 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'Peringkat & Skor Akhir');

  // Write and trigger download
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * Generates and directly downloads official PDF Report using jsPDF + autoTable
 */
export function exportCommentsDirectPDF(
  karyas: Karya[],
  pesertas: Record<string, Peserta>,
  penilaians: PenilaianJuri[],
  filterKaryaId?: string
): string {
  const rows = extractCommentRows(karyas, pesertas, penilaians, filterKaryaId);
  const timestamp = new Date().toISOString().slice(0, 10);
  const targetId = filterKaryaId || undefined;
  const filename = targetId
    ? `Rekap_Komentar_Karya_${targetId}_Bondowoso_${timestamp}.pdf`
    : `Rekap_Komentar_dan_Penilaian_Juri_Bondowoso_${timestamp}.pdf`;

  // Create landscape A4 document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Official Kop Surat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('PEMERINTAH KABUPATEN BONDOWOSO', pageWidth / 2, 14, { align: 'center' });

  doc.setFontSize(11);
  doc.text('DINAS KOMUNIKASI DAN INFORMATIKA', pageWidth / 2, 19, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(
    'Jl. Letnan Karsono No. 1, Kauman, Kec. Bondowoso, Kabupaten Bondowoso, Jawa Timur 68211',
    pageWidth / 2,
    23.5,
    { align: 'center' }
  );

  // Double horizontal divider line
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.7);
  doc.line(14, 26, pageWidth - 14, 26);
  doc.setLineWidth(0.2);
  doc.line(14, 27, pageWidth - 14, 27);

  // 2. Title & Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'BERITA ACARA & REKAPITULASI EVALUASI DEWAN JURI',
    pageWidth / 2,
    33,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(
    'Lomba Konten Video AI Potensi Unggulan Daerah Kabupaten Bondowoso 2026',
    pageWidth / 2,
    38,
    { align: 'center' }
  );

  // Metadata summary strip
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const tanggalStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Tanggal Cetak: ${tanggalStr}`, 14, 44);
  doc.text(`Total Penilaian / Komentar: ${rows.length} entri`, pageWidth / 2, 44, { align: 'center' });
  doc.text(`Status Sistem: Live Engine PRD V2`, pageWidth - 14, 44, { align: 'right' });

  // 3. AutoTable Content
  const tableHead = [
    [
      'No',
      'ID & Judul Karya',
      'Kategori & Peserta',
      'Dewan Juri',
      'Skor',
      'Evaluasi Umum & Catatan Aspek Penilaian (Juknis)',
    ],
  ];

  const tableBody = rows.map((r) => [
    r.no.toString(),
    `#${r.karya_id}\n${r.judul_karya}\n(${r.durasi_detik} detik)`,
    `${r.kategori}\n${r.peserta_nama}\n(${r.peserta_kota})`,
    `${r.juri_nama}\n[${r.juri_peran}]`,
    `${r.total_skor.toFixed(2)}\n/ 100`,
    `Evaluasi: "${r.catatan_evaluasi}"\n• Ide (25%): ${r.catatan_ide_konten}\n• AI (20%): ${r.catatan_pemanfaatan_ai}\n• Alur (20%): ${r.catatan_alur_cerita}\n• Kerapian (15%): ${r.catatan_kerapian}\n• Visual (20%): ${r.catatan_kualitas_video}`,
  ]);

  autoTable(doc, {
    startY: 47,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
      valign: 'top',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 42 },
      3: { cellWidth: 48 },
      4: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [79, 70, 229] },
      5: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14, bottom: 25 },
    didDrawPage: (data) => {
      // Footer page number
      const str = `Halaman ${doc.getNumberOfPages()} - Dokumen Resmi Panitia Lomba Video AI Bondowoso 2026`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    },
  });

  // 4. Official Signature Block (Dewan Juri)
  const lastY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 120;
  const pageHeight = doc.internal.pageSize.getHeight();

  // If table went too close to bottom, add a new page for signatures
  if (lastY > pageHeight - 45) {
    doc.addPage();
  }

  const sigY = lastY > pageHeight - 45 ? 25 : lastY + 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  const col1 = 35;
  const col2 = pageWidth / 2;
  const col3 = pageWidth - 45;

  doc.text('Bondowoso, ' + tanggalStr, col3, sigY - 5, { align: 'center' });

  doc.text('Ketua Dewan Juri,', col1, sigY, { align: 'center' });
  doc.text('Anggota Juri Kreatif AI,', col2, sigY, { align: 'center' });
  doc.text('Anggota Juri Budaya,', col3, sigY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text('Dr. Ir. Budi Santoso, M.Sn', col1, sigY + 20, { align: 'center' });
  doc.text('Rian Pratama, S.Kom, M.Ds', col2, sigY + 20, { align: 'center' });
  doc.text('Hj. Fatimah Azzahra, M.Hum', col3, sigY + 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('NIP. 19780512 200501 1 004', col1, sigY + 24, { align: 'center' });
  doc.text('NIP. 19850918 201012 1 002', col2, sigY + 24, { align: 'center' });
  doc.text('NIP. 19820324 200801 2 007', col3, sigY + 24, { align: 'center' });

  // Direct download
  doc.save(filename);
  return filename;
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
    'No',
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
    'Skor Ide Konten (25%)',
    'Skor Pemanfaatan AI (20%)',
    'Skor Alur Cerita (20%)',
    'Skor Kerapian (15%)',
    'Skor Kualitas Video (20%)',
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
        escapeCSV(r.no),
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
        escapeCSV(r.skor_tema),
        escapeCSV(r.skor_kreativitas),
        escapeCSV(r.skor_visual_ai),
        escapeCSV(r.skor_editing),
        escapeCSV(r.skor_audio),
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
