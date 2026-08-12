import React, { useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Clock, MousePointerClick, Calendar } from 'lucide-react';
import { ParsedData } from '../../lib/dataParser';

interface TrendMarketProps {
  data: ParsedData;
}

const TIME_RANGES = [
  { label: '12 Bulan Terakhir', value: 'today 12-m' },
  { label: '30 Hari Terakhir', value: 'today 1-m' },
  { label: '7 Hari Terakhir', value: 'now 7-d' },
];

export function TrendMarket({ data }: TrendMarketProps) {
  const categories = useMemo(() => {
    return data?.groupSales ? data.groupSales.map(g => g.name).slice(0, 10) : [];
  }, [data]);

  const defaultKeywords = ['vape', 'pod', 'liquid saltnic', 'mod vape', 'RDA', 'disposable pod'];
  const suggestedKeywords = Array.from(new Set([...defaultKeywords, ...categories])).slice(0, 12);

  const [keyword, setKeyword] = useState('vape');
  const [activeKeyword, setActiveKeyword] = useState('vape');
  const [timeRange, setTimeRange] = useState('today 12-m');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      setActiveKeyword(keyword.trim());
    }
  };

  const reqObj = {
    comparisonItem: [{ keyword: activeKeyword, geo: 'ID', time: timeRange }],
    category: 0,
    property: ''
  };

  const eq = `q=${encodeURIComponent(activeKeyword)}&geo=ID&date=${encodeURIComponent(timeRange)}`;
  const embedUrl = `https://trends.google.com/trends/embed/explore/TIMESERIES?req=${encodeURIComponent(JSON.stringify(reqObj))}&tz=-420&eq=${encodeURIComponent(eq)}`;
  const relatedQueriesUrl = `https://trends.google.com/trends/embed/explore/RELATED_QUERIES?req=${encodeURIComponent(JSON.stringify(reqObj))}&tz=-420&eq=${encodeURIComponent(eq)}`;
  const relatedTopicsUrl = `https://trends.google.com/trends/embed/explore/RELATED_TOPICS?req=${encodeURIComponent(JSON.stringify(reqObj))}&tz=-420&eq=${encodeURIComponent(eq)}`;
  const geoMapUrl = `https://trends.google.com/trends/embed/explore/GEO_MAP?req=${encodeURIComponent(JSON.stringify(reqObj))}&tz=-420&eq=${encodeURIComponent(eq)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trend Market</h2>
          <p className="text-slate-500 text-sm mt-1">Pantau tren pencarian Google untuk produk dan kategori vape di Indonesia</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Masukkan keyword (contoh: vape, pod, liquid...)" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
          <div className="relative w-full sm:w-56 shrink-0">
            <Calendar className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow appearance-none cursor-pointer"
            >
              {TIME_RANGES.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>
          <button 
            type="submit"
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Cari Tren</span>
          </button>
        </form>
        
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-sm text-slate-500 font-medium">Saran Keyword:</span>
          {suggestedKeywords.map(kw => (
            <button 
              key={kw}
              type="button"
              onClick={() => {
                setKeyword(kw);
                setActiveKeyword(kw);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                activeKeyword === kw 
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeseries Graph */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Minat Seiring Waktu: <span className="text-indigo-600">"{activeKeyword}"</span>
            </h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {TIME_RANGES.find(r => r.value === timeRange)?.label}
            </span>
          </div>
          <div className="flex-1 w-full bg-white relative">
            <iframe 
              src={embedUrl}
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no"
              title="Google Trends Time Series"
              className="absolute inset-0"
            ></iframe>
          </div>
        </div>
        
        {/* Subregion Map */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-500" />
              Minat Berdasarkan Wilayah
            </h3>
          </div>
          <div className="flex-1 w-full bg-white relative">
            <iframe 
              src={geoMapUrl}
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no"
              title="Google Trends Geo Map"
              className="absolute inset-0"
            ></iframe>
          </div>
        </div>

        {/* Related Queries (Top & Rising Combined) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
              <MousePointerClick className="w-5 h-5 text-indigo-500" />
              Kueri Terkait (Top & Rising)
            </h3>
            <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Info:</strong> Widget resmi dari Google Trends menggabungkan hasil <em>Top Queries</em> (Kueri Teratas) dan <em>Rising Queries</em> (Kueri Meningkat) dalam satu tampilan. Anda dapat <strong>menggunakan menu dropdown (panah bawah) di dalam widget di bawah ini</strong> untuk beralih antara melihat hasil "Teratas" (Top) dan "Meningkat" (Rising).
              </p>
            </div>
          </div>
          <div className="flex-1 w-full bg-white relative p-2">
            <iframe 
              src={relatedQueriesUrl}
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no"
              title="Google Trends Related Queries"
              className="absolute inset-0"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}
