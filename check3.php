<?php
$paths = explode(':', shell_exec('echo $PATH 2>/dev/null') ?? '');
echo "PATH: " . implode("\n", $paths) . "\n\n";
$checks = ['/usr/bin/node', '/usr/local/bin/node', '/opt/cpanel/ea-nodejs20/bin/node', '/opt/cpanel/ea-nodejs18/bin/node', '/opt/cpanel/ea-nodejs16/bin/node', '/home9/npivfupq/nodevenv/erp/20/bin/node', '/home9/npivfupq/nodevenv/erp/18/bin/node'];
foreach ($checks as $n) {
    echo "$n: " . (file_exists($n) ? "EXISTS" : "no") . "\n";
}
$node = trim(shell_exec('which node 2>/dev/null') ?? '');
echo "which node: $node\n";
$npm = trim(shell_exec('which npm 2>/dev/null') ?? '');
echo "which npm: $npm\n";
// Check passenger app config
$config = '/home9/npivfupq/erp/.htaccess';
if (file_exists($config)) {
    echo "\n.htaccess:\n" . file_get_contents($config);
}
