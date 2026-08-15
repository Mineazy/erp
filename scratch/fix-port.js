const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const privateKey = fs.readFileSync('C:\\Users\\Administrator\\.ssh\\id_rsa', 'utf8');

conn.on('ready', () => {
  console.log('Client :: ready');
  
  const setupCmd = `
    # Update package.json to run Next.js on port 3001
    sed -i 's/"start": "next start -H 0.0.0.0"/"start": "next start -H 0.0.0.0 -p 3001"/' /var/www/erp/package.json
    
    # Update all Nginx site configs to proxy to port 3001 instead of 3000
    sed -i 's/proxy_pass http:\\/\\/localhost:3000;/proxy_pass http:\\/\\/localhost:3001;/' /etc/nginx/sites-enabled/*
    
    # Restart services
    cd /var/www/erp
    pm2 restart all
    systemctl restart nginx
    
    echo "--- PM2 Status ---"
    pm2 list
    
    echo "--- PM2 Logs ---"
    pm2 logs erp --lines 10 --nostream
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
