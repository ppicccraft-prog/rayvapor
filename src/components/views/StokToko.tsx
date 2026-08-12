import React, { useState, useMemo, useDeferredValue } from 'react';
import { Search, Filter, Download, ArrowDownUp, PackageSearch, BarChart3, PieChart as PieChartIcon, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { formatCurrency } from '../../lib/dataParser';

export function StokToko({ data }: { data: any }) {
  const validRows = data?.validRows || [];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToko, setSelectedToko] = useState<string>('All');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [selectedBulan, setSelectedBulan] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'qty', direction: 'desc' });
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Deferred values for non-blocking UI
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredToko = useDeferredValue(selectedToko);
  const deferredGroup = useDeferredValue(selectedGroup);
  const deferredBulan = useDeferredValue(selectedBulan);
  const deferredStatus = useDeferredValue(selectedStatus);

  const isPending = 
    searchTerm !== deferredSearchTerm || 
    selectedToko !== deferredToko || 
    selectedGroup !== deferredGroup || 
    selectedBulan !== deferredBulan || 
    selectedStatus !== deferredStatus;

  const filters = useMemo(() => {
    const toko = new Set<string>();
    const group = new Set<string>();
    const bulan = new Set<string>();
    const status = new Set<string>();

    validRows.forEach((row: any) => {
      if (row.toko) toko.add(row.toko);
      if (row.group) group.add(row.group);
      if (row.bulan) bulan.add(row.bulan);
      if (row.klasifikasi) status.add(row.klasifikasi);
    });

    return {
      toko: Array.from(toko).sort(),
      group: Array.from(group).sort(),
      bulan: Array.from(bulan).sort(),
      status: Array.from(status).sort(),
    };
  }, [validRows]);

  // Single-pass processing for maximum performance
  const { baseFilteredData, chartDataToko, chartDataStatus, totalQty, totalNilai } = useMemo(() => {
    const result = [];
    let qty = 0;
    let nilai = 0;
    const tokoMap = new Map<string, number>();
    const statusMap = new Map<string, number>();

    const term = deferredSearchTerm.toLowerCase();

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      if (deferredToko !== 'All' && row.toko !== deferredToko) continue;
      if (deferredGroup !== 'All' && row.group !== deferredGroup) continue;
      if (deferredBulan !== 'All' && row.bulan !== deferredBulan) continue;
      if (deferredStatus !== 'All' && row.klasifikasi !== deferredStatus) continue;

      if (term) {
        if (!((row.produk || '').toLowerCase().includes(term) || (row.sku || '').toLowerCase().includes(term))) {
          continue;
        }
      }

      result.push(row);
      qty += row.qty;
      nilai += (row.qty * row.hargaBeli);

      tokoMap.set(row.toko, (tokoMap.get(row.toko) || 0) + row.qty);
      statusMap.set(row.klasifikasi, (statusMap.get(row.klasifikasi) || 0) + row.qty);
    }

    const tokoChart = Array.from(tokoMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);

    const statusChart = Array.from(statusMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { 
      baseFilteredData: result, 
      chartDataToko: tokoChart, 
      chartDataStatus: statusChart, 
      totalQty: qty, 
      totalNilai: nilai 
    };
  }, [validRows, deferredSearchTerm, deferredToko, deferredGroup, deferredBulan, deferredStatus]);

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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, deferredToko, deferredGroup, deferredBulan, deferredStatus, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('sehat') || s.includes('fast')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s.includes('slow')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (s.includes('dead') || s.includes('mati')) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredData.map((_: any, i: number) => i)));
    }
  };

  const toggleSelectItem = (index: number) => {
    const next = new Set(selectedItems);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedItems(next);
  };

  const handleExportStockOpname = () => {
    if (selectedItems.size === 0) {
      alert('Pilih minimal satu item untuk Stock Opname');
      return;
    }
    const itemsToExport = filteredData.filter((_: any, idx: number) => selectedItems.has(idx));
    
    // Create CSV content for Stock Opname
    const headers = ['Toko', 'Bulan', 'Group', 'SKU', 'Produk', 'Sistem QTY', 'Fisik QTY', 'Selisih', 'Keterangan'];
    const csvContent = [
      headers.join(','),
      ...itemsToExport.map((row: any) => 
        `"${row.toko}","${row.bulan}","${row.group}","${row.sku}","${row.produk}",${row.qty},"","",""`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stock_Opname_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];
  const STATUS_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#64748b'];

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div>
          <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-indigo-600" />
            Stok Akhir per Toko
          </h2>
          <p className="text-xs text-slate-500 mt-1">Pantau ketersediaan stok, nilai aset, dan status pergerakan barang</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari Produk atau SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <select value={selectedToko} onChange={e => setSelectedToko(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-indigo-500">
              <option value="All">Semua Toko</option>
              {filters.toko.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-indigo-500">
              <option value="All">Semua Kategori</option>
              {filters.group.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={selectedBulan} onChange={e => setSelectedBulan(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-indigo-500 hidden sm:block">
              <option value="All">Semua Bulan</option>
              {filters.bulan.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-indigo-500">
              <option value="All">Semua Status</option>
              {filters.status.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className={`transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 mb-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <PackageSearch className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('id-ID').format(totalQty)}</div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total QTY Stok</div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalNilai)}</div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Nilai Stok (HPP)</div>
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

        {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" /> Distribusi Stok per Toko (QTY)
          </h3>
          <div className="flex-1 min-h-[250px]">
            {chartDataToko.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataToko} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(val)} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {chartDataToko.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Tidak ada data</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-emerald-500" /> Komposisi Status (QTY)
          </h3>
          <div className="flex-1 min-h-[250px] relative">
            {chartDataStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartDataStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                    {chartDataStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => [new Intl.NumberFormat('id-ID').format(value) + ' unit', 'QTY']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Tidak ada data</div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Daftar Stok SKU</h3>
          <button
            onClick={handleExportStockOpname}
            disabled={selectedItems.size === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm ${
              selectedItems.size > 0 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            Export untuk Stock Opname ({selectedItems.size})
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 select-none">
              <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedItems.size === filteredData.length && filteredData.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('toko')}>
                  <div className="flex items-center gap-1">Toko {sortConfig.key === 'toko' && <ArrowDownUp className="w-3 h-3 text-indigo-600" />}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('produk')}>
                  <div className="flex items-center gap-1">Produk & SKU {sortConfig.key === 'produk' && <ArrowDownUp className="w-3 h-3 text-indigo-600" />}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('group')}>
                  <div className="flex items-center gap-1">Kategori {sortConfig.key === 'group' && <ArrowDownUp className="w-3 h-3 text-indigo-600" />}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors text-center" onClick={() => handleSort('qty')}>
                  <div className="flex items-center justify-center gap-1">Sistem QTY {sortConfig.key === 'qty' && <ArrowDownUp className="w-3 h-3 text-indigo-600" />}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors text-right" onClick={() => handleSort('hargaBeli')}>
                  <div className="flex items-center justify-end gap-1">Harga Beli {sortConfig.key === 'hargaBeli' && <ArrowDownUp className="w-3 h-3 text-indigo-600" />}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('klasifikasi')}>
                  <div className="flex items-center justify-center gap-1">Status {sortConfig.key === 'klasifikasi' && <ArrowDownUp className="w-3 h-3 text-indigo-600" />}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((row: any, localIdx: number) => {
                const globalIdx = (currentPage - 1) * itemsPerPage + localIdx;
                const isSelected = selectedItems.has(globalIdx);
                return (
                  <tr key={globalIdx} className={`transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-3">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelectItem(globalIdx)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800">{row.toko}</td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-900 truncate max-w-[250px]" title={row.produk}>{row.produk}</div>
                      <div className="text-xs text-slate-500">{row.sku}</div>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{row.group}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-md">
                        {new Intl.NumberFormat('id-ID').format(row.qty)}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-700 text-right">
                      {formatCurrency(row.hargaBeli)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md border inline-block ${getStatusColor(row.klasifikasi)}`}>
                        {row.klasifikasi.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">Tidak ada data stok yang sesuai dengan filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
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
    </div>
  );
}
