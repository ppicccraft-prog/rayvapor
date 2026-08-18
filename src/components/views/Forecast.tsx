import React, { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import { apiFetch } from '../../utils/apiFetch';
import { RequestItem, saveRequest } from '../../lib/requestStore';
import { Search, Loader2, AlertCircle, TrendingDown, TrendingUp, Package, Download, LineChart, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, FileText, Send, Mail, CheckCircle } from 'lucide-react';

let cachedData: any = null;

export function Forecast({ role = 'Direksi' }: { role?: string }) {
  const [data, setData] = useState<any[]>(cachedData || []);
  const [analisaData, setAnalisaData] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTren, setFilterTren] = useState('Semua');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [forecastMonths, setForecastMonths] = useState(1);
  const [summarySortColumn, setSummarySortColumn] = useState('totalRestockQty');
  const [summarySortOrder, setSummarySortOrder] = useState<'asc' | 'desc'>('desc');
  const [detailSortColumn, setDetailSortColumn] = useState('');
  const [detailSortOrder, setDetailSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(data.map((r: any) => r['Group']?.trim()).filter(Boolean));
    return Array.from(categories).sort();
  }, [data]);

  const calculateRestock = (row: any, months: number) => {
    const fcst1 = parseInt(row['Fcst +1bln'] || '0', 10) || 0;
    const fcst2 = parseInt(row['Fcst +2bln'] || '0', 10) || 0;
    const fcst3 = parseInt(row['Fcst +3bln'] || '0', 10) || 0;
    
    let targetFcst = fcst1;
    if (months >= 2) targetFcst += fcst2;
    if (months >= 3) targetFcst += fcst3;
    
    const stokBerjalan = parseInt(row['Stok Berjalan'] || '0', 10) || 0;
    const qty = targetFcst - stokBerjalan;
    return {
      qty: qty > 0 ? qty : 0,
      targetFcst
    };
  };

  useEffect(() => {
    fetchForecastData();
  }, []);

  const fetchForecastData = async () => {
    if (cachedData) { setData(cachedData); setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const [forecastRes, analisaRes] = await Promise.all([
        apiFetch('/api/forecast'),
        apiFetch('/api/analisa-sku')
      ]);
      
      if (!forecastRes.ok || !analisaRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const forecastCsv = await forecastRes.text();
      const analisaCsv = await analisaRes.text();
      
      Papa.parse(analisaCsv, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const skuCostMap = new Map<string, number>();
          results.data.forEach((row: any) => {
            const sku = row['SKU']?.trim();
            const hargaBeli = Number(String(row['Harga Beli'] || '0').replace(/[^0-9.-]+/g, ""));
            if (sku) {
              skuCostMap.set(sku, hargaBeli);
            }
          });
          setAnalisaData(skuCostMap);
        }
      });

      Papa.parse(forecastCsv, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          cachedData = results.data; setData(results.data);
        },
        error: (error: any) => {
          console.error(error);
          setError('Gagal memproses data forecast.');
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
      const group = row['Group']?.trim() || '';
      const tren = row['Tren']?.trim() || '';
      
      const term = searchTerm.toLowerCase();
      const matchSearch = sku.toLowerCase().includes(term) || 
                          produk.toLowerCase().includes(term) ||
                          group.toLowerCase().includes(term);
                          
      const matchTren = filterTren === 'Semua' || tren.toLowerCase() === filterTren.toLowerCase();
      const matchKategori = filterKategori === 'Semua' || group.toLowerCase() === filterKategori.toLowerCase();

      return matchSearch && matchTren && matchKategori;
    });
  }, [data, searchTerm, filterTren, filterKategori]);

  const toggleSelectAll = () => {
    if (selectedSkus.size === sortedDetailData?.length && sortedDetailData?.length > 0) {
      setSelectedSkus(new Set());
    } else {
      setSelectedSkus(new Set((sortedDetailData || []).map((row: any) => row['SKU'])));
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
    const exportData: any[] = [];
    
    sortedDetailData.filter((row: any) => selectedSkus.has(row['SKU'])).forEach((row: any) => {
      const { qty: restockQty } = calculateRestock(row, forecastMonths);
      const isRestock = restockQty > 0;
      const saran = isRestock ? `Restock ±${restockQty} unit` : 'Stok cukup';
      
      const sku = row['SKU']?.trim();
      const hargaBeli = sku ? (analisaData.get(sku) || 0) : 0;
      const estimatedCost = restockQty * hargaBeli;

      exportData.push({
        'SKU': row['SKU'],
        'Produk': row['Produk'],
        'Group': row['Group'],
        'Jual Bln-1': row['Jual Bln-1'],
        'Jual Bln-2': row['Jual Bln-2'],
        'Jual Bln-3': row['Jual Bln-3'],
        'Total 3bln': row['Total 3bln'],
        'Avg/bln': row['Avg/bln'],
        'Stok Berjalan': row['Stok Berjalan'],
        'Tren': row['Tren'],
        'Fcst +1bln': row['Fcst +1bln'],
        'Fcst +2bln': row['Fcst +2bln'],
        'Fcst +3bln': row['Fcst +3bln'],
        'MOS (bln)': row['MOS (bln)'],
        'Saran Restock': saran,
        'Estimasi Biaya Restock': estimatedCost
      });
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Pengajuan_Restock_Forecast.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowApprovalModal(false);
  };

  const handleAjukanSistem = () => {
    if (selectedSkus.size === 0) return;
    
    const itemsToRequest: RequestItem[] = sortedDetailData
      .filter((row: any) => selectedSkus.has(row['SKU']))
      .map((row: any) => {
        const { qty } = calculateRestock(row, forecastMonths);
        return {
          kategori: 'Restock (Forecast)',
          sku: row['SKU'],
          nama: row['Produk'],
          qty,
          toko: 'Semua Toko (Nasional)' // Default for forecast restock
        };
      })
      .filter(item => item.qty > 0); // Only request those that actually need restock

    if (itemsToRequest.length === 0) {
      alert("Tidak ada produk terpilih yang membutuhkan restock.");
      return;
    }

    const status = role === 'Vaporista' ? 'Menunggu SPV' : (role === 'Head (SPV)' ? 'Menunggu Direksi' : 'Diproses');
    saveRequest(itemsToRequest, status, role);
    
    alert(`Pengajuan restock forecast berhasil dibuat dan masuk ke status: ${status}`);
    setSelectedSkus(new Set());
    setShowApprovalModal(false);
  };

  const handleExport = () => {
    if (filteredData.length === 0) return;

    const exportData: any[] = [];
    
    filteredData.forEach((row: any) => {
      const { qty: restockQty } = calculateRestock(row, forecastMonths);
      const isRestock = restockQty > 0;
      const saran = isRestock ? `Restock ±${restockQty} unit` : 'Stok cukup';
      
      const sku = row['SKU']?.trim();
      const hargaBeli = sku ? (analisaData.get(sku) || 0) : 0;
      const estimatedCost = restockQty * hargaBeli;

      exportData.push({
        'SKU': row['SKU'],
        'Produk': row['Produk'],
        'Group': row['Group'],
        'Jual Bln-1': row['Jual Bln-1'],
        'Jual Bln-2': row['Jual Bln-2'],
        'Jual Bln-3': row['Jual Bln-3'],
        'Total 3bln': row['Total 3bln'],
        'Avg/bln': row['Avg/bln'],
        'Stok Berjalan': row['Stok Berjalan'],
        'Tren': row['Tren'],
        'Fcst +1bln': row['Fcst +1bln'],
        'Fcst +2bln': row['Fcst +2bln'],
        'Fcst +3bln': row['Fcst +3bln'],
        'MOS (bln)': row['MOS (bln)'],
        'Saran Restock': saran,
        'Estimasi Biaya Restock': estimatedCost
      });
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Forecast_Restock.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const forecastSummary = useMemo(() => {
    if (!filteredData) return [];

    const summaryMap = new Map<string, { group: string; items: number; totalRestockQty: number; totalFcst: number; estimatedCost: number }>();

    filteredData.forEach((row: any) => {
      const group = row['Group']?.trim() || 'Lainnya';
      const sku = row['SKU']?.trim();
      
      const { qty: restockQty, targetFcst: totalFcst } = calculateRestock(row, forecastMonths);

      const hargaBeli = sku ? (analisaData.get(sku) || 0) : 0;
      const estimatedCost = restockQty * hargaBeli;

      const current = summaryMap.get(group) || { group, items: 0, totalRestockQty: 0, totalFcst: 0, estimatedCost: 0 };
      current.items += 1;
      current.totalRestockQty += restockQty;
      current.totalFcst += totalFcst;
      current.estimatedCost += estimatedCost;
      
      summaryMap.set(group, current);
    });

    const sorted = Array.from(summaryMap.values());
    sorted.sort((a, b) => {
      let aVal: any = a[summarySortColumn as keyof typeof a];
      let bVal: any = b[summarySortColumn as keyof typeof b];
      if (typeof aVal === 'string') {
        return summarySortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return summarySortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [filteredData, analisaData, forecastMonths, summarySortColumn, summarySortOrder]);

  const sortedDetailData = useMemo(() => {
    if (!detailSortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      let aVal: any = 0;
      let bVal: any = 0;

      if (detailSortColumn === 'produk') {
        aVal = a['Produk'] || '';
        bVal = b['Produk'] || '';
      } else if (detailSortColumn === 'histJual') {
        aVal = parseInt(a['Total 3bln'] || '0', 10);
        bVal = parseInt(b['Total 3bln'] || '0', 10);
      } else if (detailSortColumn === 'stok') {
        aVal = parseInt(a['Stok Berjalan'] || '0', 10);
        bVal = parseInt(b['Stok Berjalan'] || '0', 10);
      } else if (detailSortColumn === 'tren') {
        aVal = a['Tren'] || '';
        bVal = b['Tren'] || '';
      } else if (detailSortColumn === 'fcst') {
        aVal = calculateRestock(a, forecastMonths).targetFcst;
        bVal = calculateRestock(b, forecastMonths).targetFcst;
      } else if (detailSortColumn === 'saran') {
        aVal = calculateRestock(a, forecastMonths).qty;
        bVal = calculateRestock(b, forecastMonths).qty;
      } else if (detailSortColumn === 'biaya') {
        const aSku = a['SKU']?.trim();
        const bSku = b['SKU']?.trim();
        const aCost = (aSku ? (analisaData.get(aSku) || 0) : 0) * calculateRestock(a, forecastMonths).qty;
        const bCost = (bSku ? (analisaData.get(bSku) || 0) : 0) * calculateRestock(b, forecastMonths).qty;
        aVal = aCost;
        bVal = bCost;
      }

      if (typeof aVal === 'string') {
        return detailSortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return detailSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredData, analisaData, detailSortColumn, detailSortOrder, forecastMonths]);

  const handleSummarySort = (column: string) => {
    if (summarySortColumn === column) {
      setSummarySortOrder(summarySortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSummarySortColumn(column);
      setSummarySortOrder('desc');
    }
  };

  const handleDetailSort = (column: string) => {
    if (detailSortColumn === column) {
      setDetailSortOrder(detailSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setDetailSortColumn(column);
      setDetailSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p>Memuat data forecast & restock...</p>
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
            onClick={fetchForecastData}
            className="px-4 py-2 bg-white text-red-600 font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors shadow-sm"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const SortIcon = ({ column, currentSortColumn, currentSortOrder }: { column: string, currentSortColumn: string, currentSortOrder: 'asc' | 'desc' }) => {
    if (column !== currentSortColumn) return <ArrowUpDown className="w-3 h-3 ml-1 inline-block opacity-40 group-hover:opacity-100 transition-opacity" />;
    return currentSortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 inline-block text-blue-600" />
      : <ArrowDown className="w-3 h-3 ml-1 inline-block text-blue-600" />;
  };

  const itemsToRestock = filteredData.filter(row => calculateRestock(row, forecastMonths).qty > 0).length;
  const totalRestockQty = forecastSummary.reduce((acc, curr) => acc + curr.totalRestockQty, 0);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Informasi Forecast</p>
          <p>
            Forecast ini membaca data historis untuk diubah menjadi proyeksi. Data ini belum memperhitungkan tren/gimmick pasar saat ini. Diperlukan analisa data lanjutan secara mandiri untuk membaca tren atau gimmick.
          </p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <LineChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Saran Forecast & Restock</h2>
            <p className="text-xs text-slate-500">Proyeksi penjualan dan rekomendasi pengisian stok</p>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 sm:flex-none">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Forecast:</span>
              <select
                value={forecastMonths}
                onChange={(e) => setForecastMonths(Number(e.target.value))}
                className="bg-transparent text-sm font-medium outline-none text-blue-700 w-full"
              >
                <option value={1}>1 Bulan</option>
                <option value={2}>2 Bulan</option>
                <option value={3}>3 Bulan</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 sm:flex-none">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Tren:</span>
              <select
                value={filterTren}
                onChange={(e) => setFilterTren(e.target.value)}
                className="bg-transparent text-sm font-medium outline-none text-blue-700 w-full"
              >
                <option value="Semua">Semua Tren</option>
                <option value="Naik">Naik</option>
                <option value="Turun">Turun</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 sm:flex-none min-w-[150px]">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Kategori:</span>
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="bg-transparent text-sm font-medium outline-none text-blue-700 w-full truncate"
              >
                <option value="Semua">Semua Kategori</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
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
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{itemsToRestock}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Produk Butuh Restock</div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('id-ID').format(totalRestockQty)}
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Qty Restock</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('id-ID').format(
                forecastSummary.reduce((acc, curr) => acc + curr.totalFcst, 0)
              )}
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Forecast Terpilih</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
                forecastSummary.reduce((acc, curr) => acc + curr.estimatedCost, 0)
              )}
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Est. Biaya Restock</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Ringkasan Restock per Kategori</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleSummarySort('group')}>
                  Kategori (Group) <SortIcon column="group" currentSortColumn={summarySortColumn} currentSortOrder={summarySortOrder} />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleSummarySort('items')}>
                  Jumlah SKU <SortIcon column="items" currentSortColumn={summarySortColumn} currentSortOrder={summarySortOrder} />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleSummarySort('totalRestockQty')}>
                  Total Qty Restock <SortIcon column="totalRestockQty" currentSortColumn={summarySortColumn} currentSortOrder={summarySortOrder} />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleSummarySort('totalFcst')}>
                  Total Fcst Terpilih (Qty) <SortIcon column="totalFcst" currentSortColumn={summarySortColumn} currentSortOrder={summarySortOrder} />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleSummarySort('estimatedCost')}>
                  Estimasi Biaya Restock <SortIcon column="estimatedCost" currentSortColumn={summarySortColumn} currentSortOrder={summarySortOrder} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forecastSummary.map((summary, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-800">{summary.group}</td>
                  <td className="px-6 py-3 text-center">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-md">
                      {new Intl.NumberFormat('id-ID').format(summary.items)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-md">
                      {new Intl.NumberFormat('id-ID').format(summary.totalRestockQty)}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium text-blue-600 text-center">
                    {new Intl.NumberFormat('id-ID').format(summary.totalFcst)}
                  </td>
                  <td className="px-6 py-3 font-medium text-rose-600 text-right">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summary.estimatedCost)}
                  </td>
                </tr>
              ))}
              {forecastSummary.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Tidak ada ringkasan forecast.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-slate-800">Detail Forecast & Saran Restock</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 font-medium">
              {selectedSkus.size} Produk Terpilih
            </span>
            <button
              onClick={() => setShowApprovalModal(true)}
              disabled={selectedSkus.size === 0}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg transition-colors shadow-sm whitespace-nowrap ${
                selectedSkus.size > 0 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
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
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    checked={selectedSkus.size === sortedDetailData?.length && sortedDetailData?.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleDetailSort('produk')}>
                  Produk <SortIcon column="produk" currentSortColumn={detailSortColumn} currentSortOrder={detailSortOrder} />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleDetailSort('histJual')}>
                  Hist. Jual (3 Bln) <SortIcon column="histJual" currentSortColumn={detailSortColumn} currentSortOrder={detailSortOrder} />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleDetailSort('stok')}>
                  Stok & MOS <SortIcon column="stok" currentSortColumn={detailSortColumn} currentSortOrder={detailSortOrder} />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleDetailSort('tren')}>
                  Tren <SortIcon column="tren" currentSortColumn={detailSortColumn} currentSortOrder={detailSortOrder} />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleDetailSort('fcst')}>
                  Fcst (+1 / +2 / +3) <SortIcon column="fcst" currentSortColumn={detailSortColumn} currentSortOrder={detailSortOrder} />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleDetailSort('saran')}>
                  Saran Restock <SortIcon column="saran" currentSortColumn={detailSortColumn} currentSortOrder={detailSortOrder} />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => handleDetailSort('biaya')}>
                  Estimasi Biaya <SortIcon column="biaya" currentSortColumn={detailSortColumn} currentSortOrder={detailSortOrder} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedDetailData?.map((row: any, i: number) => {
                const tren = row['Tren'] || '';
                const isNaik = tren.toLowerCase() === 'naik';
                
                const { qty: restockQty } = calculateRestock(row, forecastMonths);
                const isRestock = restockQty > 0;
                const saran = isRestock ? `Restock ±${restockQty} unit` : 'Stok cukup';
                
                const sku = row['SKU']?.trim();
                const hargaBeli = sku ? (analisaData.get(sku) || 0) : 0;
                const estimatedCost = restockQty * hargaBeli;

                return (
                  <tr key={i} className={`hover:bg-slate-50 transition-colors ${selectedSkus.has(sku) ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-6 py-3 text-center align-middle">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        checked={selectedSkus.has(sku)}
                        onChange={() => toggleSelectSku(sku)}
                      />
                    </td>
                    <td className="px-6 py-3 align-top">
                      <div className="font-medium text-slate-900 whitespace-normal min-w-[200px]">{row['Produk']}</div>
                      <div className="text-xs text-slate-500 mb-1">{row['SKU']} &bull; {row['Group']}</div>
                    </td>
                    <td className="px-6 py-3 text-center align-top pt-4">
                      <div className="font-bold text-slate-700">{row['Total 3bln']}</div>
                      <div className="text-[10px] text-slate-500">Avg: {row['Avg/bln']}/bln</div>
                    </td>
                    <td className="px-6 py-3 text-center align-top pt-4">
                      <div className="font-bold text-slate-700">{row['Stok Berjalan']}</div>
                      <div className="text-[10px] text-slate-500">MOS: {row['MOS (bln)']} bln</div>
                    </td>
                    <td className="px-6 py-3 text-center align-top pt-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                        isNaik ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {isNaik ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {tren.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center align-top pt-4">
                      <div className="text-xs font-medium text-blue-700 space-x-1.5">
                        <span>{row['Fcst +1bln']}</span>
                        <span className="text-slate-300">/</span>
                        <span>{row['Fcst +2bln']}</span>
                        <span className="text-slate-300">/</span>
                        <span>{row['Fcst +3bln']}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right align-top pt-4">
                      <span className={`px-2.5 py-1 font-semibold rounded-md border inline-block ${
                        isRestock 
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {saran}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right align-top pt-4 font-bold text-rose-700">
                      {isRestock && estimatedCost > 0 
                        ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(estimatedCost)
                        : '-'}
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
                <p className="text-sm text-slate-500">Anda memilih {selectedSkus.size} produk untuk diajukan restock-nya</p>
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
