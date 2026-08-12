import React, { useState, useEffect } from 'react';
import { ActivityLogEntry, getActivityLogs, clearActivityLogs } from '../../lib/activityLog';
import { Clock, Trash2, Shield, User, Layout, Search, Filter } from 'lucide-react';

export function LogAktivitas() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [filterModule, setFilterModule] = useState<string>('All');

  useEffect(() => {
    setLogs(getActivityLogs());
    const handleUpdate = () => setLogs(getActivityLogs());
    window.addEventListener('activityLogsUpdated', handleUpdate);
    return () => window.removeEventListener('activityLogsUpdated', handleUpdate);
  }, []);

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleClear = () => {
    setShowConfirmClear(true);
  };

  const confirmClear = () => {
    clearActivityLogs();
    setShowConfirmClear(false);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const roles = ['All', ...Array.from(new Set(logs.map(l => l.role)))];
  const modules = ['All', ...Array.from(new Set(logs.map(l => l.module)))];

  const filteredLogs = logs.filter(log => {
    const matchSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchRole = filterRole === 'All' || log.role === filterRole;
    const matchModule = filterModule === 'All' || log.module === filterModule;
    return matchSearch && matchRole && matchModule;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Log Aktivitas</h2>
          <p className="text-slate-500 dark:text-slate-400">Pantau semua aktivitas pengguna di dalam sistem.</p>
        </div>
        
        {showConfirmClear ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600 dark:text-red-400 font-medium">Yakin hapus semua?</span>
            <button
              onClick={confirmClear}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Ya, Hapus
            </button>
            <button
              onClick={() => setShowConfirmClear(false)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
            >
              Batal
            </button>
          </div>
        ) : (
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors font-medium border border-red-200 dark:border-red-800"
          >
            <Trash2 className="w-4 h-4" />
            Bersihkan Log
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari aktivitas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex w-full md:w-auto gap-4">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none flex-1 md:w-40"
            >
              {roles.map(r => (
                <option key={r} value={r}>{r === 'All' ? 'Semua Role' : r}</option>
              ))}
            </select>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none flex-1 md:w-40"
            >
              {modules.map(m => (
                <option key={m} value={m}>{m === 'All' ? 'Semua Modul' : m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Pengguna (Role)</th>
                <th className="px-6 py-4">Modul</th>
                <th className="px-6 py-4">Aktivitas</th>
                <th className="px-6 py-4">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium text-slate-900 dark:text-slate-100">{log.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Layout className="w-4 h-4 text-blue-500" />
                        <span>{log.module}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada aktivitas yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
