import React, { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Loader2, TrendingUp, Zap, PackagePlus, ArrowRightLeft, Percent, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

let cachedMetrics: any = null;

export function OverviewRekomendasi() {
  const [loading, setLoading] = useState(!cachedMetrics);
  const [metrics, setMetrics] = useState<any>(cachedMetrics);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (cachedMetrics) { setMetrics(cachedMetrics); setLoading(false); return; }
      try {
        const [resTransfer, resBundling, resDiskon, resForecast] = await Promise.all([
          fetch('/api/transfer_toko'),
          fetch('/api/bundling'),
          fetch('/api/diskon'),
          fetch('/api/forecast')
        ]);

        const [textTransfer, textBundling, textDiskon, textForecast] = await Promise.all([
          resTransfer.text(),
          resBundling.text(),
          resDiskon.text(),
          resForecast.text()
        ]);

        const parseCSV = (csv: string) => {
          const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
          return result.data;
        };

        const dataTransfer = parseCSV(textTransfer) as any[];
        const dataBundling = parseCSV(textBundling) as any[];
        const dataDiskon = parseCSV(textDiskon) as any[];
        const dataForecast = parseCSV(textForecast) as any[];

        // Computations
        
        // Transfer Toko
        let transferQty = 0;
        let transferValue = 0;
        let transferItems = 0;
        dataTransfer.forEach(row => {
          const sku = row['SKU'] || '';
          if (sku && sku.toLowerCase() !== 'sku' && row['Saran Transfer'] && row['Saran Transfer'].includes('Pindahkan')) {
            const match = row['Saran Transfer'].match(/Pindahkan (\d+) unit/);
            if (match) transferQty += parseInt(match[1], 10);
            transferValue += Number(String(row['Nilai Nganggur (Rp)'] || '0').replace(/[^0-9.-]+/g, ""));
            transferItems++;
          }
        });

        // Bundling
        let bundlingQty = 0;
        let bundlingValue = 0;
        let bundlingItems = 0;
        dataBundling.forEach(row => {
          const sku = row['Rider SKU'] || '';
          if (sku && sku.toLowerCase() !== 'rider sku') {
            bundlingQty += parseInt(row['Rider Stok'] || '0', 10);
            bundlingValue += Number(String(row['Nilai Stok Rider'] || '0').replace(/[^0-9.-]+/g, ""));
            bundlingItems++;
          }
        });

        // Diskon
        let diskonQty = 0;
        let diskonRecovery = 0;
        let diskonItems = 0;
        dataDiskon.forEach(row => {
          const sku = row['SKU'] || '';
          if (sku && sku.toLowerCase() !== 'sku') {
            diskonQty += parseInt(row['Stok Berjalan'] || '0', 10);
            diskonRecovery += Number(String(row['Est. Cash Recovery'] || '0').replace(/[^0-9.-]+/g, ""));
            diskonItems++;
          }
        });

        // Forecast / Restock
        let restockQty = 0;
        let restockItems = 0;
        dataForecast.forEach(row => {
          const sku = row['SKU'] || '';
          if (sku && sku.toLowerCase() !== 'sku') {
            const saran = row['Saran Restock'] || '';
            const match = saran.match(/Restock ±([0-9,]+)/);
            if (match) {
               const qty = parseInt(match[1].replace(/,/g, ''), 10);
               if (qty > 0) {
                 restockQty += qty;
                 restockItems++;
               }
            }
          }
        });

        cachedMetrics = {
          transfer: { items: transferItems, qty: transferQty, value: transferValue },
          bundling: { items: bundlingItems, qty: bundlingQty, value: bundlingValue },
          diskon: { items: diskonItems, qty: diskonQty, value: diskonRecovery },
          forecast: { items: restockItems, qty: restockQty, value: 0 },
        };
        setMetrics(cachedMetrics);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Gagal memuat data ringkasan rekomendasi.');
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('id-ID').format(val);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
        <p>Memuat Overview Rekomendasi Aksi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-bold">Terjadi Kesalahan</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const chartData = [
    { name: 'Transfer Toko', sku: metrics.transfer.items, qty: metrics.transfer.qty, color: '#3b82f6' },
    { name: 'Bundling', sku: metrics.bundling.items, qty: metrics.bundling.qty, color: '#a855f7' },
    { name: 'Diskon Likuidasi', sku: metrics.diskon.items, qty: metrics.diskon.qty, color: '#ec4899' },
    { name: 'Restock', sku: metrics.forecast.items, qty: metrics.forecast.qty, color: '#10b981' }
  ];

  const financialData = [
    { name: 'Transfer Toko', potensi: metrics.transfer.value },
    { name: 'Bundling', potensi: metrics.bundling.value },
    { name: 'Diskon Likuidasi', potensi: metrics.diskon.value },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800">Overview Rekomendasi Aksi</h2>
          <p className="text-xs text-slate-500">Ringkasan potensi likuidasi dan optimalisasi stok dari berbagai rekomendasi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-sm font-medium text-slate-500">Transfer Antar Toko</span>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-bold text-slate-800">{formatNumber(metrics.transfer.items)} <span className="text-sm font-medium text-slate-400">SKU</span></div>
            <div className="text-sm text-slate-500 mt-1">Potensi: <span className="font-semibold text-slate-700">{formatCurrency(metrics.transfer.value)}</span></div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-sm font-medium text-slate-500">Bundling</span>
            <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              <PackagePlus className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-bold text-slate-800">{formatNumber(metrics.bundling.items)} <span className="text-sm font-medium text-slate-400">SKU</span></div>
            <div className="text-sm text-slate-500 mt-1">Stok terlibat: <span className="font-semibold text-slate-700">{formatNumber(metrics.bundling.qty)} unit</span></div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-sm font-medium text-slate-500">Diskon Likuidasi</span>
            <div className="w-8 h-8 bg-pink-50 text-pink-600 rounded-lg flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-bold text-slate-800">{formatNumber(metrics.diskon.items)} <span className="text-sm font-medium text-slate-400">SKU</span></div>
            <div className="text-sm text-slate-500 mt-1">Est. Recovery: <span className="font-semibold text-slate-700">{formatCurrency(metrics.diskon.value)}</span></div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-pink-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-sm font-medium text-slate-500">Forecast Restock</span>
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-bold text-slate-800">{formatNumber(metrics.forecast.items)} <span className="text-sm font-medium text-slate-400">SKU</span></div>
            <div className="text-sm text-slate-500 mt-1">Butuh Restock: <span className="font-semibold text-slate-700">{formatNumber(metrics.forecast.qty)} unit</span></div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Distribusi Jumlah SKU (Action Items)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <RechartsTooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="sku" name="Jumlah SKU" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Potensi Nilai / Cash Recovery (Rp)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                  tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}M`}
                />
                <RechartsTooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="potensi" name="Potensi Nilai" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
