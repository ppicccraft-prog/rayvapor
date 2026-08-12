import { logActivity } from './activityLog';

export type RequestStatus = 'Menunggu SPV' | 'Menunggu Direksi' | 'Diproses' | 'Selesai' | 'Ditolak';

export interface RequestItem {
  kategori: string;
  sku: string;
  nama?: string;
  qty: number;
  approvedQty?: number;
  toko: string;
  diskon?: string;
  hargaBaru?: string;
}

export interface ApprovalLog {
  role: string;
  action: string;
  timestamp: string;
  catatan?: string;
}

export interface RequestOrder {
  id: string;
  createdAt: string; // ISO date
  items: RequestItem[];
  status: RequestStatus | 'Pending'; // Pending is legacy
  processedAt?: string; // ISO date
  completedAt?: string; // ISO date
  catatan?: string;
  approvalLogs?: ApprovalLog[];
}

const STORAGE_KEY = 'vaporista_requests';

export const getRequests = (): RequestOrder[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    // Migration for legacy 'Pending' status
    return parsed.map((req: any) => ({
      ...req,
      status: req.status === 'Pending' ? 'Menunggu SPV' : req.status
    }));
  } catch (e) {
    return [];
  }
};

export const saveRequest = (items: RequestItem[], initialStatus?: RequestStatus, role?: string) => {
  const requests = getRequests();
  const status = initialStatus || 'Menunggu SPV';
  const newRequest: RequestOrder = {
    id: `REQ-${Date.now()}`,
    createdAt: new Date().toISOString(),
    items,
    status,
    approvalLogs: [{
      role: role || 'System',
      action: `Created request with status ${status}`,
      timestamp: new Date().toISOString()
    }]
  };
  requests.push(newRequest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new Event('requestsUpdated'));
  
  logActivity(role || 'System', `Membuat Request Barang baru (${items.length} item)`, 'Request Barang');
};

export const updateRequestStatus = (
  id: string, 
  status: RequestStatus, 
  catatan?: string, 
  updatedItems?: RequestItem[],
  role?: string
) => {
  const requests = getRequests();
  const idx = requests.findIndex(r => r.id === id);
  if (idx !== -1) {
    const oldStatus = requests[idx].status;
    requests[idx].status = status;
    if (catatan !== undefined) requests[idx].catatan = catatan;
    if (updatedItems !== undefined) requests[idx].items = updatedItems;
    
    if (!requests[idx].approvalLogs) requests[idx].approvalLogs = [];
    requests[idx].approvalLogs!.push({
      role: role || 'System',
      action: `Changed from ${oldStatus} to ${status}`,
      timestamp: new Date().toISOString(),
      catatan
    });
    
    if (status === 'Diproses') {
      requests[idx].processedAt = new Date().toISOString();
    } else if (status === 'Selesai' || status === 'Ditolak') {
      requests[idx].completedAt = new Date().toISOString();
      if (!requests[idx].processedAt && status === 'Selesai') {
        // Fallback for SLA if skipping Diproses
        requests[idx].processedAt = requests[idx].createdAt;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    window.dispatchEvent(new Event('requestsUpdated'));
    
    logActivity(
      role || 'System', 
      `Mengubah status request ${id} menjadi ${status}`, 
      'Dashboard Request',
      catatan ? `Catatan: ${catatan}` : undefined
    );
  }
};

export const bulkUpdateRequests = (
  ids: string[],
  status: RequestStatus,
  role?: string
) => {
  const requests = getRequests();
  ids.forEach(id => {
    const idx = requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      const oldStatus = requests[idx].status;
      requests[idx].status = status;
      if (!requests[idx].approvalLogs) requests[idx].approvalLogs = [];
      requests[idx].approvalLogs!.push({
        role: role || 'System',
        action: `Bulk changed from ${oldStatus} to ${status}`,
        timestamp: new Date().toISOString(),
      });

      if (status === 'Diproses') {
        requests[idx].processedAt = new Date().toISOString();
      } else if (status === 'Selesai' || status === 'Ditolak') {
        requests[idx].completedAt = new Date().toISOString();
        if (!requests[idx].processedAt && status === 'Selesai') {
          requests[idx].processedAt = requests[idx].createdAt;
        }
      }
    }
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new Event('requestsUpdated'));
  
  logActivity(
    role || 'System', 
    `Mengubah status ${ids.length} request menjadi ${status}`, 
    'Dashboard Request'
  );
};

export const clearAllRequests = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('requestsUpdated'));
  logActivity('System', 'Menghapus semua data request', 'System');
};

