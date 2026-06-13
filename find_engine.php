<?php
$dir = __DIR__;

// Look for Prisma engine in common locations
$checks = [
    "$dir/node_modules/.prisma/client/",
    "$dir/../payroll/node_modules/.prisma/client/",
    "$dir/../payroll/node_modules/@prisma/client/",
    "/home9/npivfupq/payroll/node_modules/.prisma/client/",
];

foreach ($checks as $c) {
    if (is_dir($c)) {
        echo "Checking: $c\n";
        $files = array_diff(scandir($c), ['.', '..']);
        foreach ($files as $f) {
            if (strpos($f, 'query') !== false || strpos($f, '.so') !== false || strpos($f, 'engine') !== false) {
                echo "  ENGINE: $c$f (" . filesize("$c$f") . " bytes)\n";
            }
        }
    } else {
        echo "NOT FOUND: $c\n";
    }
}

// Also check for prisma schema
$schema = "$dir/prisma/schema.prisma";
if (file_exists($schema)) {
    echo "Schema exists at: $schema\n";
} else {
    echo "Schema NOT found at $schema\n";
}
