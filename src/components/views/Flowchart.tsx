import React from 'react';
import { 
  Database, AlertTriangle, ArrowRight, Zap, RefreshCcw, 
  Tag, Package, ArrowDown, ShieldCheck, CheckCircle2
} from 'lucide-react';

export function Flowchart() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Flowchart Sistem Rekomendasi</h1>
            <p className="text-slate-500">Alur pengambilan keputusan berdasarkan data analitik dan stok toko</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-12 relative overflow-hidden shadow-sm">
        
        {/* Step 1: Input Data */}
        <div className="flex flex-col items-center relative z-10">
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5 w-64 shadow-sm text-center flex flex-col items-center">
            <Database className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="font-bold text-slate-900">Sistem POS & Inventory</h3>
            <p className="text-xs text-slate-500 mt-1">Data Penjualan & Stok Harian</p>
          </div>
          
          <div className="h-8 w-px bg-slate-300 relative">
            <ArrowDown className="absolute -bottom-2 -left-2 text-slate-400 w-4 h-4" />
          </div>

          {/* Step 2: Analisa Mesin */}
          <div className="bg-blue-600 text-white rounded-xl p-5 w-72 shadow-md text-center flex flex-col items-center">
            <Zap className="w-8 h-8 mb-3 text-blue-200" />
            <h3 className="font-bold text-lg">Analisa Data & Turnover (DOI)</h3>
            <p className="text-xs text-blue-100 mt-1">Sistem mengklasifikasikan performa tiap SKU</p>
          </div>

          <div className="h-8 w-px bg-slate-300 relative">
             <ArrowDown className="absolute -bottom-2 -left-2 text-slate-400 w-4 h-4" />
          </div>
        </div>

        {/* Branches */}
        <div className="flex flex-col md:flex-row justify-center gap-8 md:gap-16 relative z-10 w-full max-w-4xl mx-auto">
          {/* Top connection line for desktop */}
          <div className="hidden md:block absolute top-0 left-1/4 right-1/4 h-px bg-slate-300"></div>

          {/* Left Branch (Slow Moving) */}
          <div className="flex-1 flex flex-col items-center relative">
            <div className="hidden md:block h-8 w-px bg-slate-300 absolute top-0"></div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 w-full max-w-sm shadow-sm text-center mt-0 md:mt-8">
              <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <h3 className="font-bold text-orange-900">Slow Moving / Overstock</h3>
              <p className="text-xs text-orange-700 mt-1">DOI &gt; 90 Hari (Dead Stock)</p>
            </div>
            
            <div className="h-8 w-px bg-slate-300 relative">
               <ArrowDown className="absolute -bottom-2 -left-2 text-slate-400 w-4 h-4" />
            </div>

            <div className="w-full space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-300 transition-colors relative flex items-start gap-4">
                <div className="absolute -left-3 -top-3 bg-blue-100 text-blue-700 text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border border-blue-200">
                  1
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                  <RefreshCcw className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-slate-800 text-sm">Transfer Antar Toko</h4>
                  <p className="text-xs text-slate-500 mt-1">Pindahkan ke toko dengan histori penjualan lebih baik.</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-purple-300 transition-colors relative flex items-start gap-4">
                <div className="absolute -left-3 -top-3 bg-purple-100 text-purple-700 text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border border-purple-200">
                  2
                </div>
                <div className="p-2 bg-purple-50 rounded-lg shrink-0">
                  <Package className="w-6 h-6 text-purple-500" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-slate-800 text-sm">Strategi Bundling</h4>
                  <p className="text-xs text-slate-500 mt-1">Gabungkan Dead Stock dengan Hero Product (Barang Laris).</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-rose-300 transition-colors relative flex items-start gap-4">
                <div className="absolute -left-3 -top-3 bg-rose-100 text-rose-700 text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border border-rose-200">
                  3
                </div>
                <div className="p-2 bg-rose-50 rounded-lg shrink-0">
                  <Tag className="w-6 h-6 text-rose-500" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-slate-800 text-sm">Penerapan Diskon</h4>
                  <p className="text-xs text-slate-500 mt-1">Opsi cuci gudang untuk mengembalikan cash flow.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Branch (Fast Moving) */}
          <div className="flex-1 flex flex-col items-center relative mt-8 md:mt-0">
            <div className="hidden md:block h-8 w-px bg-slate-300 absolute top-0"></div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 w-full max-w-sm shadow-sm text-center mt-0 md:mt-8">
              <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-bold text-green-900">Fast Moving / Understock</h3>
              <p className="text-xs text-green-700 mt-1">Stok menipis / Potensi Out of Stock</p>
            </div>

            <div className="h-8 w-px bg-slate-300 relative">
               <ArrowDown className="absolute -bottom-2 -left-2 text-slate-400 w-4 h-4" />
            </div>

            <div className="w-full">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-teal-300 transition-colors relative flex items-start gap-4">
                <div className="p-2 bg-teal-50 rounded-lg shrink-0">
                  <ArrowRight className="w-6 h-6 text-teal-500" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-slate-800 text-sm">Forecast & Restock</h4>
                  <p className="text-xs text-slate-500 mt-1">Sistem memprediksi kebutuhan stok dan otomatis merekomendasikan tiket restock ke Gudang Utama.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Approval */}
        <div className="flex flex-col items-center mt-8 relative z-10">
          <div className="h-12 w-px bg-slate-300 relative mb-4">
             <ArrowDown className="absolute -bottom-2 -left-2 text-slate-400 w-4 h-4" />
          </div>
          <div className="bg-slate-900 text-white rounded-2xl p-6 w-full max-w-lg shadow-lg text-center flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <CheckCircle2 className="w-10 h-10 mb-3 text-green-400 relative z-10" />
            <h3 className="font-bold text-xl relative z-10">Review & Approval (Head/SPV)</h3>
            <p className="text-sm text-slate-300 mt-2 relative z-10">Semua rekomendasi aksi dari sistem membutuhkan validasi dan persetujuan dari pihak yang berwenang sebelum dieksekusi di lapangan.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
