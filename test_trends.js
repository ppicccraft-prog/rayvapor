const reqObj = {
  comparisonItem: [{ keyword: 'vape', geo: 'ID', time: 'today 12-m' }],
  category: 0,
  property: ''
};
const eq = `q=vape&geo=ID&date=today 12-m`;
console.log(`https://trends.google.com/trends/embed/explore/RELATED_QUERIES?req=${encodeURIComponent(JSON.stringify(reqObj))}&tz=-420&eq=${encodeURIComponent(eq)}`);
