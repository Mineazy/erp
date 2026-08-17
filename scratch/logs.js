const fs = require('fs');
const { Client } = require('ssh2');

const conn = new Client();
const privateKey = fs.readFileSync('C:\\Users\\Administrator\\.ssh\\id_rsa', 'utf8');

conn.on('ready', () => {
  const checkDirCmd = 'find /var/www /home /opt -name "erp" -type d -maxdepth 3 2>/dev/null | head -n 1';
  conn.exec(checkDirCmd, (err, stream) => {
    if (err) throw err;
    let projectDir = '';
    stream.on('close', () => {
      projectDir = projectDir.trim() || '/var/www/mineazy';
      const logCmd = `cd ${projectDir} && pm2 logs erp --lines 100 --nostream`;
      conn.exec(logCmd, (err, stream2) => {
        if (err) throw err;
        stream2.on('close', () => conn.end())
        .on('data', (data) => console.log(data.toString()))
        .stderr.on('data', (data) => console.error(data.toString()));
      });
    }).on('data', (data) => {
      projectDir += data.toString();
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
