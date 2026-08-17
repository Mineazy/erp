const fs = require('fs');
const buffer = Buffer.alloc(24);
const fd = fs.openSync('public/logo.png', 'r');
fs.readSync(fd, buffer, 0, 24, 0);
const width = buffer.readUInt32BE(16);
const height = buffer.readUInt32BE(20);
console.log(width, height);
