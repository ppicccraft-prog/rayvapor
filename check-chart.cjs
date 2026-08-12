const fs = require('fs');
const Papa = require('papaparse');
const csv = fs.readFileSync('dead_stock.csv', 'utf8');

Papa.parse(csv, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    let data = [];
    const TOKO_LIST = ['Cilandak', 'Karang Tengah', 'Cinere', 'Jagakarsa', 'Pondok Pinang'];
    const tokoMap = new Map();

    const normalized = results.data.map((row) => {
      const getVal = (possibleKeys) => {
        for (const k of possibleKeys) {
          const found = Object.keys(row).find(key => key.toLowerCase().trim() === k.toLowerCase());
          if (found) return row[found];
        }
        return '';
      };
      
      const qtyRaw = getVal(['stok berjalan', 'qty', 'stok mati', 'dead stock qty']);
      const qty = parseInt(qtyRaw?.toString().replace(/,/g, '') || '0', 10);
      
      const tokoStocks = {};
      TOKO_LIST.forEach(toko => {
        const val = getVal([toko]);
        tokoStocks[toko] = parseInt(val?.toString().replace(/,/g, '') || '0', 10) || 0;
      });
      
      return {
        tokoStocks,
        qty: isNaN(qty) ? 0 : qty,
      };
    });
    
    normalized.forEach(row => {
      TOKO_LIST.forEach(toko => {
        tokoMap.set(toko, (tokoMap.get(toko) || 0) + (row.tokoStocks[toko] || 0));
      });
    });
    
    const tokoChart = Array.from(tokoMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
      
    console.log("Chart Data:", tokoChart);
  }
});
