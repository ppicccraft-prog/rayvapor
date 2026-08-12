const https = require('https');
https.get('https://trends.google.com/trends/explore?q=vape&geo=ID', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data.substring(0, 1000)));
});
