import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Store, TrendingUp, Package, MapPin } from 'lucide-react';
import { ParsedData, formatCurrency } from '../../lib/dataParser';

export function StoreScorecard({ data }: { data: ParsedData }) {
  const { storeStats } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Performa Toko</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storeStats.map((store) => (
          <div key={store.name} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{store.name}</h3>
                  <div className="flex items-center text-xs text-slate-500 gap-1">
                    <MapPin className="w-3 h-3" />
                    Cabang
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Revenue</div>
                  <div className="font-bold text-slate-900 text-lg">{formatCurrency(store.revenue)}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Profit</div>
                  <div className="font-bold text-emerald-600 text-lg">{formatCurrency(store.profit)}</div>
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Margin: {((store.profit / store.revenue) * 100).toFixed(1)}%
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Items Sold</div>
                  <div className="font-bold text-slate-700">{new Intl.NumberFormat('id-ID').format(store.qty)} unit</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Trx</div>
                  <div className="font-bold text-slate-700">{new Intl.NumberFormat('id-ID').format(store.transactions)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-6">Perbandingan Revenue Antar Toko</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={storeStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}M`} tick={{ fill: '#64748b', fontSize: 11 }} />
              <RechartsTooltip 
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
