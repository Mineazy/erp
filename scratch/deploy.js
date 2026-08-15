const fs = require('fs');
const { Client } = require('ssh2');

const conn = new Client();

const privateKey = fs.readFileSync('C:\\Users\\Administrator\\.ssh\\id_rsa', 'utf8');

conn.on('ready', () => {
  console.log('Client :: ready');
  
  // Find project directory first, usually /var/www/mineazy or /home/mineazy etc.
  const checkDirCmd = 'find /var/www /home /opt -name "erp" -type d -maxdepth 3 2>/dev/null | head -n 1';
  
  conn.exec(checkDirCmd, (err, stream) => {
    if (err) throw err;
    let projectDir = '';
    stream.on('close', (code, signal) => {
      projectDir = projectDir.trim();
      if (!projectDir) {
        // Fallback or guess
        projectDir = '/var/www/mineazy';
        console.log('Could not find project dir automatically, guessing: ' + projectDir);
      } else {
        console.log('Found project dir: ' + projectDir);
      }
      
      const deployCmd = `cd ${projectDir} && git stash && git pull && npm install && npm run build && pm2 restart all`;
      console.log('Running: ' + deployCmd);
      
      conn.exec(deployCmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
          conn.end();
        }).on('data', (data) => {
          console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
          console.log('STDERR: ' + data);
        });
      });
      
    }).on('data', (data) => {
      projectDir += data.toString();
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: 'mineazy.com',
  port: 22,
  username: 'root', // Or we might need to try 'ubuntu'
  privateKey: privateKey,
  passphrase: 'mineazy',
  readyTimeout: 20000
});
