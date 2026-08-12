const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <body>
      <script>
        fetch('https://trends.google.com/trends/api/widgetdata/relatedsearches?hl=en&tz=-420&req=%7B%22restriction%22%3A%7B%22geo%22%3A%7B%22country%22%3A%22ID%22%7D%2C%22time%22%3A%222023-07-24%202024-07-24%22%2C%22complexKeywordsRestriction%22%3A%7B%22keyword%22%3A%5B%7B%22type%22%3A%22BROAD%22%2C%22value%22%3A%22vape%22%7D%5D%7D%7D%2C%22metric%22%3A%5B%22TOP%22%2C%22RISING%22%5D%2C%22trendinessSettings%22%3A%7B%22compareTime%22%3A%222022-07-24%202023-07-24%22%7D%7D&token=APP6_UEAAAAAZqC8324f3hT59-7z_M_06q-QzJmX6G0T')
          .then(r => r.text())
          .then(t => console.log('SUCCESS', t))
          .catch(e => console.log('ERROR', e));
      </script>
    </body>
    </html>
  `);
}).listen(8080);
