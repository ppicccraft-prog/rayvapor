import React, { useState } from 'react';
import { RefreshCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { clearAllRequests } from '../../lib/requestStore';
import { resetBundlingApprovals } from './Bundling';

export function ResetApproval() {
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  const handleReset = () => {
    try {
      // 1. Reset Request Barang & SLA
      clearAllRequests();

      // 2. Reset Bundling Approvals
      resetBundlingApprovals();

      setResetStatus('Berhasil mereset seluruh data approval.');

      setTimeout(() => {
        setResetStatus(null);
      }, 3000);
    } catch (e) {
      console.error(e);
      setResetStatus('Gagal mereset data. Terjadi kesalahan internal.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <RefreshCcw className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Hapus Data Trial</h1>
            <p className="text-slate-500">Kembalikan status transaksi yang sudah disetujui / diproses ke kondisi awal</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <AlertTriangle className="w-48 h-48 text-red-600" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Peringatan Zona Bahaya
          </h2>
          
          <div className="text-slate-600 space-y-4 mb-8">
            <p>
              Tindakan ini akan <strong>menghapus atau me-reset</strong> riwayat approval pada modul-modul berikut:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Request Barang & SLA:</strong> Semua tiket permintaan stok akan dihapus dari riwayat.</li>
              <li><strong>Report Bundling:</strong> Semua status <em>Approved</em>, <em>Pending</em>, dan <em>Rejected</em> akan dikembalikan menjadi <em>Draft</em>.</li>
            </ul>
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
              Perhatian: Tindakan ini tidak dapat dibatalkan (irreversible). Pastikan Anda benar-benar ingin mereset data untuk keperluan demonstrasi atau pengujian.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
          >
            <RefreshCcw className="w-5 h-5" />
            Ya, Hapus Data Trial
          </button>

          {resetStatus && (
            <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 border ${
              resetStatus.includes('Berhasil') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <CheckCircle2 className={`w-5 h-5 ${resetStatus.includes('Berhasil') ? 'text-emerald-600' : 'text-red-600'}`} />
              <span className="font-medium">{resetStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
