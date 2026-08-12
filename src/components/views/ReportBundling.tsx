import React, { useState, useMemo } from 'react';
import { Search, Download, Package, ArrowDownUp, Filter } from 'lucide-react';
import { getBundlingData } from './Bundling';
import Papa from 'papaparse';

export function ReportBundling() {
  const allData = getBundlingData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const reportData = useMemo(() => {
    return allData.filter((row: any) => {
      const status = row._approvalStatus || 'Draft';
      if (status === 'Draft') return false; // Only show submitted ones
      
      if (statusFilter !== 'All' && status !== statusFilter) return false;
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const rider = (row['Rider (Lambat/Mati)'] || '').toLowerCase();
        const anchor = (row['Anchor (Fast Mover)'] || '').toLowerCase();
        if (!rider.includes(term) && !anchor.includes(term)) return false;
      }
      return true;
    });
  }, [allData, searchTerm, statusFilter]);

  const handleExport = () => {
    if (reportData.length === 0) return;
    
    const exportData = reportData.map((row: any) => {
      const hargaAwal = Number(String(row['Harga Normal'] || '0').replace(/[^0-9.-]+/g, "")) || 0;
      const diskon = Number(row._diskon) || 0;
      const nilaiLoss = hargaAwal * (diskon / 100);
      const hargaBundle = hargaAwal - nilaiLoss;

      return {
        'Kategori': row['Group'],
        'Produk Fast Mover (Anchor)': row['Anchor (Fast Mover)'],
        'Produk Lambat/Mati (Rider)': row['Rider (Lambat/Mati)'],
        'Status Rider': row['Status Rider'],
        'Stok Rider': row['Rider Stok'],
        'Nilai Stok Rider': row['Nilai Stok Rider'],
        'Harga Normal': hargaAwal,
        'Diskon (%)': diskon,
        'Harga Bundle': hargaBundle,
        'Nilai Loss': nilaiLoss,
        'Status Approval': row._approvalStatus || 'Draft',
        'Saran Bundle': row['Saran Bundle']
      };
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `report_bundling_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Report Bundling</h1>
          <p className="text-slate-500">Daftar rekomendasi bundling yang telah diajukan.</p>
        </div>
        
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama produk rider / anchor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 bg-white"
            >
              <option value="All">Semua Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 select-none">
              <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4">Produk Lambat/Mati (Rider)</th>
                <th className="px-6 py-4">Produk Laris (Anchor)</th>
                <th className="px-6 py-4 text-right">Harga Awal</th>
                <th className="px-6 py-4 text-center">Diskon (%)</th>
                <th className="px-6 py-4 text-right">Harga Bundle</th>
                <th className="px-6 py-4 text-right">Nilai Loss</th>
                <th className="px-6 py-4 text-center">Status Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((row: any) => {
                const hargaAwal = Number(String(row['Harga Normal'] || '0').replace(/[^0-9.-]+/g, "")) || 0;
                const diskon = Number(row._diskon) || 0;
                const nilaiLoss = hargaAwal * (diskon / 100);
                const hargaBundle = hargaAwal - nilaiLoss;
                const approvalStatus = row._approvalStatus || 'Draft';

                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-900">{row['Rider (Lambat/Mati)']}</div>
                      <div className="text-xs text-slate-500">{row['Rider SKU']}</div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-indigo-700">{row['Anchor (Fast Mover)']}</div>
                      <div className="text-xs text-indigo-400">{row['Anchor SKU']}</div>
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900 text-right">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(hargaAwal)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-medium">
                        {diskon}%
                      </span>
                    </td>
                    <td className="px-6 py-3 font-bold text-purple-700 text-right">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(hargaBundle)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 font-semibold rounded-md border border-red-100 inline-block">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(nilaiLoss)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md whitespace-nowrap border ${
                        approvalStatus === 'Pending' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        approvalStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {approvalStatus.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p>Tidak ada data bundling yang telah diajukan.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {reportData.length > 0 && (
          <div className="p-4 border-t border-slate-200 text-sm text-slate-500">
            Menampilkan {reportData.length} data laporan bundling.
          </div>
        )}
      </div>
    </div>
  );
}
