<?php
$root = __DIR__;
$files = [];
foreach (scandir($root) as $f) {
    if (strpos($f, 'package') !== false || strpos($f, '.json') !== false) {
        // Use glob with backslash handling
        $files[] = $f;
    }
}
echo "Matching files: " . implode(', ', $files) . "\n\n";

// Read actual root package.json
$pkg = $root . '/package.json';
if (file_exists($pkg)) {
    echo "--- package.json ---\n";
    echo file_get_contents($pkg);
    echo "\n";
}
// Check if there's a real one with deps
$pkg2 = $root . '/package.json';
$c = file_get_contents($pkg2);
echo "Length: " . strlen($c) . "\n";
echo "Has scripts: " . (strpos($c, '"scripts"') !== false ? "yes" : "no") . "\n";
echo "Has dependencies: " . (strpos($c, '"dependencies"') !== false ? "yes" : "no") . "\n";
