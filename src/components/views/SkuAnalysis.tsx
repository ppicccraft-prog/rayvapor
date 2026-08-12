import React, { useState } from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { ParsedData, formatCurrency } from '../../lib/dataParser';

export function SkuAnalysis({ data }: { data: ParsedData }) {
  const { skuStats } = data;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All');

  const filteredData = skuStats.filter(sku => {
    const matchesSearch = sku.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          sku.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === 'All' || sku.klasifikasi.toLowerCase().includes(filterClass.toLowerCase());
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama produk atau SKU..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-5 h-5 text-slate-400" />
          <select 
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
          >
            <option value="All">Semua Klasifikasi</option>
            <option value="fast">Fast Moving</option>
            <option value="slow">Slow Moving</option>
            <option value="dead">Dead Stock</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Nama Produk</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-slate-700">
                  Total Qty <ArrowUpDown className="w-3 h-3" />
                </th>
                <th className="px-6 py-4 text-right">Revenue</th>
                <th className="px-6 py-4 text-right">Profit</th>
                <th className="px-6 py-4">Klasifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.slice(0, 100).map((item, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-500">{item.sku}</td>
                  <td className="px-6 py-3 text-slate-900 font-medium whitespace-normal min-w-[250px]">{item.name}</td>
                  <td className="px-6 py-3 text-slate-600">{item.group}</td>
                  <td className="px-6 py-3 text-slate-900 font-semibold text-right">{new Intl.NumberFormat('id-ID').format(item.qty)}</td>
                  <td className="px-6 py-3 text-slate-900 font-medium text-right">{formatCurrency(item.revenue)}</td>
                  <td className="px-6 py-3 text-emerald-600 font-medium text-right">{formatCurrency(item.profit)}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                      item.klasifikasi.toLowerCase().includes('fast') ? 'bg-green-100 text-green-700' :
                      item.klasifikasi.toLowerCase().includes('slow') ? 'bg-yellow-100 text-yellow-700' :
                      item.klasifikasi.toLowerCase().includes('dead') ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {item.klasifikasi.toUpperCase() || '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-slate-500">Tidak ada data yang sesuai dengan pencarian Anda.</div>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 text-center font-medium">
          Menampilkan maksimal 100 SKU teratas dari {filteredData.length} hasil.
        </div>
      </div>
    </div>
  );
}
