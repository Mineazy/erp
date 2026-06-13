<?php
echo "check2\n";
$pc = __DIR__ . '/node_modules/@prisma/client/index.js';
echo "Prisma @client: " . (file_exists($pc) ? "EXISTS" : "MISSING") . "\n";
$pc2 = __DIR__ . '/node_modules/.prisma/client/index.js';
echo "Prisma .client: " . (file_exists($pc2) ? "EXISTS" : "MISSING") . "\n";
echo "exec: " . (function_exists('exec') ? "yes" : "no") . "\n";
echo "shell_exec: " . (function_exists('shell_exec') ? "yes" : "no") . "\n";
echo "passthru: " . (function_exists('passthru') ? "yes" : "no") . "\n";
if (function_exists('shell_exec')) {
    echo "Node: " . shell_exec("node -e 'console.log(\"node works\")' 2>&1") . "\n";
    echo "npx: " . shell_exec("npx --version 2>&1") . "\n";
}
