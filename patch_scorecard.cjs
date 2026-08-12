const fs = require("fs");
let code = fs.readFileSync("src/components/views/ScorecardBulanan.tsx", "utf8");

// add useMemo for monthlyTrendData
const memoCode = `
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
`;

code = code.replace(
  "const monthData = useMemo(() => {",
  memoCode + "\n  const monthData = useMemo(() => {"
);

// add LineChart UI
const lineChartCode = `
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-6">Trend Performa Bulanan (Seluruh Toko)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(val) => \`Rp\${(val/1000000).toFixed(0)}M\`} tick={{ fill: '#64748b', fontSize: 11 }} />
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
`;

code = code.replace(
  '<div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">',
  lineChartCode + '\n      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">'
);

fs.writeFileSync("src/components/views/ScorecardBulanan.tsx", code);
