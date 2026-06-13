<?php
$dir = __DIR__ . '/node_modules';
$critical = ['next', 'react', 'react-dom', '@prisma/client', 'next-auth', 'recharts', 'lucide-react', 'bcryptjs'];
foreach ($critical as $pkg) {
    $path = "$dir/$pkg";
    echo "$pkg: " . (is_dir($path) ? "DIR (" . count(array_diff(scandir($path), ['.', '..'])) . " files)" : "MISSING") . "\n";
}
// Check .prisma/client
$pc = __DIR__ . '/node_modules/.prisma/client';
if (is_dir($pc)) {
    echo ".prisma/client: DIR\n";
    foreach (array_diff(scandir($pc), ['.', '..']) as $f) {
        if (strpos($f, 'so') !== false || strpos($f, 'engine') !== false) {
            echo "  $f (" . filesize("$pc/$f") . " bytes)\n";
        }
    }
}
