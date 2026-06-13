<?php
$dir = __DIR__;
$pc = "$dir/node_modules/.prisma/client";
if (is_dir($pc)) {
    echo ".prisma/client EXISTS\n";
    echo implode(', ', array_diff(scandir($pc), ['.', '..'])) . "\n";
} else {
    echo ".prisma/client MISSING\n";
}
$ac = "$dir/node_modules/@prisma/client";
if (is_dir($ac)) {
    echo "@prisma/client EXISTS\n";
    echo implode(', ', array_diff(scandir($ac), ['.', '..'])) . "\n";
} else {
    echo "@prisma/client MISSING\n";
}
// Check node_modules in general
$nm = "$dir/node_modules";
if (is_dir($nm)) {
    $dirs = array_diff(scandir($nm), ['.', '..']);
    echo "node_modules has " . count($dirs) . " entries\n";
}
