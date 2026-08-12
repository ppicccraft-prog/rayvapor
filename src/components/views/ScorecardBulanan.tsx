import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { Store, TrendingUp, TrendingDown, MapPin, Calendar, Lightbulb, Loader2, AlertCircle, ArrowUp, ArrowDown, DollarSign, Activity, Award } from 'lucide-react';
import { formatCurrency } from '../../lib/dataParser';

let cachedData: any = null;

const parseCurrency = (val: string) => {
  if (!val) return 0;
  return Number(val.replace(/[^0-9.-]+/g,""));
};

export function ScorecardBulanan() {
  const [data, setData] = useState<any[]>(cachedData || []);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cachedData) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/scorecard_bulanan');
      if (!response.ok) {
        throw new Error('Failed to fetch data from server');
      }
      const csvText = await response.text();
            
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // The actual headers might be empty for row 0, let's process it safely
          // First, let's re-parse as array to skip the first row (the title row)
          Papa.parse(csvText, {
            header: false,
            skipEmptyLines: true,
            complete: (res2) => {
              const rows = res2.data as string[][];
              if (rows.length < 2) return;
              
              // Find header row (usually row 1)
              let headerRowIdx = -1;
              for (let i = 0; i < Math.min(5, rows.length); i++) {
                if (rows[i].includes('Toko') && rows[i].includes('Bulan')) {
                  headerRowIdx = i;
                  break;
                }
              }
              
              if (headerRowIdx === -1) {
                setError("Could not find headers");
                return;
              }

              const headers = rows[headerRowIdx];
              const tIdx = headers.indexOf('Toko');
              const bIdx = headers.indexOf('Bulan');
              const revIdx = headers.indexOf('Pendapatan (Rp)');
              const profitIdx = headers.indexOf('Laba Kotor (Rp)');
              const qtyIdx = headers.indexOf('Unit Terjual');

              const parsed = rows.slice(headerRowIdx + 1).map(row => {
                const qty = parseInt((row[qtyIdx] || '0').replace(/[^0-9.-]+/g,""), 10) || 0;
                return {
                  name: row[tIdx],
                  bulan: row[bIdx],
                  revenue: parseCurrency(row[revIdx]),
                  profit: parseCurrency(row[profitIdx]),
                  qty: qty,
                  transactions: 0 // Not in this sheet, so just default to 0
                };
              }).filter(r => r.name && r.bulan && r.revenue > 0);

              cachedData = parsed;
              setData(parsed);
              setIsLoading(false);
            }
          });
        },
        error: (error: any) => {
          console.error(error);
          setError('Failed to parse spreadsheet data.');
          setIsLoading(false);
        }
      });
    } catch (err: any) {
      console.error(err);
      setError('Failed to load data. Make sure the backend server is running and the sheet is accessible.');
      setIsLoading(false);
    }
  };

  const months = useMemo(() => {
    const uniqueMonths = Array.from(new Set(data.map(s => s.bulan)));
    return uniqueMonths.sort();
  }, [data]);

  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[0]);
    }
  }, [months, selectedMonth]);

  
  const monthlyTrendData = useMemo(() => {
    const trendMap = new Map<string, { bulan: string, revenue: number, profit: number }>();
    data.forEach(item => {
      if (!trendMap.has(item.bulan)) {
        trendMap.set(item.bulan, { bulan: item.bulan, revenue: 0, profit: 0 });
      }
      const current = trendMap.get(item.bulan)!;
      current.revenue += item.revenue;
      current.profit += item.profit;
    });
    return Array.from(trendMap.values()).sort((a, b) => a.bulan.localeCompare(b.bulan));
  }, [data]);

  const monthData = useMemo(() => {
    return data.filter(s => s.bulan === selectedMonth).sort((a, b) => b.revenue - a.revenue);
  }, [data, selectedMonth]);

  const currentMonthMetrics = useMemo(() => {
    const currentIdx = months.indexOf(selectedMonth);
    const currentMonthRevenue = monthData.reduce((sum, item) => sum + item.revenue, 0);
    const currentMonthProfit = monthData.reduce((sum, item) => sum + item.profit, 0);
    const currentMonthQty = monthData.reduce((sum, item) => sum + item.qty, 0);
    
    let growth = 0;
    let hasPrevMonth = false;
    
    if (currentIdx > 0) {
      const prevMonth = months[currentIdx - 1];
      const prevMonthData = data.filter(s => s.bulan === prevMonth);
      const prevMonthRevenue = prevMonthData.reduce((sum, item) => sum + item.revenue, 0);
      if (prevMonthRevenue > 0) {
        growth = ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;
        hasPrevMonth = true;
      }
    }
    
    const topStore = monthData.length > 0 ? monthData[0].name : '-';
    
    return {
      totalRevenue: currentMonthRevenue,
      totalProfit: currentMonthProfit,
      totalQty: currentMonthQty,
      growth,
      hasPrevMonth,
      topStore
    };
  }, [monthData, months, selectedMonth, data]);

  const recommendations = useMemo(() => {
    if (!monthData.length) return [];
    
    const recs = [];
    const topStore = monthData[0];
    const bottomStore = monthData[monthData.length - 1];
    
    if (topStore) {
      recs.push({
        title: `Apresiasi Kinerja: ${topStore.name}`,
        desc: `Toko ${topStore.name} mencatat pendapatan tertinggi bulan ini dengan ${formatCurrency(topStore.revenue)}. Pertahankan strategi pemasaran dan ketersediaan stok di cabang ini.`,
        type: 'positive'
      });
    }
    
    if (bottomStore && bottomStore.name !== topStore?.name) {
      recs.push({
        title: `Perhatian Diperlukan: ${bottomStore.name}`,
        desc: `Toko ${bottomStore.name} memiliki pendapatan terendah (${formatCurrency(bottomStore.revenue)}). Perlu dievaluasi untuk promosi lokal atau perbaikan layanan toko.`,
        type: 'negative'
      });
    }
    
    const lowMarginStores = monthData.filter(s => (s.profit / s.revenue) < 0.2);
    if (lowMarginStores.length > 0) {
      recs.push({
        title: 'Optimalisasi Margin',
        desc: `Terdapat ${lowMarginStores.length} toko dengan margin profit di bawah 20% bulan ini. Disarankan untuk meninjau kembali strategi diskon dan efisiensi biaya operasional.`,
        type: 'warning'
      });
    }

    return recs;
  }, [monthData]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p>Loading data Scorecard Bulanan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 mx-auto" />
          <p className="font-medium">{error}</p>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-white text-red-600 font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors shadow-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Scorecard Bulanan</h2>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-white">Rekomendasi Berdasarkan Performa {selectedMonth}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  {rec.type === 'positive' ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  ) : rec.type === 'negative' ? (
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                  )}
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{rec.title}</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{rec.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {monthData.map((store) => (
          <div key={store.name} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{store.name}</h3>
                  <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-1">
                    <MapPin className="w-3 h-3" />
                    Cabang
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Revenue</div>
                  <div className="font-bold text-slate-900 dark:text-white text-lg">{formatCurrency(store.revenue)}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Profit</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{formatCurrency(store.profit)}</div>
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                  Margin: {((store.profit / store.revenue) * 100).toFixed(1)}%
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Items Sold</div>
                  <div className="font-bold text-slate-700 dark:text-slate-300">{new Intl.NumberFormat('id-ID').format(store.qty)} unit</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(currentMonthMetrics.totalRevenue)}</div>
            {currentMonthMetrics.hasPrevMonth && (
              <div className={`text-sm mt-1 flex items-center gap-1 ${currentMonthMetrics.growth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {currentMonthMetrics.growth >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                <span className="font-medium">{Math.abs(currentMonthMetrics.growth).toFixed(1)}%</span>
                <span className="text-slate-400">vs last month</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Profit</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(currentMonthMetrics.totalProfit)}</div>
            <div className="text-sm mt-1 text-slate-500 dark:text-slate-400">
              Margin: {currentMonthMetrics.totalRevenue > 0 ? ((currentMonthMetrics.totalProfit / currentMonthMetrics.totalRevenue) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Top Store</div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white truncate" title={currentMonthMetrics.topStore}>{currentMonthMetrics.topStore}</div>
            <div className="text-sm mt-1 text-slate-500 dark:text-slate-400">Highest revenue this month</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Units Sold</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{new Intl.NumberFormat('id-ID').format(currentMonthMetrics.totalQty)}</div>
            <div className="text-sm mt-1 text-slate-500 dark:text-slate-400">Total items sold</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6">
        <h3 className="font-bold text-slate-800 dark:text-white mb-6">Trend Performa Bulanan (Seluruh Toko)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}M`} tick={{ fill: '#64748b', fontSize: 11 }} />
              <RechartsTooltip 
                formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? 'Revenue' : 'Profit']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)' }}
                cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '3 3' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line yAxisId="left" type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-6">Perbandingan Revenue Antar Toko ({selectedMonth})</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}M`} tick={{ fill: '#64748b', fontSize: 11 }} />
              <RechartsTooltip 
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
