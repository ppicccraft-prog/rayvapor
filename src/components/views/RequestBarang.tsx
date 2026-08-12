import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, Clock, CheckCircle2, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { RequestItem, RequestOrder, getRequests, saveRequest } from '../../lib/requestStore';

export function RequestBarang({ role = 'Vaporista' }: { role?: string }) {
  const [items, setItems] = useState<RequestItem[]>([
    { kategori: 'Liquid Freebase', sku: '', qty: 1, toko: '' }
  ]);
  const [history, setHistory] = useState<RequestOrder[]>([]);

  const loadHistory = () => {
    // SPV only sees their own requests in this tab if needed, or we just filter by role?
    // Let's just show all history for now, or maybe they see it in DashboardRequest.
    setHistory(getRequests().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  useEffect(() => {
    loadHistory();
    const handleUpdate = () => loadHistory();
    window.addEventListener('requestsUpdated', handleUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'vaporista_requests') {
        loadHistory();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('requestsUpdated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const addItem = () => {
    setItems([...items, { kategori: 'Liquid Freebase', sku: '', qty: 1, toko: items[items.length - 1]?.toko || '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof RequestItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.sku || !i.toko || i.qty < 1)) {
      alert("Mohon lengkapi semua field (SKU, Toko, Qty minimal 1)");
      return;
    }
    const status = role === 'Vaporista' ? 'Menunggu SPV' : (role === 'Head (SPV)' ? 'Menunggu Direksi' : 'Diproses');
    saveRequest(items, status, role);
    setItems([{ kategori: 'Liquid Freebase', sku: '', qty: 1, toko: items[items.length - 1]?.toko || '' }]);
    alert(`Request berhasil dikirim dan masuk ke status: ${status}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
      case 'Menunggu SPV': return <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full text-xs font-semibold"><Clock className="w-3 h-3"/> Menunggu SPV</span>;
      case 'Menunggu Direksi': return <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-full text-xs font-semibold"><Clock className="w-3 h-3"/> Menunggu Direksi</span>;
      case 'Diproses': return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs font-semibold"><AlertCircle className="w-3 h-3"/> Diproses</span>;
      case 'Selesai': return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-semibold"><CheckCircle2 className="w-3 h-3"/> Selesai</span>;
      case 'Ditolak': return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-semibold"><XCircle className="w-3 h-3"/> Ditolak</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Buat Request Barang Baru</h2>
        <p className="text-sm text-slate-500 mb-6">Request ini akan ditujukan langsung kepada SPV untuk pemenuhan ke toko Anda.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            {items.map((item, index) => (
              <div key={index} className="flex flex-wrap md:flex-nowrap items-end gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="w-full md:w-1/4">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
                  <select 
                    value={item.kategori}
                    onChange={e => updateItem(index, 'kategori', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option>Liquid Freebase</option>
                    <option>Liquid Saltnic</option>
                    <option>Liquid Pods Friendly</option>
                    <option>Device</option>
                    <option>Aksesoris (Coil, Kapas, dll)</option>
                  </select>
                </div>
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">SKU / Nama Barang</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Oat Drips V1 100ml"
                    value={item.sku}
                    onChange={e => updateItem(index, 'sku', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div className="w-full md:w-1/6">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Qty</label>
                  <input 
                    type="number" 
                    min="1"
                    value={item.qty}
                    onChange={e => updateItem(index, 'qty', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div className="w-full md:w-1/4">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Toko Tujuan</label>
                  <input 
                    type="text" 
                    placeholder="Nama Toko"
                    value={item.toko}
                    onChange={e => updateItem(index, 'toko', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div className="w-full md:w-auto flex justify-end">
                  <button 
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button 
              type="button" 
              onClick={addItem}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Barang
            </button>

            <button 
              type="submit"
              className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
              Kirim Request
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Riwayat Request Anda</h2>
        
        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Belum ada riwayat request.
          </div>
        ) : (
          <div className="space-y-4">
            {history.map(req => (
              <div key={req.id} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{req.id}</div>
                    <div className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleString('id-ID')}</div>
                  </div>
                  <div>
                    {getStatusBadge(req.status)}
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-lg overflow-hidden">
                  {req.catatan && (
                    <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <span className="font-semibold block mb-0.5">Catatan SPV:</span>
                        {req.catatan}
                      </div>
                    </div>
                  )}
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 text-xs">
                      <tr>
                        <th className="px-4 py-2">SKU</th>
                        <th className="px-4 py-2">Kategori</th>
                        <th className="px-4 py-2">Toko</th>
                        <th className="px-4 py-2 w-20 text-center">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {req.items.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 font-medium text-slate-700">{item.sku}</td>
                          <td className="px-4 py-2 text-slate-500">{item.kategori}</td>
                          <td className="px-4 py-2 text-slate-500">{item.toko}</td>
                          <td className="px-4 py-2 text-center font-semibold text-slate-700">
                            {(req.status === 'Selesai' || req.status === 'Diproses') && item.approvedQty !== item.qty ? (
                              <div className="flex flex-col items-center">
                                <span className="text-orange-600">{item.approvedQty}</span>
                                <span className="text-[10px] text-slate-400 line-through">{item.qty}</span>
                              </div>
                            ) : (
                              item.qty
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
