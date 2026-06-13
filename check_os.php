<?php
echo "OS: " . PHP_OS . "\n";
echo "uname: " . `uname -a 2>&1` . "\n";
echo "openssl: " . `openssl version 2>&1` . "\n";
echo "ldd: " . `ldd --version 2>&1 | head -1` . "\n";
echo "arch: " . `uname -m` . "\n";
// Check if default engine already exists
foreach (glob(__DIR__ . "/node_modules/.prisma/client/*.so*") as $f) {
    echo "Engine: $f\n";
}
echo ".prisma/client contents: ";
if (is_dir(__DIR__ . "/node_modules/.prisma/client")) {
    echo implode(', ', array_diff(scandir(__DIR__ . "/node_modules/.prisma/client"), ['.', '..'])) . "\n";
} else {
    echo "MISSING\n";
}
