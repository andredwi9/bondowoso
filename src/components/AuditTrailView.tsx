import React, { useState } from 'react';
import {
  Shield,
  Search,
  Filter,
  Clock,
  User,
  Globe,
  FileText,
  Lock,
  Download,
} from 'lucide-react';
import { AuditLogItem } from '../types/index.ts';

interface AuditTrailViewProps {
  logs: AuditLogItem[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== 'ALL' && log.action !== selectedAction) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchUser = log.user_name.toLowerCase().includes(q);
      const matchId = (log.karya_id || '').toLowerCase().includes(q);
      return matchDetails || matchUser || matchId;
    }
    return true;
  });

  const handleExportAuditJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `audit_trail_lomba_video_ai_bondowoso_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Keamanan & Integritas Data (Section 10)
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Audit Trail Terenkripsi & Immutable
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1">
            Buku Catatan Audit (Audit Trail & Activity Log)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Membukukan secara transparan setiap perubahan nilai, autosave draf, pembatalan diskualifikasi (override), dan submission juri.
          </p>
        </div>

        <button
          onClick={handleExportAuditJson}
          type="button"
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors self-start md:self-auto"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Unduh Log Lengkap (JSON)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nama penilai, ID karya, atau aksi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 text-slate-200 text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Action Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          {['ALL', 'SUBMIT_FINAL_SCORE', 'AUTOSAVE_DRAFT', 'MANUAL_OVERRIDE', 'AUTO_FLAG_DISQUALIFICATION'].map((act) => (
            <button
              key={act}
              onClick={() => setSelectedAction(act)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                selectedAction === act
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {act === 'ALL' ? 'Semua Aksi' : act.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-850 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-40">Timestamp</th>
                <th className="py-3 px-4 w-32">IP Address</th>
                <th className="py-3 px-4 w-52">Pengguna & Peran</th>
                <th className="py-3 px-4 w-48">Jenis Aksi</th>
                <th className="py-3 px-4">Rincian Perubahan Nilai / Parameter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.map((log) => {
                const dateObj = new Date(log.timestamp);
                const timeFormatted = isNaN(dateObj.getTime())
                  ? log.timestamp
                  : dateObj.toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                return (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{timeFormatted}</span>
                      </div>
                    </td>

                    {/* IP Address */}
                    <td className="py-3 px-4 font-mono text-indigo-300 text-[11px]">
                      <div className="flex items-center space-x-1">
                        <Globe className="w-3 h-3 text-slate-500" />
                        <span>{log.ip_address}</span>
                      </div>
                    </td>

                    {/* User & Role */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{log.user_name}</div>
                      <div className="text-[10px] text-slate-400">{log.user_role}</div>
                    </td>

                    {/* Action Badge */}
                    <td className="py-3 px-4">
                      {log.action === 'SUBMIT_FINAL_SCORE' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          SUBMIT FINAL
                        </span>
                      ) : log.action === 'MANUAL_OVERRIDE' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          ADMIN OVERRIDE
                        </span>
                      ) : log.action === 'AUTO_FLAG_DISQUALIFICATION' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          AUTO RED FLAG
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {log.action}
                        </span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 text-slate-300">
                      {log.karya_id && (
                        <span className="font-mono text-amber-400 font-bold mr-1.5">
                          #{log.karya_id}
                        </span>
                      )}
                      <span>{log.details}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
