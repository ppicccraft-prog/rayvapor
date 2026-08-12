import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Package, TrendingUp, DollarSign, ListOrdered, BarChart3, AlertCircle } from 'lucide-react';
import { ParsedData, formatCurrency } from '../../lib/dataParser';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

export function ExecutiveSummary({ data, validationErrors = [] }: { data: ParsedData, validationErrors?: string[] }) {
  const { stats, groupSales, topProducts, stockClassification, monthlyTrend } = data;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Gross Revenue</div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Net Profit</div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalProfit)}</div>
          <div className="mt-2 text-xs font-medium text-emerald-600">
            {stats.avgProfitMargin.toFixed(1)}% Margin
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Items Sold</div>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Package className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('id-ID').format(stats.totalQty)}</div>
          <div className="mt-2 text-xs text-slate-500 font-medium">Qty Terjual</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Transactions</div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><ListOrdered className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('id-ID').format(stats.transactions)}</div>
        </div>
      </div>

      {/* Visualizations Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Penjualan per Kategori (Group)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupSales.slice(0, 7)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}M`} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }} width={120} />
                <RechartsTooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6">Klasifikasi Stok</h3>
          <div className="flex-1 flex flex-col">
            <div className="h-56 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockClassification}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stockClassification.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => [value, 'Items']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {stockClassification.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                    <span className="text-slate-600 font-medium">{entry.name || 'Unclassified'}</span>
                  </div>
                  <span className="font-bold text-slate-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Visualizations Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6">Tren Pendapatan & Profit</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}M`} tick={{ fill: '#64748b', fontSize: 11 }} />
                <RechartsTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="left" type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Top 5 Produk (Revenue)</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <th className="px-6 py-3">Produk</th>
                  <th className="px-6 py-3 text-right">Qty</th>
                  <th className="px-6 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.slice(0, 5).map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-slate-700 font-medium truncate max-w-[200px]" title={p.name}>{p.name}</td>
                    <td className="px-6 py-3 text-slate-600 text-right">{new Intl.NumberFormat('id-ID').format(p.qty)}</td>
                    <td className="px-6 py-3 font-bold text-slate-900 text-right">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mt-6 shrink-0">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400">Data Validation Warnings</h3>
              <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">Found invalid entries that may cause calculation errors (like NaN in Net Profit):</p>
              <ul className="list-disc ml-5 mt-2 text-xs text-amber-700 dark:text-amber-500 max-h-32 overflow-y-auto">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
