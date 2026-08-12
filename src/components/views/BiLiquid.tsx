import React, { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Store, Download, Share2, FileText, Send, Mail, CheckCircle, CheckSquare } from 'lucide-react';

interface LakuItem {
  no: string;
  sku: string;
  produk: string;
  totalQty: string;
  jual1: string;
  jual2: string;
  jual3: string;
  bulanTerlaris: string;
  qtyBulanTerlaris: string;
}

interface TidakLakuItem {
  no: string;
  sku: string;
  produk: string;
  stok: string;
  hargaBeli: string;
  nilaiStok: string;
}

interface LiquidToko {
  toko: string;
  laku: LakuItem[];
  tidakLaku: TidakLakuItem[];
}

interface BiLiquidProps {
  dataAnalisa?: any;
}

let cachedData: any = null;
export function BiLiquid({ dataAnalisa }: BiLiquidProps) {
  const [data, setData] = useState<LiquidToko[]>(cachedData || []);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);
  const [selectedToko, setSelectedToko] = useState<string>('All');
  
  const [selectedLakuSkus, setSelectedLakuSkus] = useState<Set<string>>(new Set());
  const [selectedTidakLakuSkus, setSelectedTidakLakuSkus] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'progress'>('dashboard');
  
  const [selectedBulan, setSelectedBulan] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (cachedData) { setData(cachedData); setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/bi_liquid');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: false,
        complete: (results) => {
          const rows = results.data as string[][];
          
          let tokos: LiquidToko[] = [];
          let currentToko = '';
          let currentLaku: LakuItem[] = [];
          let currentTidakLaku: TidakLakuItem[] = [];
          let readingData = false;

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            
            // Check for Toko name row (first column has data, second is empty, not a known header)
            if (row[0] && !row[1] && !row[0].includes("BUSINESS") && !row[0].includes("Periode") && !row[0].includes("TOP 20") && !row[0].includes("No")) {
              if (currentToko) {
                 tokos.push({ toko: currentToko, laku: currentLaku, tidakLaku: currentTidakLaku });
              }
              currentToko = row[0].trim();
              currentLaku = [];
              currentTidakLaku = [];
              readingData = false;
              continue;
            }
            
            // Table Headers
            if (row[0] === 'No' && row[1] === 'SKU') {
              readingData = true;
              continue;
            }
            
            if (readingData) {
              if (!row[0] && !row[10]) { // Empty row might mean end of block or just gap, but we'll keep reading till next toko
                continue;
              }
              
              if (row[0] && row[1]) {
                currentLaku.push({
                  no: row[0],
                  sku: row[1],
                  produk: row[2],
                  totalQty: row[3],
                  jual1: row[4],
                  jual2: row[5],
                  jual3: row[6],
                  bulanTerlaris: row[7],
                  qtyBulanTerlaris: row[8]
                });
              }
              
              if (row[10] && row[11]) {
                currentTidakLaku.push({
                  no: row[10],
                  sku: row[11],
                  produk: row[12],
                  stok: row[13],
                  hargaBeli: row[14],
                  nilaiStok: row[15]
                });
              }
            }
          }
          if (currentToko) {
            tokos.push({ toko: currentToko, laku: currentLaku, tidakLaku: currentTidakLaku });
          }
          
          setData(tokos);
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

  const toggleSelectAllLaku = () => {
    if (!activeData) return;
    if (selectedLakuSkus.size === activeData.laku.length && activeData.laku.length > 0) {
      setSelectedLakuSkus(new Set());
    } else {
      setSelectedLakuSkus(new Set(activeData.laku.map(item => item.sku)));
    }
  };

  const toggleSelectLakuSku = (sku: string) => {
    const newSelected = new Set(selectedLakuSkus);
    if (newSelected.has(sku)) {
      newSelected.delete(sku);
    } else {
      newSelected.add(sku);
    }
    setSelectedLakuSkus(newSelected);
  };

  const toggleSelectAllTidakLaku = () => {
    if (!activeData) return;
    if (selectedTidakLakuSkus.size === activeData.tidakLaku.length && activeData.tidakLaku.length > 0) {
      setSelectedTidakLakuSkus(new Set());
    } else {
      setSelectedTidakLakuSkus(new Set(activeData.tidakLaku.map(item => item.sku)));
    }
  };

  const toggleSelectTidakLakuSku = (sku: string) => {
    const newSelected = new Set(selectedTidakLakuSkus);
    if (newSelected.has(sku)) {
      newSelected.delete(sku);
    } else {
      newSelected.add(sku);
    }
    setSelectedTidakLakuSkus(newSelected);
  };

  // Reset selections when selected toko changes
  useEffect(() => {
    setSelectedLakuSkus(new Set());
    setSelectedTidakLakuSkus(new Set());
  }, [selectedToko]);

  const activeData = useMemo(() => {
    if (!data || data.length === 0) return null;

    if (!selectedToko || selectedToko === 'All' || selectedToko === 'Semua Toko' || selectedToko.toLowerCase().includes('semua toko')) {
      // 1. First look for combined toko entry in CSV ('SEMUA TOKO (GABUNGAN)')
      const combinedFromCsv = data.find(d => d.toko.toLowerCase().includes('semua toko') || d.toko === 'All');
      if (combinedFromCsv && (combinedFromCsv.laku.length > 0 || combinedFromCsv.tidakLaku.length > 0)) {
        return combinedFromCsv;
      }

      // 2. Otherwise calculate aggregate across all individual stores
      const individualTokos = data.filter(d => !d.toko.toLowerCase().includes('semua toko') && d.toko !== 'All');
      if (individualTokos.length === 0) return null;

      const lakuMap = new Map<string, {
        sku: string;
        produk: string;
        totalQty: number;
        jual1: number;
        jual2: number;
        jual3: number;
      }>();

      const tidakLakuMap = new Map<string, {
        sku: string;
        produk: string;
        stok: number;
        hargaBeliNum: number;
        nilaiStokNum: number;
      }>();

      individualTokos.forEach(tokoObj => {
        tokoObj.laku.forEach(item => {
          const sku = item.sku;
          const qty = parseInt(String(item.totalQty || '').replace(/[^0-9]/g, ''), 10) || 0;
          const j1 = parseInt(String(item.jual1 || '').replace(/[^0-9]/g, ''), 10) || 0;
          const j2 = parseInt(String(item.jual2 || '').replace(/[^0-9]/g, ''), 10) || 0;
          const j3 = parseInt(String(item.jual3 || '').replace(/[^0-9]/g, ''), 10) || 0;

          if (!lakuMap.has(sku)) {
            lakuMap.set(sku, {
              sku,
              produk: item.produk,
              totalQty: 0,
              jual1: 0,
              jual2: 0,
              jual3: 0,
            });
          }
          const cur = lakuMap.get(sku)!;
          cur.totalQty += qty;
          cur.jual1 += j1;
          cur.jual2 += j2;
          cur.jual3 += j3;
        });

        tokoObj.tidakLaku.forEach(item => {
          const sku = item.sku;
          const stok = parseInt(String(item.stok || '').replace(/[^0-9]/g, ''), 10) || 0;
          const hargaBeliNum = parseFloat(String(item.hargaBeli || '').replace(/[^0-9.-]/g, '')) || 0;
          const nilaiStokNum = parseFloat(String(item.nilaiStok || '').replace(/[^0-9.-]/g, '')) || (stok * hargaBeliNum);

          if (!tidakLakuMap.has(sku)) {
            tidakLakuMap.set(sku, {
              sku,
              produk: item.produk,
              stok: 0,
              hargaBeliNum,
              nilaiStokNum: 0,
            });
          }
          const cur = tidakLakuMap.get(sku)!;
          cur.stok += stok;
          cur.nilaiStokNum += nilaiStokNum;
        });
      });

      const sortedLaku: LakuItem[] = Array.from(lakuMap.values())
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 20)
        .map((item, idx) => {
          let bestMonth = 'Mei';
          let maxQty = item.jual3;
          if (item.jual1 >= item.jual2 && item.jual1 >= item.jual3) {
            bestMonth = 'Maret';
            maxQty = item.jual1;
          } else if (item.jual2 >= item.jual1 && item.jual2 >= item.jual3) {
            bestMonth = 'April';
            maxQty = item.jual2;
          }

          return {
            no: String(idx + 1),
            sku: item.sku,
            produk: item.produk,
            totalQty: item.totalQty.toLocaleString('id-ID'),
            jual1: item.jual1.toLocaleString('id-ID'),
            jual2: item.jual2.toLocaleString('id-ID'),
            jual3: item.jual3.toLocaleString('id-ID'),
            bulanTerlaris: bestMonth,
            qtyBulanTerlaris: maxQty.toLocaleString('id-ID')
          };
        });

      const sortedTidakLaku: TidakLakuItem[] = Array.from(tidakLakuMap.values())
        .sort((a, b) => b.stok - a.stok)
        .slice(0, 20)
        .map((item, idx) => ({
          no: String(idx + 1),
          sku: item.sku,
          produk: item.produk,
          stok: item.stok.toLocaleString('id-ID'),
          hargaBeli: `Rp ${item.hargaBeliNum.toLocaleString('id-ID')}`,
          nilaiStok: `Rp ${item.nilaiStokNum.toLocaleString('id-ID')}`
        }));

      return {
        toko: 'Semua Toko',
        laku: sortedLaku,
        tidakLaku: sortedTidakLaku
      };
    }

    return data.find(d => d.toko === selectedToko) || null;
  }, [data, selectedToko]);

  const { progressData, bulans, brands } = useMemo(() => {
    if (!dataAnalisa || !dataAnalisa.validRows) return { progressData: [], bulans: [], brands: [] };

    const bulansSet = new Set<string>();
    const brandsSet = new Set<string>();
    const progressMap = new Map<string, any>();

    dataAnalisa.validRows.forEach((row: any) => {
       const group = String(row.group || '').toLowerCase();
       if (!group.includes('liquid') && !group.includes('lqd')) return;

       if (selectedToko && row.toko !== selectedToko && selectedToko !== 'All' && !selectedToko.toLowerCase().includes('semua toko')) return;

       bulansSet.add(row.bulan);
       
       const brand = row.produk.split(' ')[0] || 'Unknown';
       brandsSet.add(brand);

       if (selectedBulan !== 'All' && row.bulan !== selectedBulan) return;
       if (selectedBrand !== 'All' && brand !== selectedBrand) return;

       const sku = row.sku;
       if (!progressMap.has(sku)) {
         progressMap.set(sku, {
           sku,
           produk: row.produk,
           brand,
           monthlyQty: {} as Record<string, number>,
           totalQty: 0,
           totalRevenue: 0
         });
       }
       
       const item = progressMap.get(sku);
       item.monthlyQty[row.bulan] = (item.monthlyQty[row.bulan] || 0) + row.qty;
       item.totalQty += row.qty;
       item.totalRevenue += row.revenue;
    });

    return {
      progressData: Array.from(progressMap.values()).sort((a, b) => b.totalQty - a.totalQty),
      bulans: Array.from(bulansSet).sort(),
      brands: Array.from(brandsSet).sort()
    };
  }, [dataAnalisa, selectedToko, selectedBulan, selectedBrand]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p>Memuat data BI Liquid per Toko...</p>
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
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">BI Liquid per Toko</h2>
            <p className="text-xs text-slate-500">Analisa likuiditas barang & dead stock</p>
          </div>
        </div>
        
        <div className="flex flex-col xl:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Top / Dead Stock
            </button>
            <button 
              onClick={() => setActiveTab('progress')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'progress' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Progress SKU
            </button>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-auto min-w-[200px]">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Pilih Toko:</span>
            <select
              value={selectedToko}
              onChange={(e) => setSelectedToko(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none text-indigo-700 w-full truncate"
            >
              <option value="All">Semua Toko</option>
              {data
                .filter(tokoData => !tokoData.toko.toLowerCase().includes('semua toko') && tokoData.toko !== 'All')
                .map(tokoData => (
                  <option key={tokoData.toko} value={tokoData.toko}>{tokoData.toko}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' && activeData && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Top 20 Paling Laku */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">TOP 20 SKU PALING LAKU</h3>
                  <p className="text-xs text-slate-500">Kategori Liquid (Total Qty 3 Bulan)</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(true)}
                disabled={selectedLakuSkus.size === 0 && selectedTidakLakuSkus.size === 0}
                className={`flex items-center justify-center gap-2 px-3 py-1.5 font-medium text-xs rounded-lg transition-colors shadow-sm whitespace-nowrap ${
                  (selectedLakuSkus.size > 0 || selectedTidakLakuSkus.size > 0)
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Share2 className="w-3 h-3" />
                Share Info
              </button>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    <th className="px-4 py-3 w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                        checked={selectedLakuSkus.size === activeData.laku.length && activeData.laku.length > 0}
                        onChange={toggleSelectAllLaku}
                      />
                    </th>
                    <th className="px-4 py-3 text-center w-10">No</th>
                    <th className="px-4 py-3">Produk / SKU</th>
                    <th className="px-4 py-3 text-center">Total 3 Bln</th>
                    <th className="px-4 py-3 text-center">Bulan Terlaris</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeData.laku.map((item, i) => (
                    <tr key={i} className={`hover:bg-slate-50 transition-colors ${selectedLakuSkus.has(item.sku) ? 'bg-emerald-50/50' : ''}`}>
                      <td className="px-4 py-3 text-center align-middle">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          checked={selectedLakuSkus.has(item.sku)}
                          onChange={() => toggleSelectLakuSku(item.sku)}
                        />
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 font-medium">{item.no}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 whitespace-normal min-w-[200px]">{item.produk}</div>
                        <div className="text-xs text-slate-500">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-md">
                          {item.totalQty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="font-medium text-slate-700">{item.bulanTerlaris}</div>
                        <div className="text-xs text-slate-500">{item.qtyBulanTerlaris} unit</div>
                      </td>
                    </tr>
                  ))}
                  {activeData.laku.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">Tidak ada data.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top 20 Tidak Laku */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">TOP 20 SKU TIDAK LAKU (DEAD STOCK)</h3>
                  <p className="text-xs text-slate-500">Kategori Liquid (0 Unit Terjual 3 Bln)</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(true)}
                disabled={selectedLakuSkus.size === 0 && selectedTidakLakuSkus.size === 0}
                className={`flex items-center justify-center gap-2 px-3 py-1.5 font-medium text-xs rounded-lg transition-colors shadow-sm whitespace-nowrap ${
                  (selectedLakuSkus.size > 0 || selectedTidakLakuSkus.size > 0)
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Share2 className="w-3 h-3" />
                Share Info
              </button>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    <th className="px-4 py-3 w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                        checked={selectedTidakLakuSkus.size === activeData.tidakLaku.length && activeData.tidakLaku.length > 0}
                        onChange={toggleSelectAllTidakLaku}
                      />
                    </th>
                    <th className="px-4 py-3 text-center w-10">No</th>
                    <th className="px-4 py-3">Produk / SKU</th>
                    <th className="px-4 py-3 text-center">Stok</th>
                    <th className="px-4 py-3 text-right">Nilai Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeData.tidakLaku.map((item, i) => (
                    <tr key={i} className={`hover:bg-slate-50 transition-colors ${selectedTidakLakuSkus.has(item.sku) ? 'bg-rose-50/50' : ''}`}>
                      <td className="px-4 py-3 text-center align-middle">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                          checked={selectedTidakLakuSkus.has(item.sku)}
                          onChange={() => toggleSelectTidakLakuSku(item.sku)}
                        />
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 font-medium">{item.no}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 whitespace-normal min-w-[200px]">{item.produk}</div>
                        <div className="text-xs text-slate-500">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-md">
                          {item.stok}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-slate-700">{item.nilaiStok}</div>
                        <div className="text-[10px] text-slate-400">@ {item.hargaBeli}</div>
                      </td>
                    </tr>
                  ))}
                  {activeData.tidakLaku.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">Tidak ada data.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row gap-4 justify-between items-center">
            <div className="flex flex-col">
              <h3 className="font-bold text-slate-800">Progress SKU (Trend Penjualan Bulanan)</h3>
              <p className="text-sm text-slate-500">Melihat pergerakan liquid per SKU dari bulan ke bulan.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 bg-white"
              >
                <option value="All">Semua Bulan</option>
                {bulans.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 bg-white"
              >
                <option value="All">Semua Brand</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <th className="px-5 py-3">Brand</th>
                  <th className="px-5 py-3">Produk / SKU</th>
                  {bulans.filter(b => selectedBulan === 'All' || b === selectedBulan).map(b => (
                    <th key={b} className="px-5 py-3 text-right">{b}</th>
                  ))}
                  <th className="px-5 py-3 text-right text-indigo-700 bg-indigo-50/50">Total QTY</th>
                  <th className="px-5 py-3 text-right text-indigo-700 bg-indigo-50/50">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {progressData.length === 0 ? (
                  <tr>
                    <td colSpan={bulans.filter(b => selectedBulan === 'All' || b === selectedBulan).length + 4} className="px-5 py-8 text-center text-slate-500">Tidak ada data untuk filter tersebut</td>
                  </tr>
                ) : (
                  progressData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-700">{item.brand}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-800">{item.produk}</div>
                        <div className="text-[11px] text-slate-500">{item.sku}</div>
                      </td>
                      {bulans.filter(b => selectedBulan === 'All' || b === selectedBulan).map(b => (
                        <td key={b} className="px-5 py-3 text-right font-medium text-slate-700">
                          {new Intl.NumberFormat('id-ID').format(item.monthlyQty[b] || 0)}
                        </td>
                      ))}
                      <td className="px-5 py-3 text-right font-bold text-indigo-700 bg-indigo-50/30">
                        {new Intl.NumberFormat('id-ID').format(item.totalQty)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-indigo-700 bg-indigo-50/30">
                        Rp {new Intl.NumberFormat('id-ID').format(item.totalRevenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Pilih Metode Bagikan Info</h3>
                <p className="text-sm text-slate-500">
                  Anda memilih {selectedLakuSkus.size + selectedTidakLakuSkus.size} produk untuk dibagikan informasinya
                </p>
              </div>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <button className="w-full text-left group hover:ring-2 hover:ring-blue-500 rounded-xl border border-slate-200 p-4 transition-all flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">Opsi 1: Export & Kirim Manual</h4>
                  <p className="text-sm text-slate-500">Download data terpilih dalam format PDF/CSV untuk dilampirkan secara manual ke email atau chat.</p>
                </div>
              </button>

              <button className="w-full text-left group hover:ring-2 hover:ring-emerald-500 rounded-xl border border-slate-200 p-4 transition-all flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors">Opsi 2: Kirim via WhatsApp</h4>
                  <p className="text-sm text-slate-500">Buat pesan otomatis berisi ringkasan info produk yang bisa langsung dikirim via WhatsApp.</p>
                </div>
              </button>

              <button className="w-full text-left group hover:ring-2 hover:ring-rose-500 rounded-xl border border-slate-200 p-4 transition-all flex items-start gap-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-1 group-hover:text-rose-600 transition-colors">Opsi 3: Kirim via Email</h4>
                  <p className="text-sm text-slate-500">Buka aplikasi email Anda dengan draf pesan yang sudah terisi ringkasan info produk.</p>
                </div>
              </button>

              <button className="w-full text-left group hover:ring-2 hover:ring-indigo-500 rounded-xl border border-slate-200 p-4 transition-all flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">Opsi 4: Bagikan In-App (Sistem)</h4>
                  <p className="text-sm text-slate-500">Kirimkan notifikasi dan info langsung melalui sistem aplikasi ke pengguna lain.</p>
                </div>
              </button>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowShareModal(false)}
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
