const fs = require('fs');
const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('grep -B 2 -A 10 "API ERROR" /root/.pm2/logs/erp-out.log /root/.pm2/logs/erp-error.log', (err, stream) => {
    stream.on('data', d => console.log(d.toString())).on('close', () => conn.end());
    stream.stderr.on('data', d => console.log(d.toString()));
  });
}).connect({
  host: 'mineazy.com',
  username: 'root',
  privateKey: fs.readFileSync('C:\\Users\\Administrator\\.ssh\\id_rsa'),
  passphrase: 'mineazy'
});
