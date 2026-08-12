import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { Loader2, AlertCircle, TrendingUp, Search, Filter, ArrowDownUp, Activity, Box, Clock, AlertTriangle } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell,
  PieChart, Pie, ScatterChart, Scatter, ZAxis, LineChart, Line
} from 'recharts';
import { ParsedData } from '../../lib/dataParser';

interface SalesData {
  toko: string;
  bulan: string;
  tanggal: string; // "2026-03-01 11:44:58"
  jam: number;
  produk: string;
  sku: string;
  group: string;
  qty: number;
  hargaDasar: number;
  harga: number;
  jumlah: number;
  modal: number;
  klasifikasi: string;
}

interface TransaksiPenjualanProps {
  dataAnalisa: ParsedData;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

let cachedData: any = null;
export function TransaksiPenjualan({ dataAnalisa }: TransaksiPenjualanProps) {
  const [data, setData] = useState<SalesData[]>(cachedData || []);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'harian'>('ringkasan');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToko, setSelectedToko] = useState<string>('All');
  const [selectedBulan, setSelectedBulan] = useState<string>('All');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [selectedKlasifikasi, setSelectedKlasifikasi] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const klasifikasiMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!dataAnalisa || !dataAnalisa.validRows) return map;
    
    dataAnalisa.validRows.forEach(row => {
      if (row.toko && row.sku) {
        map.set(`${row.toko}-${row.sku}`, row.klasifikasi || 'Unclassified');
      }
    });
    return map;
  }, [dataAnalisa]);

  useEffect(() => {
    fetchData();
  }, [klasifikasiMap]);

  const parseRupiah = (val: string) => {
    if (!val) return 0;
    const clean = val.replace(/Rp/g, '').replace(/,/g, '').trim();
    return parseFloat(clean) || 0;
  };

  const fetchData = async () => {
    if (cachedData) { setData(cachedData); setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/penjualan');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          
          // Find header row index
          let headerIndex = -1;
          for (let i = 0; i < Math.min(5, rows.length); i++) {
            if (rows[i].some(c => c && c.trim().toLowerCase() === 'toko')) {
              headerIndex = i;
              break;
            }
          }

          if (headerIndex === -1) {
            setError('Gagal menemukan header data pada sheet Penjualan');
            setIsLoading(false);
            return;
          }

          const parsed: SalesData[] = [];
          
          for (let i = headerIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            const toko = row[0]?.trim() || '';
            if (!toko) continue; // Skip invalid rows
            
            const sku = row[4]?.trim() || '';
            let klas = klasifikasiMap.get(`${toko}-${sku}`);
            if (!klas) klas = 'Unclassified';
            
            let klasifikasiFormatted = 'Unclassified';
            const klasLower = klas.toLowerCase();
            if (klasLower.includes('fast')) klasifikasiFormatted = 'Fast Moving';
            else if (klasLower.includes('slow')) klasifikasiFormatted = 'Slow Moving';
            else if (klasLower.includes('dead')) klasifikasiFormatted = 'Dead Stock';
            else if (klasLower.includes('sehat')) klasifikasiFormatted = 'Sehat';
            
            const tanggalStr = row[2]?.trim() || '';
            let jam = -1;
            if (tanggalStr) {
              const timeMatch = tanggalStr.match(/ (\d{2}):/);
              if (timeMatch) jam = parseInt(timeMatch[1], 10);
            }

            parsed.push({
              toko,
              bulan: row[1]?.trim() || '',
              tanggal: tanggalStr,
              jam,
              produk: row[3]?.trim() || '',
              sku,
              group: row[5]?.trim() || '',
              qty: parseInt(row[6]) || 0,
              hargaDasar: parseRupiah(row[7]),
              harga: parseRupiah(row[8]),
              jumlah: parseRupiah(row[9]),
              modal: parseFloat(row[10]) || 0,
              klasifikasi: klasifikasiFormatted
            });
          }
          
          setData(parsed);
        },
        error: (error: any) => {
          console.error(error);
          setError('Gagal memproses data CSV.');
        }
      });
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data dari server.');
    } finally {
      setIsLoading(false);
    }
  };

  const tokos = useMemo(() => Array.from(new Set(data.map(d => d.toko).filter(Boolean))).sort(), [data]);
  const bulans = useMemo(() => Array.from(new Set(data.map(d => d.bulan).filter(Boolean))), [data]);
  const groups = useMemo(() => Array.from(new Set(data.map(d => d.group).filter(Boolean))).sort(), [data]);
  const klasifikasis = useMemo(() => Array.from(new Set(data.map(d => d.klasifikasi).filter(Boolean))).sort(), [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.produk.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesToko = selectedToko === 'All' || item.toko === selectedToko;
      const matchesBulan = selectedBulan === 'All' || item.bulan === selectedBulan;
      const matchesGroup = selectedGroup === 'All' || item.group === selectedGroup;
      const matchesKlasifikasi = selectedKlasifikasi === 'All' || item.klasifikasi === selectedKlasifikasi;
      
      let matchesDate = true;
      if (startDate || endDate) {
        const itemDateStr = item.tanggal.split(' ')[0];
        if (itemDateStr) {
          // parse YYYY-MM-DD
          // assuming itemDateStr is something like YYYY-MM-DD
          // If the date format is different, it might not sort properly
          // Let's assume lexical comparison works if it's YYYY-MM-DD
          // Or parse correctly if needed.
          if (startDate && itemDateStr < startDate) matchesDate = false;
          if (endDate && itemDateStr > endDate) matchesDate = false;
        } else {
          if (startDate || endDate) matchesDate = false;
        }
      }
      
      return matchesSearch && matchesToko && matchesBulan && matchesGroup && matchesKlasifikasi && matchesDate;
    });
  }, [data, searchTerm, selectedToko, selectedBulan, selectedGroup, selectedKlasifikasi, startDate, endDate]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedToko, selectedBulan, selectedGroup, selectedKlasifikasi, startDate, endDate]);

  const summary = useMemo(() => {
    let totalValue = 0;
    let totalQty = 0;
    let totalProfit = 0;
    
    filteredData.forEach(item => {
      totalValue += item.jumlah;
      totalQty += item.qty;
      const modalTotal = item.modal * item.qty;
      totalProfit += (item.jumlah - modalTotal);
    });

    return { totalValue, totalQty, totalProfit };
  }, [filteredData]);

  const chartDataToko = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => {
      if (d.toko) {
        map.set(d.toko, (map.get(d.toko) || 0) + d.jumlah);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 7);
  }, [filteredData]);

  const chartDataGroup = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => {
      if (d.group) {
        map.set(d.group, (map.get(d.group) || 0) + d.qty);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 6);
  }, [filteredData]);

  // Anomaly Detection: Penginputan Bersamaan / Clustering per jam
  const anomalyData = useMemo(() => {
    const alerts: { toko: string, date: string, hour: number, count: number, totalDay: number, percent: number }[] = [];
    
    // Group by Toko -> Date -> Hour
    const tokoMap = new Map<string, Map<string, number[]>>();
    
    data.forEach(item => {
      if (!item.toko || !item.tanggal || item.jam === -1) return;
      const dateOnly = item.tanggal.split(' ')[0];
      
      if (!tokoMap.has(item.toko)) tokoMap.set(item.toko, new Map());
      const dateMap = tokoMap.get(item.toko)!;
      
      if (!dateMap.has(dateOnly)) dateMap.set(dateOnly, Array(24).fill(0));
      const hoursArray = dateMap.get(dateOnly)!;
      hoursArray[item.jam] += 1; // count transactions
    });

    tokoMap.forEach((dateMap, toko) => {
      dateMap.forEach((hours, dateOnly) => {
        const totalDay = hours.reduce((sum, val) => sum + val, 0);
        if (totalDay > 10) { // Only analyze days with more than 10 transactions
          hours.forEach((count, hour) => {
            const percent = (count / totalDay) * 100;
            // If more than 40% of daily transactions happen in a single hour
            if (percent >= 40) {
              alerts.push({ toko, date: dateOnly, hour, count, totalDay, percent });
            }
          });
        }
      });
    });

    return alerts.sort((a, b) => b.percent - a.percent);
  }, [data]);

  const filteredAnomalyData = useMemo(() => {
    return anomalyData.filter(anomaly => {
      const matchesToko = selectedToko === 'All' || anomaly.toko === selectedToko;
      return matchesToko;
    });
  }, [anomalyData, selectedToko]);

  const anomalyOverview = useMemo(() => {
    const map = new Map<string, number>();
    anomalyData.forEach(d => {
      map.set(d.toko, (map.get(d.toko) || 0) + 1);
    });
    return Array.from(map.entries()).map(([toko, count]) => ({ toko, count })).sort((a, b) => b.count - a.count);
  }, [anomalyData]);

  const chartDataWaktu = useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => ({ jam: `${i.toString().padStart(2, '0')}:00`, total: 0 }));
    filteredData.forEach(d => {
      if (d.jam >= 0 && d.jam < 24) {
        hours[d.jam].total += 1;
      }
    });
    return hours;
  }, [filteredData]);

  const chartDataHarian = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    filteredData.forEach(d => {
      const date = d.tanggal.split(' ')[0];
      if (!date) return;
      if (!map.has(date)) {
        map.set(date, { date });
      }
      const entry = map.get(date)!;
      entry[d.toko] = (entry[d.toko] || 0) + d.jumlah;
      entry['Total'] = (entry['Total'] || 0) + d.jumlah;
    });
    return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [filteredData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const getKlasifikasiColor = (klasifikasi: string) => {
    switch (klasifikasi) {
      case 'Fast Moving': return 'bg-green-100 text-green-700 border-green-200';
      case 'Slow Moving': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Dead Stock': return 'bg-red-100 text-red-700 border-red-200';
      case 'Sehat': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p>Memuat data penjualan...</p>
        </div>
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
            onClick={fetchData}
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
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Transaksi Penjualan</h2>
            <p className="text-xs text-slate-500">Analisa penjualan, sebaran waktu, dan deteksi anomali input</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('ringkasan')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ringkasan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Ringkasan & Anomali
          </button>
          <button 
            onClick={() => setActiveTab('harian')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'harian' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Penjualan Harian
          </button>
        </div>
      </div>

      {activeTab === 'harian' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h3 className="font-bold text-slate-800">Grafik Penjualan Harian</h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={selectedToko}
                onChange={(e) => setSelectedToko(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="All">Semua Toko</option>
                {tokos.map(toko => <option key={toko} value={toko}>{toko}</option>)}
              </select>
              <select 
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="All">Semua Bulan</option>
                {bulans.map(bln => <option key={bln} value={bln}>{bln}</option>)}
              </select>
            </div>
          </div>
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDataHarian} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} angle={-25} textAnchor="end" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `Rp${val / 1000000}M`} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => `Tanggal: ${label}`}
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                {selectedToko === 'All' ? (
                  tokos.map((toko, i) => (
                    <Line key={toko} type="monotone" dataKey={toko} stroke={COLORS[i % COLORS.length]} dot={{ r: 2, fill: COLORS[i % COLORS.length] }} activeDot={{ r: 5 }} strokeWidth={2} />
                  ))
                ) : (
                  <Line type="monotone" dataKey={selectedToko} stroke={COLORS[0]} dot={{ r: 4, fill: COLORS[0] }} activeDot={{ r: 6 }} strokeWidth={3} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'ringkasan' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Omset</span>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalValue)}</span>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total QTY Terjual</span>
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-800">{new Intl.NumberFormat('id-ID').format(summary.totalQty)}</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Estimasi Laba Kotor</span>
            <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalProfit)}</span>
        </div>
      </div>

      {anomalyData.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 mb-1">Anomali Penginputan Terdeteksi</h3>
              <p className="text-sm text-amber-700 mb-2">
                Sistem mendeteksi transaksi yang diinput secara massal di satu jam tertentu (mengindikasikan input borongan di akhir shift, bukan real-time). Misalnya sebuah toko memasukkan sejumlah besar transaksi sekaligus pada jam tutup.
              </p>
              
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-semibold text-amber-800 pt-1">Overview per Toko:</span>
                {anomalyOverview.map((item, i) => (
                  <span key={i} className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded">
                    {item.toko}: {item.count} hari anomali
                  </span>
                ))}
                <div className="ml-auto">
                  <select 
                    value={selectedToko}
                    onChange={(e) => setSelectedToko(e.target.value)}
                    className="text-xs border border-amber-300 rounded-md px-2 py-1 focus:outline-none focus:border-amber-500 bg-amber-50 text-amber-900 font-medium"
                  >
                    <option value="All">Filter: Semua Toko</option>
                    {tokos.map(toko => <option key={toko} value={toko}>{toko}</option>)}
                  </select>
                </div>
              </div>

              {filteredAnomalyData.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {filteredAnomalyData.map((anomaly, i) => (
                    <div key={i} className="bg-white/70 p-3 rounded-lg border border-amber-200 flex flex-col hover:bg-white transition-colors">
                      <span className="font-bold text-amber-900">{anomaly.toko}</span>
                      <span className="text-xs text-amber-700">{anomaly.date} - Jam {anomaly.hour}:00</span>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-amber-800">{anomaly.count} trx</span>
                        <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">{anomaly.percent.toFixed(1)}% dari harian</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-white/50 rounded-lg border border-amber-100 text-center text-sm text-amber-700">
                  Tidak ada anomali untuk toko yang dipilih (Filter Utama: {selectedToko}).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 xl:col-span-2">
          <h3 className="font-bold text-slate-800 mb-4">Omset Penjualan per Toko</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataToko} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} angle={-25} textAnchor="end" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `Rp${val / 1000000}M`} />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Omset']}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {chartDataToko.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-800">Distribusi Waktu Transaksi</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataWaktu} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="jam" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} interval={3} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [value, 'Transaksi']}
                />
                <Bar dataKey="total" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cari produk atau SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase">Filters:</span>
            </div>
            
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
              title="Tanggal Mulai"
            />
            <span className="text-slate-400 text-sm">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
              title="Tanggal Selesai"
            />
            
            <select 
              value={selectedToko}
              onChange={(e) => setSelectedToko(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="All">Semua Toko</option>
              {tokos.map(toko => <option key={toko} value={toko}>{toko}</option>)}
            </select>
            
            <select 
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="All">Semua Bulan</option>
              {bulans.map(bln => <option key={bln} value={bln}>{bln}</option>)}
            </select>
            
            <select 
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="All">Semua Kategori</option>
              {groups.map(grp => <option key={grp} value={grp}>{grp}</option>)}
            </select>
            
            <select 
              value={selectedKlasifikasi}
              onChange={(e) => setSelectedKlasifikasi(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="All">Semua Klasifikasi</option>
              {klasifikasis.map(klas => <option key={klas} value={klas}>{klas}</option>)}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-slate-200">
              <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="px-5 py-3">Waktu</th>
                <th className="px-5 py-3">Toko & Bulan</th>
                <th className="px-5 py-3">Produk & SKU</th>
                <th className="px-5 py-3">Kategori & Status</th>
                <th className="px-5 py-3 text-right">QTY</th>
                <th className="px-5 py-3 text-right">Harga Satuan</th>
                <th className="px-5 py-3 text-right">Total Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-500">
                    <div className="font-medium">{row.tanggal.split(' ')[0]}</div>
                    <div className="text-xs text-slate-400 font-mono">{row.tanggal.split(' ')[1] || '-'}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-700">{row.toko}</div>
                    <div className="text-xs text-slate-400">{row.bulan}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-slate-800 font-medium truncate max-w-[250px]" title={row.produk}>
                      {row.produk}
                    </div>
                    {row.sku && (
                      <div className="text-xs text-slate-500 mt-0.5">{row.sku}</div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="mb-1 text-slate-600 font-medium text-xs">{row.group}</div>
                    <span className={`px-2 py-0.5 border rounded text-[9px] font-bold ${getKlasifikasiColor(row.klasifikasi)}`}>
                      {row.klasifikasi.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-900 font-semibold text-right">{row.qty}</td>
                  <td className="px-5 py-3 text-slate-600 text-right">{formatCurrency(row.harga)}</td>
                  <td className="px-5 py-3 text-slate-900 font-semibold text-right">{formatCurrency(row.jumlah)}</td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    Tidak ada data transaksi yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {filteredData.length > 0 && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} transaksi
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredData.length / itemsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(filteredData.length / itemsPerPage)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
