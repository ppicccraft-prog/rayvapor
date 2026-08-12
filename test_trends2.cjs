const googleTrends = require('google-trends-api');

googleTrends.relatedQueries({keyword: 'vape', geo: 'ID', startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)})
.then((res) => {
  console.log(res);
})
.catch((err) => {
  console.log(err);
})
