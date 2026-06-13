<?php
$dir = __DIR__;

// Check Passenger error log
$logs = [
    "$dir/tmp/error.log",
    "$dir/error.log",
    "$dir/stderr.log",
    "$dir/tmp/passenger-error-*.log",
];

foreach ($logs as $l) {
    $files = glob($l);
    foreach ($files as $f) {
        if (file_exists($f)) {
            echo "=== $f ===\n" . file_get_contents($f) . "\n";
        }
    }
}

// Also check if the Node.js binary works
echo "\n--- Node check ---\n";
echo `/opt/cpanel/ea-nodejs20/bin/node -e "console.log('ok')" 2>&1` . "\n";

// Check if server.cjs exists
echo "server.cjs: " . (file_exists("$dir/server.cjs") ? "EXISTS" : "MISSING") . "\n";
echo "next.config.mjs: " . (file_exists("$dir/next.config.mjs") ? "EXISTS" : "MISSING") . "\n";

// Try to check what passenger sees
echo ".htaccess: " . (file_exists("$dir/.htaccess") ? "EXISTS" : "MISSING") . "\n";
