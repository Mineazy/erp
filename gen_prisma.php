<?php
set_time_limit(120);
$dir = __DIR__;
putenv("PATH=/opt/cpanel/ea-nodejs20/bin:/usr/local/bin:/usr/bin:/bin");

// Use the local prisma CLI
$prisma = "$dir/node_modules/prisma/build/index.js";
if (file_exists($prisma)) {
    echo "Using local prisma\n";
    // Set --schema explicitly
    $schema = "$dir/prisma/schema.prisma";
    $cmd = "cd $dir && /opt/cpanel/ea-nodejs20/bin/node $prisma generate --schema=$schema 2>&1";
    echo `$cmd`;
} else {
    echo "local prisma not found at $prisma\n";
    // Try .bin
    foreach (["$dir/node_modules/.bin/prisma", "$dir/node_modules/prisma/prisma"] as $p) {
        echo "Checking $p: " . (file_exists($p) ? "EXISTS" : "MISSING") . "\n";
    }
}
