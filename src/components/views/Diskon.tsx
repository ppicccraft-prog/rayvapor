import React, { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import { RequestItem, saveRequest } from '../../lib/requestStore';
import { Search, Loader2, AlertCircle, TrendingDown, TrendingUp, Package, Download, Percent, CheckSquare, FileText, Send, Mail, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';

const SortIcon = ({ column, currentSortColumn, currentSortOrder }: { column: string, currentSortColumn: string, currentSortOrder: 'asc' | 'desc' }) => {
  if (column !== currentSortColumn) return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />;
  if (currentSortOrder === 'asc') return <ArrowUp className="w-3 h-3 inline-block ml-1 text-emerald-600" />;
  return <ArrowDown className="w-3 h-3 inline-block ml-1 text-emerald-600" />;
};

const parseNumber = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).trim();
  str = str.replace(/Rp\s?/gi, '');
  str = str.replace(/%/g, '');
  str = str.replace(/\s/g, '');
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/\./g, '');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length !== 3) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  }
  const cleaned = str.replace(/[^0-9.-]+/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

const formatIDR = (num: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

let cachedData: any = null;

export function Diskon({ role = 'Direksi' }: { role?: string }) {
  const [data, setData] = useState<any[]>(cachedData || []);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  
  const [adjustedDiscounts, setAdjustedDiscounts] = useState<Record<string, number>>({});
  
  const [filterGroup, setFilterGroup] = useState('Semua');
  const [filterKlasifikasi, setFilterKlasifikasi] = useState('Semua');
  const [sortColumn, setSortColumn] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const uniqueGroups = useMemo(() => {
    const groups = new Set(data.map((r: any) => r['Group']?.trim()).filter(Boolean));
    return Array.from(groups).sort();
  }, [data]);

  const uniqueKlasifikasi = useMemo(() => {
    const klasifikasi = new Set(data.map((r: any) => r['Klasifikasi']?.trim()).filter(Boolean));
    return Array.from(klasifikasi).sort();
  }, [data]);

  useEffect(() => {
    fetchDiskonData();
  }, []);

  const fetchDiskonData = async () => {
    if (cachedData) { setData(cachedData); setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/diskon');
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
          setError('Gagal memproses data diskon.');
        }
      });
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data dari spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((row: any) => {
      const sku = row['SKU'] || '';
      if (!sku || sku.toLowerCase() === 'sku') return false;

      const produk = row['Produk'] || '';
      const klasifikasi = row['Klasifikasi'] || '';
      const group = row['Group']?.trim() || '';
      
      const term = searchTerm.toLowerCase();
      const matchSearch = sku.toLowerCase().includes(term) || 
                          produk.toLowerCase().includes(term) ||
                          klasifikasi.toLowerCase().includes(term);
                          
      const matchGroup = filterGroup === 'Semua' || group.toLowerCase() === filterGroup.toLowerCase();
      const matchKlasifikasi = filterKlasifikasi === 'Semua' || klasifikasi.toLowerCase() === filterKlasifikasi.toLowerCase();
      
      return matchSearch && matchGroup && matchKlasifikasi;
    });
  }, [data, searchTerm, filterGroup, filterKlasifikasi]);

  const processedData = useMemo(() => {
    if (!filteredData) return [];
    return filteredData.map((row: any) => {
      const sku = row['SKU'];
      const initialDiscount = parseNumber(row['Saran Diskon %'] || '0');
      const discountPercent = sku in adjustedDiscounts ? adjustedDiscounts[sku] : initialDiscount;
      const isCustom = sku in adjustedDiscounts && adjustedDiscounts[sku] !== initialDiscount;

      const hargaJual = parseNumber(row['Harga Jual']);
      const hargaBeli = parseNumber(row[' Harga Beli '] || row['Harga Beli']);
      const stok = parseNumber(row['Stok Berjalan']);

      let hargaSetelahDiskon = parseNumber(row['D']);
      if (hargaJual > 0) {
        hargaSetelahDiskon = discountPercent > 0 
          ? Math.round(hargaJual * (1 - discountPercent / 100))
          : hargaJual;
      }

      const marginUnit = hargaSetelahDiskon - hargaBeli;
      const estCashRecovery = hargaSetelahDiskon * stok;

      return {
        ...row,
        _initialDiscount: initialDiscount,
        _discountPercent: discountPercent,
        _isCustom: isCustom,
        _hargaJual: hargaJual,
        _hargaBeli: hargaBeli,
        _stok: stok,
        _hargaSetelahDiskon: hargaSetelahDiskon,
        _hargaSetelahDiskonFormatted: formatIDR(hargaSetelahDiskon),
        _marginUnit: marginUnit,
        _marginUnitFormatted: formatIDR(marginUnit),
        _estCashRecovery: estCashRecovery,
        _estCashRecoveryFormatted: formatIDR(estCashRecovery),
      };
    });
  }, [filteredData, adjustedDiscounts]);

  const sortedDetailData = useMemo(() => {
    if (!processedData) return [];
    
    if (!sortColumn) return processedData;

    return [...processedData].sort((a: any, b: any) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortColumn) {
        case 'produk':
          valA = (a['Produk'] || '').toLowerCase();
          valB = (b['Produk'] || '').toLowerCase();
          break;
        case 'stok':
          valA = a._stok;
          valB = b._stok;
          break;
        case 'diskon':
          valA = a._discountPercent;
          valB = b._discountPercent;
          break;
        case 'harga':
          valA = a._hargaSetelahDiskon;
          valB = b._hargaSetelahDiskon;
          break;
        case 'margin':
          valA = a._marginUnit;
          valB = b._marginUnit;
          break;
        case 'recovery':
          valA = a._estCashRecovery;
          valB = b._estCashRecovery;
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processedData, sortColumn, sortOrder]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedSkus.size === sortedDetailData.length && sortedDetailData.length > 0) {
      setSelectedSkus(new Set());
    } else {
      setSelectedSkus(new Set(sortedDetailData.map((row: any) => row['SKU'])));
    }
  };

  const toggleSelectSku = (sku: string) => {
    const newSelected = new Set(selectedSkus);
    if (newSelected.has(sku)) {
      newSelected.delete(sku);
    } else {
      newSelected.add(sku);
    }
    setSelectedSkus(newSelected);
  };

  const handleExportSelected = () => {
    if (selectedSkus.size === 0) return;
    const exportData = sortedDetailData.filter((row: any) => selectedSkus.has(row['SKU'])).map((row: any) => ({
      'SKU': row['SKU'],
      'Produk': row['Produk'],
      'Group': row['Group'],
      'Klasifikasi': row['Klasifikasi'],
      'Stok Berjalan': row['_stok'],
      'Harga Beli': formatIDR(row['_hargaBeli']),
      'Harga Jual': formatIDR(row['_hargaJual']),
      'Saran Diskon %': `${row._discountPercent}%`,
      'Status Diskon': row._isCustom ? 'Disesuaikan' : 'Saran Awal',
      'Harga Setelah Diskon': row._hargaSetelahDiskonFormatted,
      'Margin/unit': row._marginUnitFormatted,
      'Est. Cash Recovery': row._estCashRecoveryFormatted
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Pengajuan_Diskon.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowApprovalModal(false);
  };

  const handleAjukanSistem = () => {
    if (selectedSkus.size === 0) return;
    
    const itemsToRequest: RequestItem[] = sortedDetailData
      .filter((row: any) => selectedSkus.has(row['SKU']))
      .map((row: any) => ({
        kategori: 'Diskon',
        sku: row['SKU'],
        nama: row['Produk'],
        qty: row._stok,
        diskon: `${row._discountPercent}%`,
        hargaBaru: row._hargaSetelahDiskonFormatted,
        toko: 'Semua Toko (Nasional)'
      }));

    const status = role === 'Vaporista' ? 'Menunggu SPV' : (role === 'Head (SPV)' ? 'Menunggu Direksi' : 'Diproses');
    saveRequest(itemsToRequest, status, role);
    
    alert(`Pengajuan diskon berhasil dibuat dan masuk ke status: ${status}`);
    setSelectedSkus(new Set());
    setShowApprovalModal(false);
  };

  const handleExport = () => {
    if (!sortedDetailData || sortedDetailData.length === 0) return;

    const exportData: any[] = [];
    
    sortedDetailData.forEach((row: any) => {
      exportData.push({
        'SKU': row['SKU'],
        'Produk': row['Produk'],
        'Group': row['Group'],
        'Klasifikasi': row['Klasifikasi'],
        'Stok Berjalan': row._stok,
        'Harga Beli': formatIDR(row._hargaBeli),
        'Harga Jual': formatIDR(row._hargaJual),
        'Saran Diskon %': `${row._discountPercent}%`,
        'Status Diskon': row._isCustom ? 'Disesuaikan' : 'Saran Awal',
        'Harga Setelah Diskon': row._hargaSetelahDiskonFormatted,
        'Margin/unit': row._marginUnitFormatted,
        'Est. Cash Recovery': row._estCashRecoveryFormatted,
        'Catatan': row['Catatan']
      });
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Rekomendasi_Diskon.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const diskonSummary = useMemo(() => {
    if (!processedData) return [];

    const summaryMap = new Map<string, { klasifikasi: string; items: number; qty: number; nilai: number }>();

    processedData.forEach((row: any) => {
      const klasifikasi = row['Klasifikasi']?.trim() || 'Lainnya';
      const stok = row._stok;
      const nilai = row._estCashRecovery;

      const current = summaryMap.get(klasifikasi) || { klasifikasi, items: 0, qty: 0, nilai: 0 };
      current.items += 1;
      current.qty += stok;
      current.nilai += nilai;
      
      summaryMap.set(klasifikasi, current);
    });

    return Array.from(summaryMap.values()).sort((a, b) => b.nilai - a.nilai);
  }, [processedData]);

  const customAdjustedCount = useMemo(() => {
    return Object.keys(adjustedDiscounts).length;
  }, [adjustedDiscounts]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
        <p>Memuat saran diskon produk...</p>
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
            onClick={fetchDiskonData}
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
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Saran Diskon Produk</p>
          <p>
            Rekomendasi potongan harga untuk likuidasi stok mati dan lambat. Anda dapat menyesuaikan nilai diskon (%) secara langsung di tabel Detail Rekomendasi Diskon.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Saran Diskon Produk</h2>
            <p className="text-xs text-slate-500">Rekomendasi potongan harga untuk likuidasi stok mati dan lambat</p>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 sm:flex-none min-w-[150px]">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Group:</span>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="bg-transparent text-sm font-medium outline-none text-rose-700 w-full truncate cursor-pointer"
              >
                <option value="Semua">Semua Group</option>
                {uniqueGroups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 sm:flex-none min-w-[150px]">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Klasifikasi:</span>
              <select
                value={filterKlasifikasi}
                onChange={(e) => setFilterKlasifikasi(e.target.value)}
                className="bg-transparent text-sm font-medium outline-none text-rose-700 w-full truncate cursor-pointer"
              >
                <option value="Semua">Semua Klasifikasi</option>
                {uniqueKlasifikasi.map(klasifikasi => (
                  <option key={klasifikasi} value={klasifikasi}>{klasifikasi}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative flex-1 lg:w-64 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari Produk atau SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white font-medium text-sm rounded-lg hover:bg-rose-700 transition-colors shadow-sm whitespace-nowrap w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{processedData.length}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Rekomendasi</div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('id-ID').format(processedData.reduce((acc, curr) => acc + curr._stok, 0))}
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Stok Terlibat</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {formatIDR(processedData.reduce((acc, curr) => acc + curr._estCashRecovery, 0))}
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Est. Cash Recovery</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Ringkasan Diskon per Klasifikasi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4">Klasifikasi</th>
                <th className="px-6 py-4 text-center">Jumlah Item</th>
                <th className="px-6 py-4 text-center">Total Stok Terlibat</th>
                <th className="px-6 py-4 text-right">Potensi Cash Recovery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {diskonSummary.map((summary, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-800">{summary.klasifikasi}</td>
                  <td className="px-6 py-3 text-center">
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-md">
                      {new Intl.NumberFormat('id-ID').format(summary.items)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-md">
                      {new Intl.NumberFormat('id-ID').format(summary.qty)}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium text-emerald-600 text-right">
                    {formatIDR(summary.nilai)}
                  </td>
                </tr>
              ))}
              {diskonSummary.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">Tidak ada ringkasan diskon.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800">Detail Rekomendasi Diskon</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ketik pada kolom Saran Diskon untuk menyesuaikan persentase diskon per produk</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {customAdjustedCount > 0 && (
              <button
                onClick={() => setAdjustedDiscounts({})}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-medium text-xs rounded-lg transition-colors"
                title="Reset seluruh diskon yang disesuaikan manual"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset {customAdjustedCount} Diskon Custom
              </button>
            )}
            <span className="text-sm text-slate-500 font-medium">
              {selectedSkus.size} Produk Terpilih
            </span>
            <button
              onClick={() => setShowApprovalModal(true)}
              disabled={selectedSkus.size === 0}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg transition-colors shadow-sm whitespace-nowrap ${
                selectedSkus.size > 0 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Ajukan Approval
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4 w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    checked={selectedSkus.size === sortedDetailData.length && sortedDetailData.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleSort('produk')}>
                  Produk <SortIcon column="produk" currentSortColumn={sortColumn} currentSortOrder={sortOrder} />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleSort('stok')}>
                  Stok <SortIcon column="stok" currentSortColumn={sortColumn} currentSortOrder={sortOrder} />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 group transition-colors min-w-[160px]" onClick={() => handleSort('diskon')}>
                  Saran Diskon <SortIcon column="diskon" currentSortColumn={sortColumn} currentSortOrder={sortOrder} />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleSort('harga')}>
                  Harga Setelah Diskon <SortIcon column="harga" currentSortColumn={sortColumn} currentSortOrder={sortOrder} />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleSort('margin')}>
                  Margin/unit <SortIcon column="margin" currentSortColumn={sortColumn} currentSortOrder={sortOrder} />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleSort('recovery')}>
                  Est. Cash Recovery <SortIcon column="recovery" currentSortColumn={sortColumn} currentSortOrder={sortOrder} />
                </th>
                <th className="px-6 py-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedDetailData.map((row: any, i: number) => {
                const stok = row._stok;
                const klasifikasi = row['Klasifikasi'] || 'Slow Moving';
                const isRugi = row._marginUnit < 0;
                const sku = row['SKU'];
                const isCustom = row._isCustom;
                
                return (
                  <tr key={i} className={`hover:bg-slate-50 transition-colors ${selectedSkus.has(sku) ? 'bg-emerald-50/50' : ''}`}>
                    <td className="px-6 py-3 text-center align-middle">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        checked={selectedSkus.has(sku)}
                        onChange={() => toggleSelectSku(sku)}
                      />
                    </td>
                    <td className="px-6 py-3 align-top">
                      <div className="font-medium text-slate-900 whitespace-normal min-w-[200px]">{row['Produk']}</div>
                      <div className="text-xs text-slate-500 mb-1">{row['SKU']}</div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        klasifikasi.toLowerCase().includes('dead') ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {klasifikasi.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center align-top pt-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-md">
                        {stok}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right align-top pt-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="relative flex items-center">
                          <input 
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={row._discountPercent}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                              setAdjustedDiscounts(prev => ({
                                ...prev,
                                [sku]: val
                              }));
                            }}
                            className={`w-16 px-2 py-1 text-right font-bold text-sm rounded-md border outline-none transition-all ${
                              isCustom 
                                ? 'bg-amber-50 border-amber-300 text-amber-800 focus:ring-2 focus:ring-amber-500' 
                                : 'bg-rose-50 border-rose-200 text-rose-700 focus:ring-2 focus:ring-rose-500'
                            }`}
                          />
                          <span className="ml-1 text-xs font-bold text-slate-500">%</span>
                        </div>
                        {isCustom && (
                          <button 
                            onClick={() => {
                              setAdjustedDiscounts(prev => {
                                const next = { ...prev };
                                delete next[sku];
                                return next;
                              });
                            }}
                            title="Reset ke saran awal"
                            className="text-[10px] font-medium text-slate-500 hover:text-rose-600 px-1.5 py-1 bg-slate-100 hover:bg-rose-50 rounded border border-slate-200 transition-colors shrink-0"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      {isCustom && (
                        <div className="text-[10px] text-amber-600 font-medium text-right mt-0.5">
                          Awal: {row._initialDiscount}%
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 font-bold text-slate-900 text-right align-top pt-4">
                      {row._hargaSetelahDiskonFormatted}
                      {row._hargaJual > 0 && row._discountPercent > 0 && (
                        <div className="text-xs text-slate-400 font-normal line-through mt-0.5">{formatIDR(row._hargaJual)}</div>
                      )}
                    </td>
                    <td className={`px-6 py-3 text-right align-top pt-4 font-medium ${isRugi ? 'text-red-600' : 'text-emerald-600'}`}>
                      {row._marginUnitFormatted}
                    </td>
                    <td className="px-6 py-3 text-right align-top pt-4 font-bold text-slate-800">
                      {row._estCashRecoveryFormatted}
                    </td>
                    <td className="px-6 py-3 align-top pt-4">
                      <div className="text-xs text-slate-600 whitespace-normal min-w-[150px] max-w-[200px]">
                        {row['Catatan']}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!sortedDetailData || sortedDetailData.length === 0) && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">Tidak ada data yang sesuai dengan pencarian Anda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Pilih Metode Approval</h3>
                <p className="text-sm text-slate-500">Anda memilih {selectedSkus.size} produk untuk diajukan diskonnya</p>
              </div>
              <button 
                onClick={() => setShowApprovalModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <button onClick={handleExportSelected} className="w-full text-left group hover:ring-2 hover:ring-blue-500 rounded-xl border border-slate-200 p-4 transition-all flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">Opsi 1: Export & Kirim Manual</h4>
                  <p className="text-sm text-slate-500">Download data terpilih dalam format PDF/CSV untuk dilampirkan secara manual ke email atau chat management.</p>
                </div>
              </button>

              <button onClick={handleAjukanSistem} className="w-full text-left group hover:ring-2 hover:ring-indigo-500 rounded-xl border border-slate-200 p-4 transition-all flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">Opsi 2: Ajukan In-App (Sistem)</h4>
                  <p className="text-sm text-slate-500">Buat request dengan status "Menunggu Direksi". Direksi dapat mereview dan menyetujui langsung dari Dashboard Request.</p>
                </div>
              </button>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowApprovalModal(false)}
                className="px-6 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors"
              >
                Tutup Sementara
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
