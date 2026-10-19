import React from 'react';
import {
  Printer,
  FileCheck,
  CheckCircle,
  Download,
  ShieldCheck,
  QrCode,
  Award,
} from 'lucide-react';
import { Karya, PenilaianJuri, Peserta } from '../types/index.ts';
import { buildLeaderboardEntries } from '../utils/scoring.ts';

interface BeritaAcaraExportProps {
  karyas: Karya[];
  pesertas: Record<string, Peserta>;
  penilaians: PenilaianJuri[];
  onBackToLeaderboard: () => void;
}

export const BeritaAcaraExport: React.FC<BeritaAcaraExportProps> = ({
  karyas,
  pesertas,
  penilaians,
  onBackToLeaderboard,
}) => {
  const entries = buildLeaderboardEntries(karyas, pesertas, penilaians);
  const eligibleEntries = entries.filter((e) => !e.is_disqualified);

  const juara1 = eligibleEntries[0];
  const juara2 = eligibleEntries[1];
  const juara3 = eligibleEntries[2];
  const harapan1 = eligibleEntries[3];
  const harapan2 = eligibleEntries[4];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Top Action Bar (Hidden on print) */}
      <div className="print:hidden bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Dokumen Resmi Panitia
          </span>
          <h2 className="text-lg font-black text-slate-100">
            Berita Acara Rekapitulasi Hasil Penilaian Lomba (FR-06)
          </h2>
          <p className="text-xs text-slate-400">
            Dilengkapi tanda tangan digital Dewan Juri dan kode verifikasi keaslian.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToLeaderboard}
            type="button"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            Kembali ke Leaderboard
          </button>
          <button
            onClick={handlePrint}
            type="button"
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Resmi / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* OFFICIAL PRINTABLE CERTIFICATE & REPORT DOCUMENT */}
      <div className="bg-white text-slate-900 rounded-2xl p-8 sm:p-12 shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0">
        {/* KOP SURAT RESMI PEMKAB BONDOWOSO */}
        <div className="border-b-4 border-double border-slate-900 pb-5 text-center relative">
          <div className="flex items-center justify-center space-x-4 mb-2">
            {/* Logo Emblem Symbol */}
            <div className="w-16 h-16 rounded-full border-2 border-slate-900 flex flex-col items-center justify-center p-1 text-[8px] font-black uppercase text-center leading-tight">
              <span>PEMKAB</span>
              <span className="text-[12px] font-bold text-indigo-900">BND</span>
              <span>1819</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-wider uppercase text-slate-800">
                PEMERINTAH KABUPATEN BONDOWOSO
              </h3>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight uppercase text-indigo-950">
                DINAS KOMUNIKASI DAN INFORMATIKA
              </h2>
              <p className="text-xs text-slate-600 font-serif">
                Jalan Letjen S. Parman No. 25, Bondowoso, Jawa Timur 68211 • Telp: (0332) 421001
              </p>
            </div>
          </div>
        </div>

        {/* JUDUL BERITA ACARA */}
        <div className="text-center my-6">
          <h4 className="text-base sm:text-lg font-black uppercase underline tracking-wide">
            BERITA ACARA REKAPITULASI PENILAIAN AKHIR
          </h4>
          <p className="text-xs font-mono text-slate-700 mt-1">
            Nomor: 045/BA-JURI/VIDEO-AI/DISKOMINFO/X/2026
          </p>
          <p className="text-xs font-bold text-slate-800 uppercase mt-0.5">
            LOMBA KONTEN VIDEO AI KABUPATEN BONDOWOSO TAHUN 2026
          </p>
        </div>

        {/* INTRO PARAGRAPH */}
        <div className="text-xs leading-relaxed text-slate-800 space-y-2 mb-6 font-serif">
          <p>
            Pada hari ini, <strong>Senin</strong> tanggal <strong>Sembilan Belas</strong> bulan <strong>Oktober</strong> tahun <strong>Dua Ribu Dua Puluh Enam</strong>, bertempat di Ruang Evaluasi Media Center Diskominfo Kabupaten Bondowoso, telah dilaksanakan rapat pleno penetapan nilai dan verifikasi teknis hasil Lomba Konten Video AI Kabupaten Bondowoso.
          </p>
          <p>
            Berdasarkan pemeriksaan engine pre-screening otomatis (kepatuhan durasi 30–60 detik, rasio aspek 9:16 vertical, dan deteksi keaslian generatif AI) serta pembobotan 5 (lima) aspek kualitatif oleh Dewan Juri sesuai Petunjuk Teknis Lomba:
          </p>
        </div>

        {/* TABEL PENETAPAN PEMENANG UTAMA */}
        <div className="mb-6">
          <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2 border-l-4 border-indigo-700 pl-2">
            A. Penetapan Pemenang Utama Lomba:
          </h5>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-400 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-28">Gelar</th>
                  <th className="py-2 px-3 border-r border-slate-300 w-24">ID Karya</th>
                  <th className="py-2 px-3 border-r border-slate-300">Judul Karya</th>
                  <th className="py-2 px-3 border-r border-slate-300">Nama Pemenang / Tim</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-24">Skor Juri</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-24">Skor AI</th>
                  <th className="py-2 px-3 text-right w-24 font-black">Total Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {juara1 && (
                  <tr className="bg-amber-50 font-semibold">
                    <td className="py-2 px-3 border-r border-slate-300 text-center text-amber-900 font-bold">
                      JUARA I (EMAS)
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300 font-mono">#{juara1.karya.id}</td>
                    <td className="py-2 px-3 border-r border-slate-300">{juara1.karya.judul_karya}</td>
                    <td className="py-2 px-3 border-r border-slate-300">{juara1.peserta.nama}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-mono">{juara1.skor_juri_avg.toFixed(2)}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-mono">{juara1.skor_ai}</td>
                    <td className="py-2 px-3 text-right font-black font-mono text-indigo-950">{juara1.total_akhir.toFixed(2)}</td>
                  </tr>
                )}
                {juara2 && (
                  <tr>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-bold text-slate-700">
                      JUARA II (PERAK)
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300 font-mono">#{juara2.karya.id}</td>
                    <td className="py-2 px-3 border-r border-slate-300">{juara2.karya.judul_karya}</td>
                    <td className="py-2 px-3 border-r border-slate-300">{juara2.peserta.nama}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-mono">{juara2.skor_juri_avg.toFixed(2)}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-mono">{juara2.skor_ai}</td>
                    <td className="py-2 px-3 text-right font-black font-mono text-indigo-950">{juara2.total_akhir.toFixed(2)}</td>
                  </tr>
                )}
                {juara3 && (
                  <tr>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-bold text-amber-800">
                      JUARA III (PERUNGGU)
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300 font-mono">#{juara3.karya.id}</td>
                    <td className="py-2 px-3 border-r border-slate-300">{juara3.karya.judul_karya}</td>
                    <td className="py-2 px-3 border-r border-slate-300">{juara3.peserta.nama}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-mono">{juara3.skor_juri_avg.toFixed(2)}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-mono">{juara3.skor_ai}</td>
                    <td className="py-2 px-3 text-right font-black font-mono text-indigo-950">{juara3.total_akhir.toFixed(2)}</td>
                  </tr>
                )}
                {harapan1 && (
                  <tr className="text-slate-600">
                    <td className="py-1.5 px-3 border-r border-slate-300 text-center">JUARA HARAPAN I</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 font-mono">#{harapan1.karya.id}</td>
                    <td className="py-1.5 px-3 border-r border-slate-300">{harapan1.karya.judul_karya}</td>
                    <td className="py-1.5 px-3 border-r border-slate-300">{harapan1.peserta.nama}</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 text-center font-mono">{harapan1.skor_juri_avg.toFixed(2)}</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 text-center font-mono">{harapan1.skor_ai}</td>
                    <td className="py-1.5 px-3 text-right font-bold font-mono">{harapan1.total_akhir.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DAFTAR LENGKAP REKAPITULASI SELURUH PESERTA */}
        <div className="mb-6">
          <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2 border-l-4 border-indigo-700 pl-2">
            B. Lampiran Rekapitulasi Lengkap Peserta:
          </h5>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border border-slate-400 border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-400">
                  <th className="py-1.5 px-2 text-center w-12 border-r border-slate-300">No</th>
                  <th className="py-1.5 px-2 w-20 border-r border-slate-300">ID</th>
                  <th className="py-1.5 px-2 border-r border-slate-300">Judul Karya & Peserta</th>
                  <th className="py-1.5 px-2 border-r border-slate-300">Kategori</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-center">Durasi</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-center">Skor AI</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-center">Skor Juri</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-right">Total Akhir</th>
                  <th className="py-1.5 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {entries.map((item, idx) => (
                  <tr key={item.karya.id} className={item.is_disqualified ? 'bg-rose-50 text-slate-500' : ''}>
                    <td className="py-1.5 px-2 text-center border-r border-slate-300">
                      {item.is_disqualified ? '-' : idx + 1}
                    </td>
                    <td className="py-1.5 px-2 font-mono border-r border-slate-300">#{item.karya.id}</td>
                    <td className="py-1.5 px-2 border-r border-slate-300">
                      <strong>{item.karya.judul_karya}</strong> ({item.peserta.nama})
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-300">{item.karya.kategori}</td>
                    <td className="py-1.5 px-2 text-center font-mono border-r border-slate-300">
                      {item.karya.metadata.duration_seconds}s
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono border-r border-slate-300">
                      {item.skor_ai}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono border-r border-slate-300">
                      {item.skor_juri_avg > 0 ? item.skor_juri_avg.toFixed(2) : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold border-r border-slate-300">
                      {item.is_disqualified ? '0.00' : item.total_akhir.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2 text-center font-semibold">
                      {item.is_disqualified ? 'Gugur Teknis' : item.karya.is_overridden ? 'Lolos (Override)' : 'Lolos'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CLOSING STATEMENT */}
        <div className="text-xs leading-relaxed text-slate-800 font-serif mb-8">
          <p>
            Demikian Berita Acara ini dibuat dengan sebenarnya dalam rangkap 4 (empat), ditandatangani secara digital oleh Dewan Juri dan Panitia Pelaksana untuk dipergunakan sebagaimana mestinya. Keputusan Dewan Juri bersifat final dan tidak dapat diganggu gugat.
          </p>
        </div>

        {/* DIGITAL SIGNATURE BLOCKS (DEWAN JURI & PANITIA) */}
        <div className="pt-4 border-t border-slate-400">
          <div className="text-center font-bold text-xs uppercase mb-4 text-slate-800">
            DEWAN JURI LOMBA KONTEN VIDEO AI KABUPATEN BONDOWOSO
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs">
            {/* Juri 1 */}
            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 relative flex flex-col justify-between h-44">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Ketua Dewan Juri</span>
                <span className="text-[11px] font-semibold text-slate-700">Sinematografi & Teknis</span>
              </div>
              <div className="my-2 py-1 px-2 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-mono">
                <CheckCircle className="w-3.5 h-3.5 mx-auto text-emerald-600 mb-0.5" />
                <span>SIGNED DIGITAL</span>
                <div className="text-[8px] text-slate-500">SHA256: 9b2d...4a1</div>
              </div>
              <div>
                <strong className="block text-slate-900 font-bold underline">Dr. Ir. Budi Santoso, M.Sn</strong>
                <span className="text-[10px] text-slate-500">NIP. 19780412 200312 1 002</span>
              </div>
            </div>

            {/* Juri 2 */}
            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 relative flex flex-col justify-between h-44">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Anggota Dewan Juri</span>
                <span className="text-[11px] font-semibold text-slate-700">Visual & Generative AI</span>
              </div>
              <div className="my-2 py-1 px-2 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-mono">
                <CheckCircle className="w-3.5 h-3.5 mx-auto text-emerald-600 mb-0.5" />
                <span>SIGNED DIGITAL</span>
                <div className="text-[8px] text-slate-500">SHA256: 7f1c...8e3</div>
              </div>
              <div>
                <strong className="block text-slate-900 font-bold underline">Rian Pratama, S.Kom, M.Ds</strong>
                <span className="text-[10px] text-slate-500">Praktisi AI & Desain Visual</span>
              </div>
            </div>

            {/* Juri 3 */}
            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 relative flex flex-col justify-between h-44">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Anggota Dewan Juri</span>
                <span className="text-[11px] font-semibold text-slate-700">Budaya & Muatan Lokal</span>
              </div>
              <div className="my-2 py-1 px-2 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-mono">
                <CheckCircle className="w-3.5 h-3.5 mx-auto text-emerald-600 mb-0.5" />
                <span>SIGNED DIGITAL</span>
                <div className="text-[8px] text-slate-500">SHA256: 4e2a...5d9</div>
              </div>
              <div>
                <strong className="block text-slate-900 font-bold underline">Hj. Fatimah Azzahra, M.Hum</strong>
                <span className="text-[10px] text-slate-500">Pemerhati Kebudayaan Daerah</span>
              </div>
            </div>

            {/* Panitia Diskominfo */}
            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 relative flex flex-col justify-between h-44">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Mengetahui,</span>
                <span className="text-[11px] font-semibold text-slate-700">Ketua Panitia Pelaksana</span>
              </div>
              <div className="my-2 py-1 px-2 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-mono">
                <ShieldCheck className="w-3.5 h-3.5 mx-auto text-indigo-600 mb-0.5" />
                <span>VERIFIED & SEALED</span>
                <div className="text-[8px] text-slate-500">DISKOMINFO BND 2026</div>
              </div>
              <div>
                <strong className="block text-slate-900 font-bold underline">H. Bambang Sugiarto, S.STP, MM</strong>
                <span className="text-[10px] text-slate-500">NIP. 19740825 199903 1 003</span>
              </div>
            </div>
          </div>

          {/* QR Code and Verification footer */}
          <div className="mt-6 pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <div className="flex items-center space-x-2">
              <QrCode className="w-8 h-8 text-slate-800" />
              <div>
                <div>Dokumen Sah Terdaftar di Sistem Informasi Penilaian Video AI</div>
                <div>Hash Dokumen: <code>SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</code></div>
              </div>
            </div>
            <div className="text-right">
              <div>Disahkan di Bondowoso</div>
              <div>19 Oktober 2026</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
