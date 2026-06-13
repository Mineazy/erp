<?php
set_time_limit(300);
$node = '/opt/cpanel/ea-nodejs20/bin/node';
$npm = '/opt/cpanel/ea-nodejs20/bin/npm';
$npx = '/opt/cpanel/ea-nodejs20/bin/npx';
$dir = __DIR__;

// Set proper PATH
putenv("PATH=/opt/cpanel/ea-nodejs20/bin:/usr/local/bin:/usr/bin:/bin");

echo "Node: " . `$node -v 2>&1` . "\n";
echo "NPM: " . `$npm -v 2>&1` . "\n";

// Run npm install
echo "Running npm install...\n";
echo `cd $dir && $npm install 2>&1` . "\n";

// Generate Prisma client
echo "Generating Prisma client...\n";
echo `cd $dir && $npx prisma generate 2>&1` . "\n";

echo "Done.\n";
