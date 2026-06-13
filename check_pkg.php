<?php
$pkg = __DIR__ . '/package.json';
if (file_exists($pkg)) {
    echo "package.json EXISTS\n";
    echo file_get_contents($pkg);
} else {
    echo "package.json MISSING\n";
}
$lock = __DIR__ . '/package-lock.json';
echo "\npackage-lock.json: " . (file_exists($lock) ? "EXISTS" : "MISSING") . "\n";
// Check what's in node_modules if exists
$nm = __DIR__ . '/node_modules';
if (is_dir($nm)) {
    $dirs = array_diff(scandir($nm), ['.', '..']);
    echo "node_modules has " . count($dirs) . " entries\n";
    echo "First 10: " . implode(', ', array_slice($dirs, 0, 10)) . "\n";
} else {
    echo "node_modules MISSING\n";
}
