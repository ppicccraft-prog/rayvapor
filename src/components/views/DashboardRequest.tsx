import React, { useState, useEffect, useMemo } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp, Package, Search, MessageSquare, CheckSquare, Square } from 'lucide-react';
import { RequestOrder, RequestItem, getRequests, updateRequestStatus, bulkUpdateRequests, RequestStatus } from '../../lib/requestStore';

export function DashboardRequest({ role = 'Direksi' }: { role?: string }) {
  const [requests, setRequests] = useState<RequestOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    req: RequestOrder | null;
    action: RequestStatus | null;
  }>({ isOpen: false, req: null, action: null });
  const [catatan, setCatatan] = useState('');
  const [tempItems, setTempItems] = useState<RequestItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadData = () => {
    setRequests(getRequests().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('requestsUpdated', handleUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'vaporista_requests') {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('requestsUpdated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const calculateSLA = (req: RequestOrder) => {
    if (!req.completedAt) return '-';
    const start = new Date(req.createdAt).getTime();
    const end = new Date(req.completedAt).getTime();
    const diffHrs = (end - start) / (1000 * 60 * 60);
    return `${diffHrs.toFixed(1)} Jam`;
  };

  const openActionModal = (req: RequestOrder, action: RequestStatus) => {
    setModalState({ isOpen: true, req, action });
    setCatatan(req.catatan || '');
    setTempItems(req.items.map(i => ({ ...i, approvedQty: i.approvedQty ?? i.qty })));
  };

  const confirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalState.req && modalState.action) {
      updateRequestStatus(modalState.req.id, modalState.action, catatan, tempItems, role);
      setModalState({ isOpen: false, req: null, action: null });
      setSelectedIds([]); // clear selection if any
    }
  };

  const handleBulkAction = (action: RequestStatus) => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Anda yakin ingin mengubah status ${selectedIds.length} request menjadi ${action}?`)) {
      bulkUpdateRequests(selectedIds, action, role);
      setSelectedIds([]);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchSearch = req.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.items.some(i => i.sku.toLowerCase().includes(searchTerm.toLowerCase()) || i.toko.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'All' || req.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  // SLA Stats
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'Menunggu SPV' || r.status === 'Menunggu Direksi' || r.status === 'Pending').length;
    const diproses = requests.filter(r => r.status === 'Diproses').length;
    const selesai = requests.filter(r => r.status === 'Selesai').length;
    
    const completedReqs = requests.filter(r => r.status === 'Selesai' && r.completedAt);
    const avgSlaHrs = completedReqs.length > 0 
      ? completedReqs.reduce((acc, curr) => {
          const diff = new Date(curr.completedAt!).getTime() - new Date(curr.createdAt).getTime();
          return acc + diff;
        }, 0) / completedReqs.length / (1000 * 60 * 60)
      : 0;

    return { total, pending, diproses, selesai, avgSlaHrs };
  }, [requests]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
      case 'Menunggu SPV': return <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded-lg text-xs font-semibold">Menunggu SPV</span>;
      case 'Menunggu Direksi': return <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded-lg text-xs font-semibold">Menunggu Direksi</span>;
      case 'Diproses': return <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-xs font-semibold">Diproses</span>;
      case 'Selesai': return <span className="text-green-600 bg-green-50 px-2 py-1 rounded-lg text-xs font-semibold">Selesai</span>;
      case 'Ditolak': return <span className="text-red-600 bg-red-50 px-2 py-1 rounded-lg text-xs font-semibold">Ditolak</span>;
      default: return null;
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRequests.length && filteredRequests.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequests.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard Request & SLA</h2>
          <p className="text-sm text-slate-500">Pantau request dari Vaporista dan performa pemenuhan barang.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Package className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-medium text-slate-600">Total Request</h3>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        
        <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-medium text-slate-600">Pending / Antrean</h3>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.pending}</div>
        </div>

        <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-medium text-slate-600">Request Selesai</h3>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.selesai}</div>
        </div>

        <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-medium text-slate-600">Rata-rata SLA</h3>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.avgSlaHrs.toFixed(1)} <span className="text-sm font-medium text-slate-500">Jam</span></div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 lg:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">Daftar Request</h3>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari Request / SKU..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="All">Semua Status</option>
              <option value="Menunggu SPV">Menunggu SPV</option>
              <option value="Menunggu Direksi">Menunggu Direksi</option>
              <option value="Diproses">Diproses</option>
              <option value="Selesai">Selesai</option>
              <option value="Ditolak">Ditolak</option>
            </select>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100 flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-800">{selectedIds.length} Request terpilih</span>
            <div className="flex gap-2">
              {role === 'Head (SPV)' && (
                <>
                  <button onClick={() => handleBulkAction('Menunggu Direksi')} className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-semibold hover:bg-purple-700 shadow-sm">
                    Teruskan ke Direksi
                  </button>
                  <button onClick={() => handleBulkAction('Diproses')} className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 shadow-sm">
                    Tandai Diproses
                  </button>
                  <button onClick={() => handleBulkAction('Ditolak')} className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 shadow-sm">
                    Tolak Masal
                  </button>
                </>
              )}
              {role === 'Direksi' && (
                <>
                  <button onClick={() => handleBulkAction('Diproses')} className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 shadow-sm">
                    Setujui & Proses
                  </button>
                  <button onClick={() => handleBulkAction('Ditolak')} className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 shadow-sm">
                    Tolak Masal
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 w-12">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600">
                    {filteredRequests.length > 0 && selectedIds.length === filteredRequests.length ? (
                      <CheckSquare className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-4">ID Request</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Item & Toko</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">SLA Penyelesaian</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <tr key={req.id} className={`transition-colors ${selectedIds.includes(req.id) ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-4 py-4">
                      <button onClick={() => toggleSelect(req.id)} className="text-slate-400 hover:text-indigo-600">
                        {selectedIds.includes(req.id) ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900 whitespace-nowrap">
                      {req.id}
                    </td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {req.items.map((item, i) => (
                          <div key={i} className="bg-slate-50 p-2 rounded text-xs border border-slate-100 flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-700">{item.kategori}</span>
                              <span className="text-indigo-600 font-medium">{item.toko}</span>
                            </div>
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col max-w-[200px]">
                                <span className="font-medium text-slate-800 break-all" title={item.sku}>{item.sku}</span>
                                {item.nama && <span className="text-slate-500 truncate" title={item.nama}>{item.nama}</span>}
                              </div>
                              <div className="ml-2 bg-white px-2 py-1 rounded border border-slate-200 font-semibold whitespace-nowrap text-center">
                                {req.status === 'Selesai' || req.status === 'Diproses' ? (
                                  <span className={item.approvedQty !== item.qty ? 'text-orange-600' : 'text-slate-700'}>
                                    {item.approvedQty ?? item.qty}
                                    {item.approvedQty !== item.qty && <span className="text-[10px] text-slate-400 line-through block text-center">{item.qty}</span>}
                                  </span>
                                ) : (
                                  <span className="text-slate-700">{item.qty}</span>
                                )} unit
                              </div>
                            </div>
                          </div>
                        ))}
                        {req.catatan && (
                          <div className="mt-2 text-xs flex items-start gap-1 p-2 bg-slate-100 rounded-md text-slate-600">
                            <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{req.catatan}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">
                      {req.status === 'Selesai' ? calculateSLA(req) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                      {(role === 'Head (SPV)' || role === 'Direksi') ? (
                        <>
                          {(req.status === 'Pending' || req.status === 'Menunggu SPV') && role === 'Head (SPV)' && (
                            <>
                              <button 
                                onClick={() => openActionModal(req, 'Menunggu Direksi')}
                                className="px-3 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-md text-xs font-semibold transition-colors"
                              >
                                Ke Direksi
                              </button>
                              <button 
                                onClick={() => openActionModal(req, 'Diproses')}
                                className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-semibold transition-colors"
                              >
                                Proses
                              </button>
                              <button 
                                onClick={() => openActionModal(req, 'Ditolak')}
                                className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-semibold transition-colors"
                              >
                                Tolak
                              </button>
                            </>
                          )}
                          
                          {req.status === 'Menunggu Direksi' && role === 'Direksi' && (
                            <>
                              <button 
                                onClick={() => openActionModal(req, 'Diproses')}
                                className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-semibold transition-colors"
                              >
                                Setujui & Proses
                              </button>
                              <button 
                                onClick={() => openActionModal(req, 'Ditolak')}
                                className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-semibold transition-colors"
                              >
                                Tolak
                              </button>
                            </>
                          )}

                          {req.status === 'Diproses' && (
                            <button 
                              onClick={() => openActionModal(req, 'Selesai')}
                              className="px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-md text-xs font-semibold transition-colors"
                            >
                              Selesai
                            </button>
                          )}
                          {(req.status === 'Selesai' || req.status === 'Ditolak') && (
                            <span className="text-xs text-slate-400">Tidak ada aksi</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Tidak ada data request ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {modalState.isOpen && modalState.req && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">
                {modalState.action === 'Diproses' ? 'Proses Request' : 
                 modalState.action === 'Menunggu Direksi' ? 'Teruskan ke Direksi' :
                 modalState.action === 'Ditolak' ? 'Tolak Request' : 'Selesaikan Request'}
              </h3>
              <button 
                onClick={() => setModalState({ isOpen: false, req: null, action: null })}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={confirmAction} className="p-5 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <p className="text-sm text-slate-500 mb-2">Request ID: <span className="font-semibold text-slate-800">{modalState.req.id}</span></p>
                
                {modalState.action === 'Diproses' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                    <h4 className="text-xs font-semibold text-blue-800 mb-3 uppercase">Sesuaikan Qty (Jika Perlu)</h4>
                    <div className="space-y-3">
                      {tempItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex-1 truncate">
                            <span className="font-medium text-slate-800">{item.sku}</span>
                            <div className="text-xs text-slate-500">Toko: {item.toko} &bull; Req: {item.qty}</div>
                          </div>
                          <div className="w-24 shrink-0">
                            <label className="text-[10px] text-slate-500 block mb-1">Approved Qty</label>
                            <input 
                              type="number" 
                              min="0"
                              max={item.qty}
                              value={item.approvedQty}
                              onChange={e => {
                                const newItems = [...tempItems];
                                newItems[idx].approvedQty = parseInt(e.target.value) || 0;
                                setTempItems(newItems);
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Catatan / Alasan {modalState.action === 'Ditolak' && <span className="text-red-500">*</span>}
                </label>
                <textarea 
                  rows={3}
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  required={modalState.action === 'Ditolak'}
                  placeholder={modalState.action === 'Ditolak' ? "Masukkan alasan penolakan..." : "Opsional: Tambahkan catatan..."}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setModalState({ isOpen: false, req: null, action: null })}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm ${
                    modalState.action === 'Diproses' ? 'bg-blue-600 hover:bg-blue-700' :
                    modalState.action === 'Menunggu Direksi' ? 'bg-purple-600 hover:bg-purple-700' :
                    modalState.action === 'Ditolak' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  Konfirmasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
