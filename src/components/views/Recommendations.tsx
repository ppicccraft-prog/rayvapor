import React from 'react';
import { Lightbulb, ArrowRight, TrendingDown, PackagePlus, Zap } from 'lucide-react';
import { ParsedData, formatCurrency } from '../../lib/dataParser';

export function Recommendations({ data }: { data: ParsedData }) {
  const { skuStats, storeStats, validRows } = data;

  // Derive some basic recommendations from data
  // 1. Transfer Antar Toko: Find dead stock in one store, fast moving in another (simulated by finding dead stock overall and finding stores that sold it)
  
  // Find dead stock items
  const deadStockItems = skuStats.filter(s => s.klasifikasi.toLowerCase().includes('dead') || s.klasifikasi.toLowerCase().includes('slow'));
  
  // For Bundling: Recommend bundling dead stock with top products
  const topProducts = skuStats.filter(s => s.klasifikasi.toLowerCase().includes('fast')).slice(0, 3);
  
  return (
    <div className="space-y-8">
      <div className="bg-blue-600 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center gap-8 shadow-lg shadow-blue-600/20">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Rekomendasi Cerdas Rayvapor</h2>
          <p className="text-blue-100 max-w-2xl">
            Berdasarkan analisis data transaksi terakhir, kami menemukan beberapa peluang untuk mengoptimalkan perputaran stok dan meningkatkan margin keuntungan Anda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bundling Recommendation */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
              <PackagePlus className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Peluang Bundling</h3>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Kombinasikan produk <span className="font-bold text-green-600">Fast Moving</span> dengan produk <span className="font-bold text-red-600">Dead Stock</span> untuk mempercepat likuidasi barang lambat.
          </p>
          
          <div className="space-y-4 flex-1">
            {deadStockItems.slice(0, 3).map((dead, i) => {
              const top = topProducts[i % topProducts.length];
              if (!top) return null;
              return (
                <div key={i} className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-slate-100 bg-slate-50 rounded-xl">
                  <div className="flex-1 text-center sm:text-left">
                    <div className="text-xs font-bold text-green-600 mb-1 uppercase tracking-wider">Fast Moving</div>
                    <div className="text-sm font-medium text-slate-900 line-clamp-2">{top.name}</div>
                  </div>
                  <div className="shrink-0 text-slate-300">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-center sm:text-right">
                    <div className="text-xs font-bold text-red-600 mb-1 uppercase tracking-wider">Dead Stock</div>
                    <div className="text-sm font-medium text-slate-900 line-clamp-2">{dead.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="mt-6 w-full py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
            Lihat Detail Bundling
          </button>
        </div>

        {/* Diskon Recommendation */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Rekomendasi Diskon Cuci Gudang</h3>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Terapkan diskon pada item-item berikut untuk membebaskan modal yang tertahan (Capital Tied Up).
          </p>
          
          <div className="space-y-4 flex-1">
            {deadStockItems.slice(3, 6).map((dead, i) => {
              return (
                <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 line-clamp-1">{dead.name}</div>
                    <div className="text-xs text-slate-500 mt-1">Stok mandek, Revenue: {formatCurrency(dead.revenue)}</div>
                  </div>
                  <div className="shrink-0 ml-4">
                    <div className="px-3 py-1 bg-red-50 text-red-700 font-bold text-sm rounded-lg border border-red-100">
                      Diskon 30-50%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="mt-6 w-full py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
            Buat Program Diskon
          </button>
        </div>
      </div>
    </div>
  );
}
