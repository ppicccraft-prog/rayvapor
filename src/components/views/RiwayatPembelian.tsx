import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { apiFetch } from '../../utils/apiFetch';
import { Loader2, AlertCircle, ShoppingCart, Search, Filter, ArrowDownUp, TrendingUp, TrendingDown, Package, Activity } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell,
  PieChart, Pie, LineChart, Line
} from 'recharts';
import { ParsedData } from '../../lib/dataParser';

interface PurchaseData {
  toko: string;
  bulan: string;
  transactionNo: string;
  date: string;
  supplier: string;
  product: string;
  variant: string;
  sku: string;
  brand: string;
  category: string;
  qty: number;
  buyPrice: number;
  subtotal: number;
  klasifikasi: string;
}

interface RiwayatPembelianProps {
  dataAnalisa: ParsedData;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

let cachedData: any = null;
export function RiwayatPembelian({ dataAnalisa }: RiwayatPembelianProps) {
  const [data, setData] = useState<PurchaseData[]>(cachedData || []);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'harian' | 'komparasi'>('ringkasan');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToko, setSelectedToko] = useState<string>('All');
  const [selectedBulan, setSelectedBulan] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedKlasifikasi, setSelectedKlasifikasi] = useState<string>('All');

  // Map to find klasifikasi and hargaBeli based on toko + sku
  const productInfoMap = useMemo(() => {
    const map = new Map<string, { klasifikasi: string, hargaBeli: number }>();
    if (!dataAnalisa || !dataAnalisa.validRows) return map;
    
    dataAnalisa.validRows.forEach(row => {
      if (row.toko && row.sku) {
        map.set(`${row.toko}-${row.sku}`, {
          klasifikasi: row.klasifikasi || 'Unclassified',
          hargaBeli: row.hargaBeli || 0
        });
      }
    });
    return map;
  }, [dataAnalisa]);

  useEffect(() => {
    fetchData();
  }, [productInfoMap]);

  const fetchData = async () => {
    if (cachedData) { setData(cachedData); setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/pembelian');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = (results.data as any[]).map(row => {
            const toko = row['Toko'] || row['toko'] || '';
            const sku = row['sku'] || '';
            const info = productInfoMap.get(`${toko}-${sku}`) || { klasifikasi: 'Unclassified', hargaBeli: 0 };
            
            // standardize klasifikasi formatting
            let klasifikasiFormatted = 'Unclassified';
            const klasLower = info.klasifikasi.toLowerCase();
            if (klasLower.includes('fast')) klasifikasiFormatted = 'Fast Moving';
            else if (klasLower.includes('slow')) klasifikasiFormatted = 'Slow Moving';
            else if (klasLower.includes('dead')) klasifikasiFormatted = 'Dead Stock';
            else if (klasLower.includes('sehat')) klasifikasiFormatted = 'Sehat';
            
            const qty = parseInt(row['qty']) || 0;
            let buyPrice = parseInt(row['buy price']) || parseInt(row['avg buy price']) || 0;
            if (buyPrice === 0) buyPrice = info.hargaBeli;
            
            let subtotal = parseInt(row['subtotal']) || 0;
            if (subtotal === 0) subtotal = qty * buyPrice;

            return {
              toko,
              bulan: row['Bulan'] || row['bulan'] || '',
              transactionNo: row['transaction no'] || '',
              date: row['date'] || '',
              supplier: row['supplier'] || '',
              product: row['product'] || '',
              variant: row['variant'] || '',
              sku,
              brand: row['brand'] || '',
              category: row['category'] || '',
              qty,
              buyPrice,
              subtotal,
              klasifikasi: klasifikasiFormatted
            };
          });
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
  const categories = useMemo(() => Array.from(new Set(data.map(d => d.category).filter(Boolean))).sort(), [data]);
  const klasifikasis = useMemo(() => Array.from(new Set(data.map(d => d.klasifikasi).filter(Boolean))).sort(), [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.product.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.transactionNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesToko = selectedToko === 'All' || item.toko === selectedToko;
      const matchesBulan = selectedBulan === 'All' || item.bulan === selectedBulan;
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesKlasifikasi = selectedKlasifikasi === 'All' || item.klasifikasi === selectedKlasifikasi;
      
      return matchesSearch && matchesToko && matchesBulan && matchesCategory && matchesKlasifikasi;
    });
  }, [data, searchTerm, selectedToko, selectedBulan, selectedCategory, selectedKlasifikasi]);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalValue = 0;
    let totalQty = 0;
    let fastMovingQty = 0;
    let deadStockQty = 0;
    let slowMovingQty = 0;
    
    filteredData.forEach(item => {
      totalValue += item.subtotal;
      totalQty += item.qty;
      if (item.klasifikasi === 'Fast Moving') fastMovingQty += item.qty;
      else if (item.klasifikasi === 'Dead Stock') deadStockQty += item.qty;
      else if (item.klasifikasi === 'Slow Moving') slowMovingQty += item.qty;
    });

    return { totalValue, totalQty, fastMovingQty, deadStockQty, slowMovingQty };
  }, [filteredData]);

  // Chart Data
  const chartDataToko = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => {
      if (d.toko) {
        map.set(d.toko, (map.get(d.toko) || 0) + d.subtotal);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 7);
  }, [filteredData]);

  const chartDataKategori = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => {
      if (d.category) {
        map.set(d.category, (map.get(d.category) || 0) + d.qty);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 6);
  }, [filteredData]);

  const chartDataKlasifikasi = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => {
      if (d.klasifikasi) {
        map.set(d.klasifikasi, (map.get(d.klasifikasi) || 0) + d.qty);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const chartDataHarian = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    filteredData.forEach(d => {
      const dateOnly = d.date.split(' ')[0];
      if (!dateOnly) return;
      if (!map.has(dateOnly)) {
        map.set(dateOnly, { date: dateOnly as any });
      }
      const entry = map.get(dateOnly)!;
      entry[d.toko] = (entry[d.toko] || 0) + d.subtotal;
      entry['Total'] = (entry['Total'] || 0) + d.subtotal;
    });
    return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [filteredData]);

  const komparasiData = useMemo(() => {
    const map = new Map<string, {
      toko: string,
      qtyBeli: number,
      qtyJual: number,
      nilaiBeli: number,
      nilaiJual: number,
    }>();

    // Aggregate Pembelian (filteredData is already filtered by selectedToko/Bulan mostly but we want overall based on global filters if any. Wait, filteredData applies the UI filters. Let's use filteredData for beli.)
    filteredData.forEach(d => {
      if (!map.has(d.toko)) {
        map.set(d.toko, { toko: d.toko, qtyBeli: 0, qtyJual: 0, nilaiBeli: 0, nilaiJual: 0 });
      }
      const entry = map.get(d.toko)!;
      entry.qtyBeli += d.qty;
      entry.nilaiBeli += d.subtotal;
    });

    // Aggregate Penjualan (from dataAnalisa.validRows)
    if (dataAnalisa && dataAnalisa.validRows) {
      dataAnalisa.validRows.forEach(row => {
        // Apply similar global filters if selected
        const matchToko = selectedToko === 'All' || row.toko === selectedToko;
        const matchBulan = selectedBulan === 'All' || row.bulan === selectedBulan;
        
        if (!matchToko || !matchBulan) return;

        if (!map.has(row.toko)) {
          map.set(row.toko, { toko: row.toko, qtyBeli: 0, qtyJual: 0, nilaiBeli: 0, nilaiJual: 0 });
        }
        const entry = map.get(row.toko)!;
        entry.qtyJual += row.qty;
        entry.nilaiJual += row.revenue;
      });
    }

    return Array.from(map.values()).map(item => {
      const balanceQty = item.qtyBeli - item.qtyJual;
      // Anomali jika beli jauh lebih besar dari jual
      let status = 'Normal';
      if (item.qtyJual > 0 && item.qtyBeli / item.qtyJual > 1.5) {
         status = 'Overstock';
      } else if (item.qtyBeli === 0 && item.qtyJual > 0) {
         status = 'Penjualan Tanpa Restock';
      } else if (item.qtyBeli > 0 && item.qtyJual === 0) {
         status = 'Restock Tanpa Penjualan';
      }

      return {
        ...item,
        balanceQty,
        status,
        rasio: item.qtyJual > 0 ? (item.qtyBeli / item.qtyJual).toFixed(2) : (item.qtyBeli > 0 ? 'Infinity' : '0')
      };
    }).sort((a, b) => b.qtyBeli - a.qtyBeli);
  }, [filteredData, dataAnalisa, selectedToko, selectedBulan]);

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
          <p>Memuat data pembelian...</p>
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
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Riwayat Pembelian Toko</h2>
            <p className="text-xs text-slate-500">Log transaksi pembelian / restock dengan status produk</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('ringkasan')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ringkasan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Ringkasan
          </button>
          <button 
            onClick={() => setActiveTab('harian')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'harian' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Pembelian Periode
          </button>
          <button 
            onClick={() => setActiveTab('komparasi')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'komparasi' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Analisa Beli vs Jual
          </button>
        </div>
      </div>

      {activeTab === 'harian' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h3 className="font-bold text-slate-800">Grafik Pembelian per Periode</h3>
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Total Nilai Pembelian</span>
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalValue)}</span>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Total QTY Barang</span>
                <div className="w-8 h-8 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-bold text-slate-800">{new Intl.NumberFormat('id-ID').format(summary.totalQty)}</span>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">QTY Jadi Fast Moving</span>
                <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">{new Intl.NumberFormat('id-ID').format(summary.fastMovingQty)}</span>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">QTY Jadi Dead Stock</span>
                <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-bold text-red-600">{new Intl.NumberFormat('id-ID').format(summary.deadStockQty)}</span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 xl:col-span-2">
              <h3 className="font-bold text-slate-800 mb-4">Nilai Pembelian per Toko</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataToko} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} angle={-25} textAnchor="end" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `Rp${val / 1000000}M`} />
                    <RechartsTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [formatCurrency(value), 'Nilai Pembelian']}
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
              <h3 className="font-bold text-slate-800 mb-4">Status Klasifikasi Barang</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataKlasifikasi}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartDataKlasifikasi.map((entry, index) => {
                        let color = '#94a3b8'; // default
                        if (entry.name === 'Fast Moving') color = '#22c55e';
                        else if (entry.name === 'Slow Moving') color = '#eab308';
                        else if (entry.name === 'Dead Stock') color = '#ef4444';
                        else if (entry.name === 'Sehat') color = '#3b82f6';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => [new Intl.NumberFormat('id-ID').format(value) + ' QTY', 'Jumlah']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'komparasi' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <div>
              <h3 className="font-bold text-slate-800">Analisa Keseimbangan (Pembelian vs Penjualan)</h3>
              <p className="text-sm text-slate-500 mt-1">
                Membandingkan QTY Restock (Pembelian) dengan QTY Penjualan di toko yang sama untuk mendeteksi overstock atau indikasi anomali lainnya.
              </p>
            </div>
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
          
          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <th className="px-5 py-3">Toko</th>
                  <th className="px-5 py-3 text-right">QTY Pembelian</th>
                  <th className="px-5 py-3 text-right">QTY Penjualan</th>
                  <th className="px-5 py-3 text-right">Balance QTY</th>
                  <th className="px-5 py-3 text-right">Rasio (Beli/Jual)</th>
                  <th className="px-5 py-3">Status Indikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {komparasiData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">Tidak ada data untuk dibandingkan</td>
                  </tr>
                ) : (
                  komparasiData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-800">{item.toko}</td>
                      <td className="px-5 py-3 text-right font-medium">{new Intl.NumberFormat('id-ID').format(item.qtyBeli)}</td>
                      <td className="px-5 py-3 text-right font-medium">{new Intl.NumberFormat('id-ID').format(item.qtyJual)}</td>
                      <td className={`px-5 py-3 text-right font-bold ${item.balanceQty > 0 ? 'text-amber-600' : item.balanceQty < 0 ? 'text-blue-600' : 'text-slate-600'}`}>
                        {item.balanceQty > 0 ? '+' : ''}{new Intl.NumberFormat('id-ID').format(item.balanceQty)}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">{item.rasio}x</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          item.status === 'Overstock' ? 'bg-red-100 text-red-700' :
                          item.status === 'Normal' ? 'bg-green-100 text-green-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cari produk, SKU, atau no transaksi..."
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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="All">Semua Kategori</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">No Transaksi</th>
                <th className="px-5 py-3">Toko & Bulan</th>
                <th className="px-5 py-3">Produk</th>
                <th className="px-5 py-3">Status Saat Ini</th>
                <th className="px-5 py-3 text-right">QTY</th>
                <th className="px-5 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.slice(0, 100).map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-500">{row.date}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{row.transactionNo}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-700">{row.toko}</div>
                    <div className="text-xs text-slate-400">{row.bulan}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-slate-800 font-medium truncate max-w-[250px]" title={row.product}>
                      {row.product}
                    </div>
                    {row.variant && (
                      <div className="text-xs text-slate-500 mt-0.5">{row.variant} | {row.sku} | {row.category}</div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 border rounded text-[10px] font-bold ${getKlasifikasiColor(row.klasifikasi)}`}>
                      {row.klasifikasi.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-900 font-semibold text-right">{row.qty}</td>
                  <td className="px-5 py-3 text-slate-900 font-semibold text-right">{formatCurrency(row.subtotal)}</td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    Tidak ada data riwayat pembelian yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredData.length > 100 && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
              Menampilkan 100 dari {filteredData.length} transaksi
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
