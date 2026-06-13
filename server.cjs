const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const appRoot = __dirname;

const logFile = path.join(appRoot, 'install.log');
function log(msg) {
  const line = new Date().toISOString() + ' ' + msg + '\n';
  fs.appendFileSync(logFile, line);
}

const npmBin = '/home9/npivfupq/nodevenv/payroll/20/bin/npm';
const nodeBinDir = '/home9/npivfupq/nodevenv/payroll/20/bin';

log('=== Starting install ===');
log('Node: ' + process.version + ' / ' + process.platform);

try {
  log('Running npm install --ignore-scripts...');
  const result = execSync('"' + npmBin + '" install --ignore-scripts 2>&1', {
    cwd: appRoot,
    stdio: 'pipe',
    timeout: 600000,
    encoding: 'utf-8',
    env: { ...process.env, PATH: nodeBinDir + ':' + (process.env.PATH || '') },
    maxBuffer: 1024 * 1024,
  });
  log('npm install OK');
  log(result.substring(Math.max(0, result.length - 500)));
} catch (e) {
  log('npm install FAILED: ' + e.message);
  log('stderr: ' + (e.stderr || e.stdout || '').substring(0, 2000));
  startBasicServer(logFile);
  return;
}

try {
  log('Running prisma generate...');
  const prismaBin = path.join(appRoot, 'node_modules', '.bin', 'prisma');
  const nodeExe = path.join(nodeBinDir, 'node');
  const result = execSync('"' + nodeExe + '" "' + prismaBin + '" generate 2>&1', {
    cwd: appRoot,
    stdio: 'pipe',
    timeout: 120000,
    encoding: 'utf-8',
    env: { ...process.env, PATH: nodeBinDir + ':' + (process.env.PATH || '') },
    maxBuffer: 1024 * 1024,
  });
  log('prisma generate OK');
  log(result.substring(0, 500));
} catch (e) {
  log('prisma generate FAILED: ' + e.message);
  log('stderr: ' + (e.stderr || e.stdout || '').substring(0, 2000));
}

try {
  log('Fixing file permissions...');
  execSync('chmod -R 755 "' + path.join(appRoot, '.next') + '" 2>&1', {
    cwd: appRoot,
    stdio: 'pipe',
    timeout: 30000,
    encoding: 'utf-8',
  });
  execSync('chmod -R 755 "' + path.join(appRoot, 'node_modules', '.bin') + '" 2>&1', {
    cwd: appRoot,
    stdio: 'pipe',
    timeout: 10000,
    encoding: 'utf-8',
  });
  log('Permissions fixed');
} catch (e) {
  log('chmod warning (non-fatal): ' + e.message);
}

log('Starting Next.js...');
try {
  const next = require('next');
  const port = parseInt(process.env.PORT || '3002', 10);
  const app = next({ dev: false, hostname: 'localhost', port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    const { createServer } = require('http');
    const { parse } = require('url');
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, () => {
      log('> Ready on port ' + port);
    });
  }).catch(err => {
    log('Next prepare failed: ' + err.message);
    startBasicServer(logFile);
  });
} catch (e) {
  log('Failed to load next: ' + e.message);
  startBasicServer(logFile);
}

function startBasicServer(logPath) {
  const http = require('http');
  const port = parseInt(process.env.PORT || '3002', 10);
  http.createServer((req, res) => {
    const content = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf-8') : 'no log';
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('INSTALL STATUS\n\n' + content);
  }).listen(port, () => {
    log('Fallback server on port ' + port);
  });
}
