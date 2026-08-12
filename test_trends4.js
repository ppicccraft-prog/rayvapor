const reqObj1 = {
  comparisonItem: [{ keyword: 'vape', geo: 'ID', time: 'today 12-m' }],
  category: 0,
  property: ''
};
console.log(`https://trends.google.com/trends/embed/explore/RELATED_QUERIES?req=${encodeURIComponent(JSON.stringify(reqObj1))}&tz=-420&eq=q=vape&geo=ID&date=today 12-m&metric=TOP`);
