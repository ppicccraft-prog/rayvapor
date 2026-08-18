import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { apiFetch } from '../../utils/apiFetch';
import { Loader2, AlertCircle, Settings, Calendar, Database, Tags, Info } from 'lucide-react';

interface ParamItem {
  key: string;
  value: string;
}

let cachedData: any = null;
export function Parameter() {
  const [generalParams, setGeneralParams] = useState<ParamItem[]>([]);
  const [liquidCategories, setLiquidCategories] = useState<string[]>([]);
  const [note, setNote] = useState('');
  
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (cachedData) { setGeneralParams(cachedData.params); setLiquidCategories(cachedData.liquid); setNote(cachedData.note); setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/parameter');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: false,
        complete: (results) => {
          const rows = results.data as string[][];
          
          const params: ParamItem[] = [];
          const liquid: string[] = [];
          let currentNote = '';
          
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;
            
            // Read General params from col 0 and 1
            if (row[0] && row[0].startsWith('Catatan')) {
              currentNote = row[0];
            } else if (row[0] && row[1] && row[0] !== 'PARAMETER ANALISA') {
              params.push({ key: row[0].trim(), value: row[1].trim() });
            }
            
            // Read Liquid categories from col 16 (index 16 for Q)
            if (row[16] && row[16] !== 'LIQUID' && row[16].trim() !== '') {
              liquid.push(row[16].trim());
            }
          }
          
          setGeneralParams(params);
          setLiquidCategories(liquid);
          setNote(currentNote);
          cachedData = { params, liquid, note: currentNote };
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p>Memuat konfigurasi parameter...</p>
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
          <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Parameter Analisa</h2>
            <p className="text-xs text-slate-500">Nilai referensi yang digunakan untuk seluruh modul analisa</p>
          </div>
        </div>
      </div>

      {note && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">{note}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Parameter Dasar */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Parameter Dasar</h3>
              <p className="text-xs text-slate-500">Konfigurasi periode dan referensi utama</p>
            </div>
          </div>
          
          <div className="p-0">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-100">
                {generalParams.map((param, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 w-1/2 font-medium text-slate-700 flex items-center gap-2">
                      {param.key.toLowerCase().includes('bulan') && <Calendar className="w-4 h-4 text-slate-400" />}
                      {param.key}
                    </td>
                    <td className="px-5 py-4 w-1/2">
                      <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-md">
                        {param.value}
                      </span>
                    </td>
                  </tr>
                ))}
                {generalParams.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-5 py-8 text-center text-slate-500">
                      Tidak ada parameter dasar ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kategori Liquid */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                <Tags className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Kategori Liquid</h3>
                <p className="text-xs text-slate-500">Group produk yang masuk kategori liquid</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
              {liquidCategories.length} Kategori
            </div>
          </div>
          
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {liquidCategories.map((cat, i) => (
                <div 
                  key={i}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                >
                  {cat}
                </div>
              ))}
              {liquidCategories.length === 0 && (
                <div className="w-full text-center py-8 text-slate-500 text-sm">
                  Tidak ada kategori liquid ditemukan.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
