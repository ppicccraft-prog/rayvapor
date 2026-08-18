import React, { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import { apiFetch } from '../../utils/apiFetch';
import { ArrowRightLeft, Search, Loader2, AlertCircle, TrendingDown, TrendingUp, Package, Download, Filter, ArrowDownUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

let cachedData: any = null;

export function TransferToko() {
  const [data, setData] = useState<any[]>(cachedData || []);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [selectedTokoTujuan, setSelectedTokoTujuan] = useState('All');
  const [sortSummaryConfig, setSortSummaryConfig] = useState<{key: string, direction: 'asc'|'desc'}>({key: 'nilai', direction: 'desc'});

  useEffect(() => {
    fetchTransferData();
  }, []);

  const fetchTransferData = async () => {
    if (cachedData) { setData(cachedData); setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/transfer_toko');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          cachedData = results.data; setData(results.data);
        },
        error: (error: any) => {
          console.error(error);
          setError('Gagal memproses data transfer.');
        }
      });
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data dari spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  };

  const groups = useMemo(() => {
    const set = new Set<string>();
    data.forEach(row => {
      const g = row['Group']?.trim();
      if (g && g.toLowerCase() !== 'group') set.add(g);
    });
    return Array.from(set).sort();
  }, [data]);

  const tokos = ['Cilandak', 'Karang Tengah', 'Cinere', 'Jagakarsa', 'Pondok Pinang'];

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((row: any) => {
      const sku = row['SKU'] || '';
      const produk = row['Produk'] || '';
      const group = row['Group']?.trim() || 'Lainnya';
      const terlaris = row['Toko Terlaris']?.trim() || '';
      
      if (selectedGroup !== 'All' && group !== selectedGroup) return false;
      if (selectedTokoTujuan !== 'All' && terlaris !== selectedTokoTujuan) return false;

      return sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
             produk.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm, selectedGroup, selectedTokoTujuan]);

  const handleExport = () => {
    if (filteredData.length === 0) return;
    const exportData: any[] = [];
    
    filteredData.forEach((row: any) => {
      const stokNganggur = parseInt(row[' Stok Nganggur '] || '0', 10);
      if (stokNganggur <= 0) return;
      
      const terlaris = row['Toko Terlaris']?.trim() || '';
      const tokoList = ['Cilandak', 'Karang Tengah', 'Cinere', 'Jagakarsa', 'Pondok Pinang'];
      
      let detailString = '';
      const transferDetails = tokoList
        .filter(toko => toko !== terlaris)
        .map(toko => {
          const stockKey = Object.keys(row).find(k => k.includes(`Stok ${toko}`));
          const initialStock = stockKey ? parseInt(row[stockKey] || '0', 10) : 0;
          const transferQty = Math.max(0, initialStock - 2);
          return { toko, transferQty };
        })
        .filter(detail => detail.transferQty > 0);
        
      detailString = transferDetails.map(d => `${d.toko} (Transfer ${d.transferQty})`).join(', ');

      exportData.push({
        'SKU': row['SKU'],
        'Produk': row['Produk'],
        'Group': row['Group'],
        'Stok Nganggur': stokNganggur,
        'Toko Tujuan': terlaris,
        'Detail Toko Asal': detailString,
        'Nilai Nganggur (Rp)': row[' Nilai Nganggur (Rp) ']
      });
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Transfer_Antar_Toko.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const transferSummary = useMemo(() => {
    if (!filteredData) return [];

    const summaryMap = new Map<string, { dari: string; ke: string; qty: number; nilai: number }>();

    filteredData.forEach((row: any) => {
      const stokNganggur = parseInt(row[' Stok Nganggur '] || '0', 10);
      if (stokNganggur <= 0) return;

      const terlaris = row['Toko Terlaris']?.trim() || '';
      const tokoList = ['Cilandak', 'Karang Tengah', 'Cinere', 'Jagakarsa', 'Pondok Pinang'];
      
      const nilaiNganggur = Number(String(row[' Nilai Nganggur (Rp) '] || '0').replace(/[^0-9.-]+/g, ""));
      const nilaiPerItem = stokNganggur > 0 ? nilaiNganggur / stokNganggur : 0;

      tokoList.forEach(toko => {
        if (toko === terlaris) return;

        const stockKey = Object.keys(row).find(k => k.includes(`Stok ${toko}`));
        const initialStock = stockKey ? parseInt(row[stockKey] || '0', 10) : 0;
        const transferQty = Math.max(0, initialStock - 2);

        if (transferQty > 0) {
          const key = `${toko}-${terlaris}`;
          const current = summaryMap.get(key) || { dari: toko, ke: terlaris, qty: 0, nilai: 0 };
          current.qty += transferQty;
          current.nilai += (transferQty * nilaiPerItem);
          summaryMap.set(key, current);
        }
      });
    });

    const arr = Array.from(summaryMap.values());
    arr.sort((a, b) => {
      let diff = 0;
      if (sortSummaryConfig.key === 'dari') diff = a.dari.localeCompare(b.dari);
      else if (sortSummaryConfig.key === 'ke') diff = a.ke.localeCompare(b.ke);
      else if (sortSummaryConfig.key === 'qty') diff = a.qty - b.qty;
      else if (sortSummaryConfig.key === 'nilai') diff = a.nilai - b.nilai;
      return sortSummaryConfig.direction === 'asc' ? diff : -diff;
    });

    return arr;
  }, [filteredData, sortSummaryConfig]);

  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    transferSummary.forEach(item => {
      map.set(item.ke, (map.get(item.ke) || 0) + item.qty);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transferSummary]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const handleSortSummary = (key: string) => {
    if (sortSummaryConfig.key === key) {
      setSortSummaryConfig({ key, direction: sortSummaryConfig.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortSummaryConfig({ key, direction: 'desc' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p>Memuat saran transfer antar toko...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="max-w-md w-full bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 mx-auto" />
          <p className="font-medium">{error}</p>
          <button 
            onClick={fetchTransferData}
            className="px-4 py-2 bg-white text-red-600 font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors shadow-sm"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Saran Transfer Antar Toko</h2>
            <p className="text-xs text-slate-500">Rekomendasi pemindahan stok untuk optimasi penjualan</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari Produk atau SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select 
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 bg-white"
            >
              <option value="All">Semua Kategori</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select 
              value={selectedTokoTujuan}
              onChange={(e) => setSelectedTokoTujuan(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 bg-white"
            >
              <option value="All">Semua Toko Tujuan</option>
              {tokos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap ml-auto lg:ml-0"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-sm font-medium text-slate-500">Total SKU Disarankan</span>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('id-ID').format(filteredData.length)}
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-sm font-medium text-slate-500">Total Qty Transfer</span>
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('id-ID').format(transferSummary.reduce((acc, curr) => acc + curr.qty, 0))}
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-indigo-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group lg:col-span-2">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-sm font-medium text-slate-500">Estimasi Nilai Stok Dipulihkan</span>
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
                transferSummary.reduce((acc, curr) => acc + curr.nilai, 0)
              )}
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Ringkasan Transfer Antar Toko</h3>
          </div>
          <div className="overflow-x-auto max-h-[350px]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider select-none">
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSortSummary('dari')}>
                    <div className="flex items-center gap-1">Toko Asal {sortSummaryConfig.key === 'dari' ? <ArrowDownUp className={`w-3 h-3 ${sortSummaryConfig.direction === 'desc' ? 'text-indigo-600' : 'text-indigo-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSortSummary('ke')}>
                    <div className="flex items-center gap-1">Toko Tujuan {sortSummaryConfig.key === 'ke' ? <ArrowDownUp className={`w-3 h-3 ${sortSummaryConfig.direction === 'desc' ? 'text-indigo-600' : 'text-indigo-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSortSummary('qty')}>
                    <div className="flex items-center justify-center gap-1">Total Item Ditransfer {sortSummaryConfig.key === 'qty' ? <ArrowDownUp className={`w-3 h-3 ${sortSummaryConfig.direction === 'desc' ? 'text-indigo-600' : 'text-indigo-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSortSummary('nilai')}>
                    <div className="flex items-center justify-end gap-1">Estimasi Nilai Dipulihkan {sortSummaryConfig.key === 'nilai' ? <ArrowDownUp className={`w-3 h-3 ${sortSummaryConfig.direction === 'desc' ? 'text-indigo-600' : 'text-indigo-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transferSummary.map((summary, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800">{summary.dari}</td>
                    <td className="px-6 py-3 font-medium text-indigo-600">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-3 h-3 text-slate-400 shrink-0" />
                        {summary.ke}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-md">
                        {new Intl.NumberFormat('id-ID').format(summary.qty)}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-emerald-600 text-right">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summary.nilai)}
                    </td>
                  </tr>
                ))}
                {transferSummary.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">Tidak ada ringkasan transfer.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4">Distribusi Tujuan Transfer (Qty)</h3>
          <div className="flex-1 min-h-[250px] relative">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => [new Intl.NumberFormat('id-ID').format(value) + ' unit', 'Tujuan Transfer']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                Tidak ada data distribusi
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Detail Rekomendasi per Produk</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4">Produk</th>
                <th className="px-6 py-4 text-center">Stok Nganggur</th>
                <th className="px-6 py-4">Toko Tujuan (Terlaris)</th>
                <th className="px-6 py-4">Detail Toko Asal</th>
                <th className="px-6 py-4 text-right">Nilai (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((row: any, i: number) => {
                const stokNganggur = parseInt(row[' Stok Nganggur '] || '0', 10);
                if (stokNganggur <= 0) return null;
                
                const tokoList = ['Cilandak', 'Karang Tengah', 'Cinere', 'Jagakarsa', 'Pondok Pinang'];
                const terlaris = row['Toko Terlaris']?.trim() || '';
                const transferDetails = tokoList
                  .filter(toko => toko !== terlaris)
                  .map(toko => {
                    const stockKey = Object.keys(row).find(k => k.includes(`Stok ${toko}`));
                    const initialStock = stockKey ? parseInt(row[stockKey] || '0', 10) : 0;
                    const transferQty = Math.max(0, initialStock - 2);
                    
                    return {
                      toko,
                      initialStock,
                      transferQty
                    };
                  })
                  .filter(detail => detail.transferQty > 0);

                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-900 whitespace-normal min-w-[200px]">{row['Produk']}</div>
                      <div className="text-xs text-slate-500">{row['SKU']}</div>
                    </td>
                    <td className="px-6 py-3 text-center align-top">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-md inline-block mt-1">
                        {stokNganggur}
                      </span>
                    </td>
                    <td className="px-6 py-3 align-top">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-md border border-indigo-100 inline-block mt-1">
                        {terlaris || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-3 align-top">
                      <div className="space-y-1.5 mt-1">
                        {transferDetails.length > 0 ? (
                          transferDetails.map((detail, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[11px] sm:text-xs">
                              <span className="w-24 text-slate-700 font-medium">{detail.toko}</span>
                              <span className="w-16 text-slate-500">Stok: {detail.initialStock}</span>
                              <ArrowRightLeft className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="font-bold text-emerald-600">Transfer {detail.transferQty}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">Tidak ada toko asal</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900 text-right align-top pt-4">
                      {row[' Nilai Nganggur (Rp) ']}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-slate-500">Tidak ada data yang sesuai dengan pencarian Anda.</div>
          )}
        </div>
      </div>
    </div>
  );
}
