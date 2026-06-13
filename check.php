<?php
echo "check.php\n";
echo "DIR: " . __DIR__ . "\n";
$files = array_diff(scandir(__DIR__), ['.', '..']);
echo "Root files: " . implode(', ', $files) . "\n";
// Check node_modules/@prisma/client
$pc = __DIR__ . '/node_modules/@prisma/client/index.js';
if (file_exists($pc)) {
    echo "Prisma client exists\n";
    echo "Size: " . filesize($pc) . "\n";
} else {
    echo "NO Prisma client found\n";
}
// Check if .next exists
$next = __DIR__ . '/.next';
if (is_dir($next)) {
    echo ".next exists\n";
    $nextFiles = array_diff(scandir($next), ['.', '..']);
    echo ".next contents: " . implode(', ', $nextFiles) . "\n";
} else {
    echo "NO .next directory\n";
}
// Check error log
$el = __DIR__ . '/tmp/error.log';
if (file_exists($el)) {
    echo "\n--- Error log ---\n" . file_get_contents($el);
} else {
    echo "\nNo error log found\n";
}
