export interface ParsedData {
  headers: string[];
  rawRows: string[][];
  validRows: any[];
  stats: {
    totalRevenue: number;
    totalProfit: number;
    totalQty: number;
    transactions: number;
    avgProfitMargin: number;
  };
  groupSales: { name: string; value: number }[];
  topProducts: { name: string; revenue: number; qty: number; profit: number }[];
  stockClassification: { name: string; value: number }[];
  monthlyTrend: { name: string; revenue: number; profit: number }[];
  monthlyStoreStats: { name: string; bulan: string; revenue: number; profit: number; qty: number; transactions: number }[]; storeStats: { 
    name: string; 
    revenue: number; 
    profit: number; 
    qty: number; 
    transactions: number 
  }[];
  skuStats: {
    sku: string;
    name: string;
    group: string;
    qty: number;
    revenue: number;
    profit: number;
    klasifikasi: string;
  }[];
}

const parseCurrency = (val: string) => {
  if (!val) return 0;
  const numStr = val.toString().replace(/[^0-9.-]+/g,"");
  if (numStr === "" || numStr === "-" || numStr === ".") return 0;
  const num = Number(numStr);
  return isNaN(num) ? 0 : num;
};

export function parseSpreadsheetData(data: string[][]): ParsedData | null {
  if (!data || data.length === 0) return null;

  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    if (data[i].includes('Toko') && data[i].includes('Produk') && data[i].includes('QTY')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) return null;

  const headers = data[headerRowIdx].map(h => h.trim());
  const rawRows = data.slice(headerRowIdx + 1).filter(r => r.length > 0 && r.some(c => c.trim() !== ''));

  const colIdx = {
    toko: headers.indexOf('Toko'),
    bulan: headers.indexOf('Bulan'),
    produk: headers.indexOf('Produk'),
    sku: headers.indexOf('SKU'),
    group: headers.indexOf('Group'),
    qty: headers.indexOf('QTY'),
    hargaBeli: headers.indexOf('Harga Beli'),
    hargaJual: headers.indexOf('Harga Jual'),
    jumlah: headers.indexOf('Jumlah'),
    klasifikasi: headers.indexOf('Klasifikasi')
  };

  let totalRevenue = 0;
  let totalProfit = 0;
  let totalQty = 0;
  let validTransactionCount = 0;

  const groupMap = new Map<string, number>();
  const productMap = new Map<string, { revenue: number; qty: number; profit: number; sku: string; group: string; klasifikasi: string }>();
  const classMap = new Map<string, number>();
  const monthMap = new Map<string, { revenue: number; profit: number }>();
  const storeMap = new Map<string, { revenue: number; profit: number; qty: number; transactions: number }>();
  const monthlyStoreMap = new Map<string, { name: string; bulan: string; revenue: number; profit: number; qty: number; transactions: number }>();
  
  const validRows: any[] = [];

  rawRows.forEach(row => {
    const qty = parseInt(row[colIdx.qty] || '0', 10) || 0;
    const hargaBeli = parseCurrency(row[colIdx.hargaBeli]);
    const hargaJual = parseCurrency(row[colIdx.hargaJual]);
    const parsedJumlah = parseCurrency(row[colIdx.jumlah]);
    const revenue = parsedJumlah > 0 ? parsedJumlah : qty * hargaJual;
    const profit = revenue - (qty * hargaBeli);
    
    const produk = (row[colIdx.produk] || 'Unknown').trim();
    const sku = colIdx.sku >= 0 ? (row[colIdx.sku] || '-').trim() : '-';
    const group = (row[colIdx.group] || 'Others').trim();
    const klasifikasi = (row[colIdx.klasifikasi] || 'Unclassified').trim();
    const bulan = (row[colIdx.bulan] || 'Unknown').trim();
    const toko = (row[colIdx.toko] || 'Unknown').trim();

    if (qty > 0) {
      validTransactionCount++;
      totalRevenue += revenue;
      totalProfit += profit;
      totalQty += qty;

      validRows.push({
        toko, bulan, produk, sku, group, qty, hargaBeli, hargaJual, revenue, profit, klasifikasi, raw: row
      });

      groupMap.set(group, (groupMap.get(group) || 0) + revenue);
      classMap.set(klasifikasi, (classMap.get(klasifikasi) || 0) + 1);

      const mData = monthMap.get(bulan) || { revenue: 0, profit: 0 };
      mData.revenue += revenue;
      mData.profit += profit;
      monthMap.set(bulan, mData);

      const sData = storeMap.get(toko) || { revenue: 0, profit: 0, qty: 0, transactions: 0 };
      sData.revenue += revenue;
      sData.profit += profit;
      sData.qty += qty;
      sData.transactions += 1;
      storeMap.set(toko, sData);

      const mStoreKey = `${toko}_${bulan}`;
      const mStoreData = monthlyStoreMap.get(mStoreKey) || { name: toko, bulan: bulan, revenue: 0, profit: 0, qty: 0, transactions: 0 };
      mStoreData.revenue += revenue;
      mStoreData.profit += profit;
      mStoreData.qty += qty;
      mStoreData.transactions += 1;
      monthlyStoreMap.set(mStoreKey, mStoreData);

      const pData = productMap.get(produk) || { revenue: 0, qty: 0, profit: 0, sku, group, klasifikasi };
      pData.revenue += revenue;
      pData.qty += qty;
      pData.profit += profit;
      // keep highest moving classification if mixed? 
      // just take the latest classification for simplicity
      productMap.set(produk, pData);
    }
  });

  return {
    headers,
    rawRows,
    validRows,
    stats: {
      totalRevenue,
      totalProfit,
      totalQty,
      transactions: validTransactionCount,
      avgProfitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    },
    groupSales: Array.from(groupMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    topProducts: Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue),
    skuStats: Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue),
    stockClassification: Array.from(classMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    monthlyTrend: Array.from(monthMap.entries())
      .map(([name, data]) => ({ name, ...data })),
    monthlyStoreStats: Array.from(monthlyStoreMap.values())
      .sort((a, b) => b.revenue - a.revenue),
    storeStats: Array.from(storeMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
  };
}

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
};
