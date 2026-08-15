const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const privateKey = fs.readFileSync('C:\\Users\\Administrator\\.ssh\\id_rsa', 'utf8');

conn.on('ready', () => {
  console.log('Client :: ready');
  
  const setupCmd = `
    echo "--- Nginx Config ---"
    cat /etc/nginx/sites-enabled/*
    echo "--- PM2 Logs ---"
    pm2 logs erp --lines 15 --nostream
  `;
  
  conn.exec(setupCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR:\n' + data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: 'mineazy.com',
  port: 22,
  username: 'root',
  privateKey: privateKey,
  passphrase: 'mineazy',
  readyTimeout: 20000
});
