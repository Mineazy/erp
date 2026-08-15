const fs = require('fs');
const { Client } = require('ssh2');
const net = require('net');

const sshClient = new Client();
const privateKey = fs.readFileSync('C:\\Users\\Administrator\\.ssh\\id_rsa', 'utf8');

const LOCAL_PORT = 3306;
const REMOTE_PORT = 3306;
const REMOTE_HOST = '127.0.0.1';

const server = net.createServer((socket) => {
  sshClient.forwardOut(
    '127.0.0.1',
    socket.remotePort,
    REMOTE_HOST,
    REMOTE_PORT,
    (err, stream) => {
      if (err) {
        console.error('Port forward error:', err);
        return socket.end();
      }
      socket.pipe(stream);
      stream.pipe(socket);
    }
  );
});

sshClient.on('ready', () => {
  console.log('SSH connection established');
  server.listen(LOCAL_PORT, '127.0.0.1', () => {
    console.log(`Tunnel listening on 127.0.0.1:${LOCAL_PORT}`);
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
