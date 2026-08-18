import React, { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import { apiFetch } from '../../utils/apiFetch';
import { Search, Loader2, AlertCircle, TrendingDown, TrendingUp, Package, Download, PackagePlus, ArrowDownUp, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

let cachedData: any = null;

export const getBundlingData = () => cachedData || [];
export const resetBundlingApprovals = () => {
  if (cachedData) {
    cachedData = cachedData.map((row: any) => ({ ...row, _approvalStatus: 'Draft' }));
  }
};

export function Bundling({ role = 'Direksi' }: { role?: string }) {
  const [data, setData] = useState<any[]>(cachedData || []);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  
  const [sortRingkasanConfig, setSortRingkasanConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'nilai', direction: 'desc' });
  const [sortDetailConfig, setSortDetailConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });

  const [uniqueRiders, setUniqueRiders] = useState<any[]>([]);
  const [uniqueAnchors, setUniqueAnchors] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchBundlingData();
  }, []);

  const fetchBundlingData = async () => {
    if (cachedData) { 
      setData(cachedData); 
      setIsLoading(false); 
      // Compute options if cachedData exists
      const rMap = new Map<string, any>();
      const aMap = new Map<string, any>();
      cachedData.forEach((row: any) => {
        const rName = row['Rider (Lambat/Mati)'];
        if (rName && rName.toLowerCase() !== 'rider (lambat/mati)' && !rMap.has(rName)) {
          rMap.set(rName, { name: rName, sku: row['Rider SKU'], status: row['Status Rider'], stok: row['Rider Stok'], hargaNormal: row['Harga Normal'] });
        }
        const aName = row['Anchor (Fast Mover)'];
        if (aName && aName.toLowerCase() !== 'anchor (fast mover)' && !aMap.has(aName)) {
          aMap.set(aName, { name: aName, sku: row['Anchor SKU'] });
        }
      });
      setUniqueRiders(Array.from(rMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      setUniqueAnchors(Array.from(aMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      return; 
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/bundling');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const withId = results.data.map((row: any, i: number) => {
            const hNormal = Number(String(row['Harga Normal'] || '0').replace(/[^0-9.-]+/g, ""));
            const hHemat = Number(String(row['Hemat Pembeli'] || '0').replace(/[^0-9.-]+/g, ""));
            let defDiskon = 0;
            if (hNormal > 0 && hHemat > 0) {
              defDiskon = Math.round((hHemat / hNormal) * 100);
            }
            return {
              ...row,
              id: i,
              _diskon: defDiskon || 10,
              _approvalStatus: 'Draft'
            };
          });

          const rMap = new Map<string, any>();
          const aMap = new Map<string, any>();
          withId.forEach((row: any) => {
            const rName = row['Rider (Lambat/Mati)'];
            if (rName && rName.toLowerCase() !== 'rider (lambat/mati)' && !rMap.has(rName)) {
              rMap.set(rName, { name: rName, sku: row['Rider SKU'], status: row['Status Rider'], stok: row['Rider Stok'], hargaNormal: row['Harga Normal'] });
            }
            const aName = row['Anchor (Fast Mover)'];
            if (aName && aName.toLowerCase() !== 'anchor (fast mover)' && !aMap.has(aName)) {
              aMap.set(aName, { name: aName, sku: row['Anchor SKU'] });
            }
          });
          setUniqueRiders(Array.from(rMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
          setUniqueAnchors(Array.from(aMap.values()).sort((a, b) => a.name.localeCompare(b.name)));

          cachedData = withId; 
          setData(withId);
        },
        error: (error: any) => {
          console.error(error);
          setError('Gagal memproses data bundling.');
        }
      });
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data dari spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateRow = (id: number, updates: any) => {
    setData(prev => {
      const next = prev.map(row => {
        if (row.id === id) {
          return { ...row, ...updates };
        }
        return row;
      });
      cachedData = next;
      return next;
    });
  };

  const handleRiderChange = (id: number, riderName: string) => {
    if (!riderName) {
      updateRow(id, {
        'Rider (Lambat/Mati)': '',
        'Rider SKU': '',
        'Status Rider': '',
        'Rider Stok': 0,
        'Harga Normal': 0,
        _approvalStatus: 'Draft'
      });
      return;
    }
    const riderInfo = uniqueRiders.find(r => r.name === riderName);
    if (riderInfo) {
      updateRow(id, {
        'Rider (Lambat/Mati)': riderInfo.name,
        'Rider SKU': riderInfo.sku,
        'Status Rider': riderInfo.status,
        'Rider Stok': riderInfo.stok,
        'Harga Normal': riderInfo.hargaNormal,
        _approvalStatus: 'Draft'
      });
    }
  };

  const handleAnchorChange = (id: number, anchorName: string) => {
    if (!anchorName) {
      updateRow(id, {
        'Anchor (Fast Mover)': '',
        'Anchor SKU': '',
        _approvalStatus: 'Draft'
      });
      return;
    }
    const anchorInfo = uniqueAnchors.find(a => a.name === anchorName);
    if (anchorInfo) {
      updateRow(id, {
        'Anchor (Fast Mover)': anchorInfo.name,
        'Anchor SKU': anchorInfo.sku,
        _approvalStatus: 'Draft'
      });
    }
  };

  const handleDiskonChange = (id: number, diskon: string) => {
    updateRow(id, {
      _diskon: diskon,
      _approvalStatus: 'Draft'
    });
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = (action: 'Draft' | 'Pending' | 'Approved' | 'Rejected') => {
    if (selectedIds.size === 0) return;
    setData(prev => {
      const next = prev.map(row => {
        if (selectedIds.has(row.id)) {
          return { ...row, _approvalStatus: action };
        }
        return row;
      });
      cachedData = next;
      return next;
    });
    setSelectedIds(new Set());
  };

  const groups = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.forEach(row => {
      const g = row['Group']?.trim();
      if (g && g.toLowerCase() !== 'group') set.add(g);
    });
    return Array.from(set).sort();
  }, [data]);

  const statuses = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.forEach(row => {
      const s = row['Status Rider']?.trim();
      if (s && s.toLowerCase() !== 'status rider') set.add(s);
    });
    return Array.from(set).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    
    let result = data.filter((row: any) => {
      const riderSku = row['Rider SKU'] || '';
      if (!riderSku || riderSku.toLowerCase() === 'rider sku') return false;

      const group = row['Group']?.trim() || 'Lainnya';
      if (selectedGroup !== 'All' && group !== selectedGroup) return false;

      const statusRider = row['Status Rider'] || 'Slow Moving';
      if (selectedStatus !== 'All' && statusRider !== selectedStatus) return false;

      const rider = row['Rider (Lambat/Mati)'] || '';
      const anchor = row['Anchor (Fast Mover)'] || '';
      
      const term = searchTerm.toLowerCase();
      return riderSku.toLowerCase().includes(term) || 
             rider.toLowerCase().includes(term) ||
             anchor.toLowerCase().includes(term);
    });

    result.sort((a, b) => {
      if (sortDetailConfig.key === 'id') {
        return sortDetailConfig.direction === 'asc' ? a.id - b.id : b.id - a.id;
      }
      if (sortDetailConfig.key === 'stok') {
        const valA = parseInt(a['Rider Stok'] || '0', 10);
        const valB = parseInt(b['Rider Stok'] || '0', 10);
        return sortDetailConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      if (sortDetailConfig.key === 'harga') {
        const diskonA = Number(a._diskon) || 0;
        const diskonB = Number(b._diskon) || 0;
        const hA = Number(String(a['Harga Normal'] || '0').replace(/[^0-9.-]+/g, "")) * (1 - diskonA / 100);
        const hB = Number(String(b['Harga Normal'] || '0').replace(/[^0-9.-]+/g, "")) * (1 - diskonB / 100);
        return sortDetailConfig.direction === 'asc' ? hA - hB : hB - hA;
      }
      if (sortDetailConfig.key === 'loss') {
        const diskonA = Number(a._diskon) || 0;
        const diskonB = Number(b._diskon) || 0;
        const lA = Number(String(a['Harga Normal'] || '0').replace(/[^0-9.-]+/g, "")) * (diskonA / 100);
        const lB = Number(String(b['Harga Normal'] || '0').replace(/[^0-9.-]+/g, "")) * (diskonB / 100);
        return sortDetailConfig.direction === 'asc' ? lA - lB : lB - lA;
      }
      if (sortDetailConfig.key === 'rider') {
        const valA = String(a['Rider (Lambat/Mati)'] || '');
        const valB = String(b['Rider (Lambat/Mati)'] || '');
        return sortDetailConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });

    return result;
  }, [data, searchTerm, selectedGroup, selectedStatus, sortDetailConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedGroup, selectedStatus]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const handleExport = () => {
    if (filteredData.length === 0) return;
    
    const exportData = filteredData.map(row => {
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Bundling_Rekomendasi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const bundlingSummary = useMemo(() => {
    if (!filteredData) return [];

    const summaryMap = new Map<string, { group: string; items: number; qty: number; nilai: number }>();

    filteredData.forEach((row: any) => {
      const group = row['Group']?.trim() || 'Lainnya';
      const stok = parseInt(row['Rider Stok'] || '0', 10);
      const nilai = Number(String(row['Nilai Stok Rider'] || '0').replace(/[^0-9.-]+/g, ""));

      const current = summaryMap.get(group) || { group, items: 0, qty: 0, nilai: 0 };
      current.items += 1;
      current.qty += stok;
      current.nilai += nilai;
      
      summaryMap.set(group, current);
    });

    const arr = Array.from(summaryMap.values());
    arr.sort((a, b) => {
      let diff = 0;
      if (sortRingkasanConfig.key === 'group') {
        diff = a.group.localeCompare(b.group);
      } else if (sortRingkasanConfig.key === 'items') {
        diff = a.items - b.items;
      } else if (sortRingkasanConfig.key === 'qty') {
        diff = a.qty - b.qty;
      } else if (sortRingkasanConfig.key === 'nilai') {
        diff = a.nilai - b.nilai;
      }
      return sortRingkasanConfig.direction === 'asc' ? diff : -diff;
    });

    return arr;
  }, [filteredData, sortRingkasanConfig]);

  const handleSortRingkasan = (key: string) => {
    if (sortRingkasanConfig.key === key) {
      setSortRingkasanConfig({ key, direction: sortRingkasanConfig.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortRingkasanConfig({ key, direction: 'desc' });
    }
  };

  const handleSortDetail = (key: string) => {
    if (sortDetailConfig.key === key) {
      setSortDetailConfig({ key, direction: sortDetailConfig.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortDetailConfig({ key, direction: 'desc' });
    }
  };

  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    bundlingSummary.forEach(item => {
      map.set(item.group, (map.get(item.group) || 0) + item.qty);
    });
    const sorted = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
      
    if (sorted.length > 5) {
      const top5 = sorted.slice(0, 5);
      const others = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
      return [...top5, { name: 'Lainnya', value: others }];
    }
    return sorted;
  }, [bundlingSummary]);

  const COLORS = ['#a855f7', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4'];

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p>Memuat saran bundling produk...</p>
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
            onClick={fetchBundlingData}
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
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Saran Bundling Produk</h2>
            <p className="text-xs text-slate-500">Rekomendasi penggabungan produk untuk likuidasi stok mati</p>
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
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select 
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 bg-white"
            >
              <option value="All">Semua Kategori</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 bg-white"
            >
              <option value="All">Semua Status</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium text-sm rounded-lg hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap ml-auto lg:ml-0"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-sm font-medium text-slate-500">Total Rekomendasi</span>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <PackagePlus className="w-4 h-4" />
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
            <span className="text-sm font-medium text-slate-500">Total Stok Terlibat</span>
            <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('id-ID').format(bundlingSummary.reduce((acc, curr) => acc + curr.qty, 0))}
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
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
                bundlingSummary.reduce((acc, curr) => acc + curr.nilai, 0)
              )}
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Ringkasan Bundling per Kategori (Group)</h3>
          </div>
          <div className="overflow-x-auto max-h-[350px]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider select-none">
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSortRingkasan('group')}>
                    <div className="flex items-center gap-1">Kategori {sortRingkasanConfig.key === 'group' ? <ArrowDownUp className={`w-3 h-3 ${sortRingkasanConfig.direction === 'desc' ? 'text-purple-600' : 'text-purple-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSortRingkasan('items')}>
                    <div className="flex items-center justify-center gap-1">Jumlah Pasangan Bundling {sortRingkasanConfig.key === 'items' ? <ArrowDownUp className={`w-3 h-3 ${sortRingkasanConfig.direction === 'desc' ? 'text-purple-600' : 'text-purple-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSortRingkasan('qty')}>
                    <div className="flex items-center justify-center gap-1">Total Stok Terlibat {sortRingkasanConfig.key === 'qty' ? <ArrowDownUp className={`w-3 h-3 ${sortRingkasanConfig.direction === 'desc' ? 'text-purple-600' : 'text-purple-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSortRingkasan('nilai')}>
                    <div className="flex items-center justify-end gap-1">Potensi Nilai Dipulihkan {sortRingkasanConfig.key === 'nilai' ? <ArrowDownUp className={`w-3 h-3 ${sortRingkasanConfig.direction === 'desc' ? 'text-purple-600' : 'text-purple-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bundlingSummary.map((summary, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800">{summary.group}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold rounded-md">
                        {new Intl.NumberFormat('id-ID').format(summary.items)}
                      </span>
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
                {bundlingSummary.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">Tidak ada ringkasan bundling.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4">Distribusi Kategori Bundling (Qty)</h3>
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
                    formatter={(value: number) => [new Intl.NumberFormat('id-ID').format(value) + ' unit', 'Kategori']}
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
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
          <h3 className="font-bold text-slate-800">Detail Rekomendasi Bundling</h3>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 mr-2">{selectedIds.size} dipilih</span>
              <button onClick={() => handleBulkAction('Pending')} className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 font-medium rounded-md border border-blue-200 hover:bg-blue-100 transition-colors">
                Ajukan Approval
              </button>
              {role === 'Direksi' && (
                <>
                  <button onClick={() => handleBulkAction('Approved')} className="px-3 py-1.5 text-sm bg-emerald-50 text-emerald-700 font-medium rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors">
                    Setujui
                  </button>
                  <button onClick={() => handleBulkAction('Rejected')} className="px-3 py-1.5 text-sm bg-red-50 text-red-700 font-medium rounded-md border border-red-200 hover:bg-red-100 transition-colors">
                    Tolak
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 select-none">
              <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="px-4 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(paginatedData.map(r => r.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSortDetail('rider')}>
                  <div className="flex items-center gap-1">Produk Lambat/Mati (Rider) {sortDetailConfig.key === 'rider' ? <ArrowDownUp className={`w-3 h-3 ${sortDetailConfig.direction === 'desc' ? 'text-purple-600' : 'text-purple-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSortDetail('stok')}>
                  <div className="flex items-center justify-center gap-1">Stok {sortDetailConfig.key === 'stok' ? <ArrowDownUp className={`w-3 h-3 ${sortDetailConfig.direction === 'desc' ? 'text-purple-600' : 'text-purple-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                </th>
                <th className="px-6 py-4">Produk Laris (Anchor)</th>
                <th className="px-6 py-4 text-right">Harga Awal</th>
                <th className="px-6 py-4 text-center">Diskon (%)</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSortDetail('harga')}>
                  <div className="flex items-center justify-end gap-1">Harga Bundle {sortDetailConfig.key === 'harga' ? <ArrowDownUp className={`w-3 h-3 ${sortDetailConfig.direction === 'desc' ? 'text-purple-600' : 'text-purple-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSortDetail('loss')}>
                  <div className="flex items-center justify-end gap-1">Nilai Loss {sortDetailConfig.key === 'loss' ? <ArrowDownUp className={`w-3 h-3 ${sortDetailConfig.direction === 'desc' ? 'text-purple-600' : 'text-purple-400'}`} /> : <ArrowDownUp className="w-3 h-3 opacity-30" />}</div>
                </th>
                <th className="px-6 py-4 text-center">Status Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((row: any) => {
                const stokRider = parseInt(row['Rider Stok'] || '0', 10);
                const statusRider = row['Status Rider'] || 'Slow Moving';
                const hargaAwal = Number(String(row['Harga Normal'] || '0').replace(/[^0-9.-]+/g, "")) || 0;
                const diskon = Number(row._diskon) || 0;
                const nilaiLoss = hargaAwal * (diskon / 100);
                const hargaBundle = hargaAwal - nilaiLoss;
                const approvalStatus = row._approvalStatus || 'Draft';

                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 align-top pt-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        checked={selectedIds.has(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                      />
                    </td>
                    <td className="px-6 py-3 align-top min-w-[250px]">
                      <select 
                        className="w-full text-sm font-medium text-slate-900 border border-slate-200 rounded p-1 mb-1"
                        value={row['Rider (Lambat/Mati)'] || ''}
                        onChange={(e) => handleRiderChange(row.id, e.target.value)}
                      >
                        <option value="">-- Pilih Produk Rider --</option>
                        {uniqueRiders.map(r => (
                           <option key={`rider-${r.name}`} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                      {row['Rider SKU'] && <div className="text-xs text-slate-500 mb-1">{row['Rider SKU']}</div>}
                      {statusRider && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          statusRider.toLowerCase().includes('dead') ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {statusRider.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center align-top pt-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-md">
                        {stokRider}
                      </span>
                    </td>
                    <td className="px-6 py-3 align-top min-w-[250px]">
                      <select 
                        className="w-full text-sm font-medium text-indigo-700 border border-indigo-200 rounded p-1 bg-indigo-50/50 mb-1"
                        value={row['Anchor (Fast Mover)'] || ''}
                        onChange={(e) => handleAnchorChange(row.id, e.target.value)}
                      >
                        <option value="">-- Pilih Produk Anchor --</option>
                        {uniqueAnchors.map(a => (
                          <option key={`anchor-${a.name}`} value={a.name}>{a.name}</option>
                        ))}
                      </select>
                      {row['Anchor SKU'] && <div className="text-xs text-indigo-400">{row['Anchor SKU']}</div>}
                      <div className="text-xs text-slate-500 mt-1 whitespace-normal min-w-[200px] max-w-[250px] leading-relaxed">
                        {row['Saran Bundle']}
                      </div>
                    </td>
                    <td className="px-6 py-3 font-bold text-slate-900 text-right align-top pt-4">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(hargaAwal)}
                    </td>
                    <td className="px-6 py-3 text-center align-top pt-3">
                      <div className="flex items-center justify-center gap-1">
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          className="w-16 text-center text-sm border border-slate-300 rounded p-1 focus:ring-purple-500 focus:border-purple-500"
                          value={row._diskon ?? ''}
                          onChange={(e) => handleDiskonChange(row.id, e.target.value)}
                        />
                        <span className="text-slate-500 font-medium">%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 font-bold text-purple-700 text-right align-top pt-4">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(hargaBundle)}
                    </td>
                    <td className="px-6 py-3 text-right align-top pt-4">
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 font-semibold rounded-md border border-red-100 inline-block whitespace-nowrap">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(nilaiLoss)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center align-top pt-4">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md whitespace-nowrap border ${
                        approvalStatus === 'Draft' ? 'bg-slate-50 text-slate-500 border-slate-200' :
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
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">Tidak ada data yang sesuai dengan pencarian Anda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filteredData.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm">
            <div className="text-slate-500">
              Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-slate-300 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredData.length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(filteredData.length / itemsPerPage)}
                className="px-3 py-1 border border-slate-300 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
