export type Role = 'Direksi' | 'Head (SPV)' | 'Staff' | 'Vaporista';

export const MENU_ITEMS = [
  { id: 'ringkasan_eksekutif', label: 'Ringkasan Eksekutif' },
  { id: 'scorecard_toko', label: 'Scorecard per Toko' },
  { id: 'scorecard_bulanan', label: 'Scorecard Bulanan' },
  { id: 'transfer_toko', label: 'Transfer Antar Toko' },
  { id: 'bundling', label: 'Bundling' },
  { id: 'diskon', label: 'Diskon' },
  { id: 'forecast', label: 'Forecast & Restock' },
  { id: 'stok_toko', label: 'Stok Akhir per Toko' },
  { id: 'stok_gudang', label: 'Stok Gudang Utama' },
  { id: 'analisa_sku', label: 'Analisa SKU' },
  { id: 'dead_stock', label: 'Dead Stock' },
  { id: 'transaksi_jual', label: 'Transaksi Penjualan' },
  { id: 'bi_liquid', label: 'BI Liquid per Toko' },
  { id: 'trend_market', label: 'Trend Market' },
  { id: 'riwayat_beli', label: 'Riwayat Pembelian' },
  { id: 'request_barang', label: 'Request Barang' },
  { id: 'dashboard_request', label: 'Dashboard Request & SLA' },
  { id: 'report_bundling', label: 'Report Bundling' },
  { id: 'sop', label: 'SOP' },
  { id: 'flowchart', label: 'Flowchart' },
  { id: 'parameter', label: 'Parameter Analisa' },
  { id: 'role_config', label: 'Konfigurasi Akses Role' },
  { id: 'log_aktivitas', label: 'Log Aktivitas' },
  { id: 'reset_approval', label: 'Hapus Data Trial' }
];

export const DEFAULT_ROLE_ACCESS: Record<Role, string[]> = {
  Direksi: MENU_ITEMS.map(m => m.id),
  'Head (SPV)': ['ringkasan_eksekutif', 'scorecard_toko', 'stok_toko', 'transaksi_jual', 'transfer_toko', 'diskon', 'bi_liquid', 'dashboard_request', 'report_bundling', 'log_aktivitas'],
  Staff: ['stok_toko', 'transaksi_jual', 'sop', 'dashboard_request', 'report_bundling'],
  Vaporista: ['request_barang']
};

export const DEFAULT_ROLE_PASSWORDS: Record<Role, string> = {
  Direksi: 'direksi123',
  'Head (SPV)': 'head123',
  Staff: 'staff123',
  Vaporista: 'vaporista123'
};

