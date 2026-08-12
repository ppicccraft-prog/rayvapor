const fs = require('fs');
const Papa = require('papaparse');
const csv = fs.readFileSync('dead_stock.csv', 'utf8');

Papa.parse(csv, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    const TOKO_LIST = ['Cilandak', 'Karang Tengah', 'Cinere', 'Jagakarsa', 'Pondok Pinang'];
    
    const tokoMap = new Map();
    
    results.data.forEach(row => {
      const tokoStocks = {};
      TOKO_LIST.forEach(toko => {
        const val = row[toko];
        tokoStocks[toko] = parseInt(val?.toString().replace(/,/g, '') || '0', 10) || 0;
      });
      
      TOKO_LIST.forEach(toko => {
        tokoMap.set(toko, (tokoMap.get(toko) || 0) + (tokoStocks[toko] || 0));
      });
    });
    
    console.log(tokoMap);
  }
});
