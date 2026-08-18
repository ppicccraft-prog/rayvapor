import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import Papa from 'papaparse';
import { apiFetch } from '../../utils/apiFetch';
import { Search, Filter, ArrowDownUp, PackageSearch, BarChart3, AlertCircle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

const TOKO_LIST = ['Cilandak', 'Karang Tengah', 'Cinere', 'Jagakarsa', 'Pondok Pinang'];

export function DeadStock() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [selectedToko, setSelectedToko] = useState('All');
  const [selectedUmurStok, setSelectedUmurStok] = useState('All');
  const [selectedNilaiRange, setSelectedNilaiRange] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'qty', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchDeadStock();
  }, []);

  const fetchDeadStock = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/dead_stock');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const csvData = await response.text();
      
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Normalize keys
          const normalized = results.data.map((row: any) => {
            const getVal = (possibleKeys: string[]) => {
              for (const k of possibleKeys) {
                const found = Object.keys(row).find(key => key.toLowerCase().trim() === k.toLowerCase());
                if (found) return row[found];
              }
              return '';
            };

            const qtyRaw = getVal(['stok berjalan', 'qty', 'stok mati', 'dead stock qty']);
            const qty = parseInt(qtyRaw?.toString().replace(/,/g, '') || '0', 10);
            
            const nilaiRaw = getVal(['nilai stok (rp)', 'nilai stok', 'nilai', 'total']);
            const nilai = parseFloat(nilaiRaw?.toString().replace(/[^0-9.-]+/g, '') || '0');

            const tokoStocks: Record<string, number> = {};
            TOKO_LIST.forEach(toko => {
              const val = getVal([toko]);
              tokoStocks[toko] = parseInt(val?.toString().replace(/,/g, '') || '0', 10) || 0;
            });

            return {
              produk: getVal(['produk', 'product', 'nama produk', 'item']),
              sku: getVal(['sku', 'kode', 'kode barang']),
              group: getVal(['group', 'grup', 'kategori utama']),
              umurStok: getVal(['umur stok']),
              rekomendasiAging: getVal(['rekomendasi aging']),
              tokoStocks,
              qty: isNaN(qty) ? 0 : qty,
              nilai: isNaN(nilai) ? 0 : nilai,
              // User requested 'terakhir dibeli' / 'terakhir bergerak'
              terakhirDibeli: getVal(['terakhir dibeli']),
              terakhirBergerak: getVal(['terakhir bergerak']),
            };
          });
          setData(normalized);
          setIsLoading(false);
        },
        error: (error: any) => {
          setError(error.message);
          setIsLoading(false);
        }
      });
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredGroup = useDeferredValue(selectedGroup);
  const deferredToko = useDeferredValue(selectedToko);
  const deferredUmurStok = useDeferredValue(selectedUmurStok);
  const deferredNilaiRange = useDeferredValue(selectedNilaiRange);

  const filters = useMemo(() => {
    const group = new Set<string>();
    const umurStok = new Set<string>();

    data.forEach(row => {
      if (row.group) group.add(row.group);
      if (row.umurStok) umurStok.add(row.umurStok);
    });

    return {
      group: Array.from(group).sort(),
      umurStok: Array.from(umurStok).sort(),
    };
  }, [data]);

  const { baseFilteredData, chartDataToko, totalQty, totalNilai } = useMemo(() => {
    const result = [];
    let qty = 0;
    let nilai = 0;
    const tokoMap = new Map<string, number>();

    const term = deferredSearchTerm.toLowerCase();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (deferredGroup !== 'All' && row.group !== deferredGroup) continue;
      if (deferredUmurStok !== 'All' && row.umurStok !== deferredUmurStok) continue;
      
      if (deferredToko !== 'All' && row.tokoStocks[deferredToko] <= 0) {
        continue;
      }

      if (deferredNilaiRange !== 'All') {
        if (deferredNilaiRange === '< 1 Juta' && row.nilai >= 1000000) continue;
        if (deferredNilaiRange === '1-5 Juta' && (row.nilai < 1000000 || row.nilai > 5000000)) continue;
        if (deferredNilaiRange === '> 5 Juta' && row.nilai <= 5000000) continue;
      }

      if (term) {
        if (!((row.produk || '').toLowerCase().includes(term) || (row.sku || '').toLowerCase().includes(term))) {
          continue;
        }
      }

      result.push(row);
      qty += row.qty;
      nilai += row.nilai;

      TOKO_LIST.forEach(toko => {
        tokoMap.set(toko, (tokoMap.get(toko) || 0) + (row.tokoStocks[toko] || 0));
      });
    }

    let tokoChart = Array.from(tokoMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (deferredToko !== 'All') {
      tokoChart = tokoChart.filter(t => t.name === deferredToko);
    }

    return { 
      baseFilteredData: result, 
      chartDataToko: tokoChart, 
      totalQty: qty, 
      totalNilai: nilai 
    };
  }, [data, deferredSearchTerm, deferredGroup, deferredToko, deferredUmurStok, deferredNilaiRange]);

  const filteredData = useMemo(() => {
    const result = [...baseFilteredData];
    result.sort((a: any, b: any) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [baseFilteredData, sortConfig]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, deferredGroup, deferredToko, deferredUmurStok, deferredNilaiRange, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getStatusColor = (umur: string) => {
    if (!umur) return 'bg-slate-100 text-slate-600 border-slate-200';
    if (umur.includes('≥ 3 bln')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (umur.includes('≥ 2 bln')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
        <p>Memuat data Dead Stock...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 text-center max-w-lg">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-bold text-lg mb-2">Gagal Memuat Data</h3>
          <p className="text-sm opacity-80">{error}</p>
          <button 
            onClick={fetchDeadStock}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dead Stock Analysis</h2>
          <p className="text-slate-500 text-sm mt-1">Identifikasi dan kelola stok tidak bergerak</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari SKU atau Produk..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {filters.group.length > 0 && (
            <select 
              value={selectedGroup} 
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">Semua Kategori</option>
              {filters.group.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}

          <select 
            value={selectedToko} 
            onChange={(e) => setSelectedToko(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">Semua Toko</option>
            {TOKO_LIST.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {filters.umurStok.length > 0 && (
            <select 
              value={selectedUmurStok} 
              onChange={(e) => setSelectedUmurStok(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">Semua Umur Stok</option>
              {filters.umurStok.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          )}

          <select 
            value={selectedNilaiRange} 
            onChange={(e) => setSelectedNilaiRange(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">Semua Nilai</option>
            <option value="< 1 Juta">&lt; 1 Juta</option>
            <option value="1-5 Juta">1 - 5 Juta</option>
            <option value="> 5 Juta">&gt; 5 Juta</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <PackageSearch className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('id-ID').format(totalQty)}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total QTY Dead Stock</div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalNilai)}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Nilai (HPP)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('id-ID').format(filteredData.length)}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">SKU Ditampilkan</div>
          </div>
        </div>
      </div>

      {chartDataToko.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Distribusi Dead Stock per Toko (QTY)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataToko} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  height={30}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => new Intl.NumberFormat('id-ID', { notation: "compact", compactDisplay: "short" }).format(value)}
                />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [new Intl.NumberFormat('id-ID').format(value), 'QTY']}
                />
                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {chartDataToko.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={'#f87171'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('produk')}>
                  <div className="flex items-center gap-1">SKU / Produk {sortConfig.key === 'produk' ? <ArrowDownUp className={`w-3 h-3 ${sortConfig.direction === 'desc' ? 'text-indigo-600' : 'text-indigo-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('group')}>
                  <div className="flex items-center gap-1">Group {sortConfig.key === 'group' ? <ArrowDownUp className={`w-3 h-3 ${sortConfig.direction === 'desc' ? 'text-indigo-600' : 'text-indigo-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors text-center" onClick={() => handleSort('qty')}>
                  <div className="flex items-center justify-center gap-1">Total Qty {sortConfig.key === 'qty' ? <ArrowDownUp className={`w-3 h-3 ${sortConfig.direction === 'desc' ? 'text-indigo-600' : 'text-indigo-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors text-right" onClick={() => handleSort('nilai')}>
                  <div className="flex items-center justify-end gap-1">Total Nilai {sortConfig.key === 'nilai' ? <ArrowDownUp className={`w-3 h-3 ${sortConfig.direction === 'desc' ? 'text-indigo-600' : 'text-indigo-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('umurStok')}>
                  <div className="flex items-center gap-1">Umur Stok / Status {sortConfig.key === 'umurStok' ? <ArrowDownUp className={`w-3 h-3 ${sortConfig.direction === 'desc' ? 'text-indigo-600' : 'text-indigo-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('rekomendasiAging')}>
                  <div className="flex items-center gap-1">Rekomendasi {sortConfig.key === 'rekomendasiAging' ? <ArrowDownUp className={`w-3 h-3 ${sortConfig.direction === 'desc' ? 'text-indigo-600' : 'text-indigo-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900 truncate max-w-[250px]" title={row.produk}>{row.produk || '-'}</div>
                    <div className="text-xs text-slate-500">{row.sku || '-'}</div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">{row.group || '-'}</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-md">
                      {new Intl.NumberFormat('id-ID').format(row.qty)}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-700 text-right">
                    {formatCurrency(row.nilai)}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md border inline-block w-fit ${getStatusColor(row.umurStok)}`}>
                        {row.umurStok || 'Data Tidak Tersedia'}
                      </span>
                      {row.terakhirDibeli && (
                        <span className="text-[10px] text-slate-400">Dibeli: {row.terakhirDibeli}</span>
                      )}
                      {row.terakhirBergerak && (
                        <span className="text-[10px] text-slate-400">Terakhir Bergerak: {row.terakhirBergerak}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs font-medium text-slate-600 max-w-[250px] truncate block" title={row.rekomendasiAging}>
                      {row.rekomendasiAging || '-'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Tidak ada data dead stock yang sesuai dengan filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 select-none">
            <div className="text-xs text-slate-500">
              Menampilkan <span className="font-semibold text-slate-700">{Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)}</span> - <span className="font-semibold text-slate-700">{Math.min(filteredData.length, currentPage * itemsPerPage)}</span> dari <span className="font-semibold text-slate-700">{filteredData.length}</span> SKU
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Pertama
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sebelumnya
              </button>
              <div className="text-xs font-semibold text-slate-600 px-2">
                Halaman {currentPage} dari {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Berikutnya
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Terakhir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
