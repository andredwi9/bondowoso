import React from 'react';
import {
  Trophy,
  Scale,
  Settings,
  FileText,
  Shield,
  Eye,
  EyeOff,
  UserCheck,
  Film,
  Sparkles,
  Layers,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { UserRoleSession } from '../types/index.ts';

export type AppTab =
  | 'jury'
  | 'leaderboard'
  | 'upload_single'
  | 'storyboard'
  | 'tickets'
  | 'admin'
  | 'berita_acara'
  | 'audit';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  session: UserRoleSession;
  setSession: React.Dispatch<React.SetStateAction<UserRoleSession>>;
  totalKaryaCount: number;
  unscoredCount: number;
  openTicketCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  session,
  setSession,
  unscoredCount,
  openTicketCount = 0,
}) => {
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'admin') {
      setSession({
        role: 'admin',
        name: 'Administrator Panitia Diskominfo',
        blind_review_mode: false,
      });
      setActiveTab('admin');
    } else if (val === 'juri-1') {
      setSession({
        role: 'juri',
        juri_id: 'juri-1',
        name: 'Dr. Ir. Budi Santoso, M.Sn (Juri Teknis)',
        blind_review_mode: session.blind_review_mode,
      });
      setActiveTab('jury');
    } else if (val === 'juri-2') {
      setSession({
        role: 'juri',
        juri_id: 'juri-2',
        name: 'Rian Pratama, S.Kom, M.Ds (Juri Kreatif)',
        blind_review_mode: session.blind_review_mode,
      });
      setActiveTab('jury');
    } else if (val === 'juri-3') {
      setSession({
        role: 'juri',
        juri_id: 'juri-3',
        name: 'Hj. Fatimah Azzahra, M.Hum (Juri Budaya)',
        blind_review_mode: session.blind_review_mode,
      });
      setActiveTab('jury');
    } else if (val === 'executive') {
      setSession({
        role: 'executive',
        name: 'Eksekutif / Penilai Akhir Pemkab',
        blind_review_mode: false,
      });
      setActiveTab('leaderboard');
    }
  };

  const toggleBlindReview = () => {
    setSession((prev) => ({
      ...prev,
      blind_review_mode: !prev.blind_review_mode,
    }));
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xl">
      {/* Top Bar: Official Branding & Quick Role Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-0 sm:h-16 gap-2">
          {/* Logo & Title */}
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400/30 shrink-0">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-600/30">
                  Bondowoso 2026
                </span>
                <span className="inline-flex items-center text-[10px] font-medium text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                  Live Engine V2
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight truncate">
                Sistem Analisis & Penilaian Video AI Lomba Bondowoso
              </h1>
            </div>
          </div>

          {/* User Role Switcher & Blind Review Toggle */}
          <div className="flex items-center space-x-2 justify-between sm:justify-end">
            {/* Blind Review Toggle (Section 10.2) */}
            <button
              onClick={toggleBlindReview}
              type="button"
              className={`flex items-center space-x-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all shrink-0 ${
                session.blind_review_mode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20 ring-1 ring-amber-400/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Sembunyikan identitas peserta dari Dewan Juri untuk mencegah konflik kepentingan"
            >
              {session.blind_review_mode ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Blind Review ON</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Blind Review</span>
                </>
              )}
            </button>

            {/* Role Dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 min-w-0">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <div className="flex flex-col text-left min-w-0">
                <label htmlFor="role-select" className="sr-only">Pilih Role Pengguna</label>
                <select
                  id="role-select"
                  aria-label="Pilih Role Pengguna"
                  className="bg-transparent text-[11px] text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[170px] sm:max-w-none truncate"
                  value={session.role === 'juri' ? (session.juri_id || 'juri-1') : session.role}
                  onChange={handleRoleChange}
                >
                  <option value="juri-1" className="bg-slate-900 text-slate-100">
                    Juri 1: Dr. Ir. Budi Santoso (Teknis)
                  </option>
                  <option value="juri-2" className="bg-slate-900 text-slate-100">
                    Juri 2: Rian Pratama, M.Ds (Visual AI)
                  </option>
                  <option value="juri-3" className="bg-slate-900 text-slate-100">
                    Juri 3: Hj. Fatimah Azzahra (Budaya)
                  </option>
                  <option value="admin" className="bg-slate-900 text-slate-100">
                    Administrator Panitia Lomba (Akses Penuh)
                  </option>
                  <option value="executive" className="bg-slate-900 text-slate-100">
                    Eksekutif / Pengamat Pemkab
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Integrated PRD V2 tabs) */}
        <nav className="flex space-x-1 sm:space-x-1.5 overflow-x-auto py-2 border-t border-slate-800/80 scrollbar-none text-xs sm:text-xs">
          {/* 1. Dashboard Juri */}
          <button
            onClick={() => setActiveTab('jury')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'jury'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Dashboard Juri</span>
            {unscoredCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                {unscoredCount}
              </span>
            )}
          </button>

          {/* 2. Live Leaderboard */}
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Live Leaderboard</span>
          </button>

          {/* 3. Unggah Video Tunggal V2 (FT-01) */}
          <button
            onClick={() => setActiveTab('upload_single')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'upload_single'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unggah Video V2</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded border border-emerald-500/40">
              1 File .MP4
            </span>
          </button>

          {/* 4. Storyboard & Forensik AI (FT-02 & FT-04) */}
          <button
            onClick={() => setActiveTab('storyboard')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'storyboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Storyboard & Forensik</span>
          </button>

          {/* 5. Tiket Verifikasi Anti-Fraud (FR-12) */}
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'tickets'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Tiket Anti-Fraud</span>
            {openTicketCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-black font-bold">
                {openTicketCount}
              </span>
            )}
          </button>

          {/* 6. Admin Panel (With Video Deletion) */}
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-300" />
            <span>Admin & Kelola Karya</span>
          </button>

          {/* 7. Berita Acara Resmi */}
          <button
            onClick={() => setActiveTab('berita_acara')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'berita_acara'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Berita Acara</span>
          </button>

          {/* 8. Audit Trail */}
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audit Trail</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
