<?php
$f = __DIR__ . '/.next/required-server-files.json';
$c = file_get_contents($f);
$j = json_decode($c, true);
if (!$j) {
    echo "ERROR: could not parse JSON\n";
    exit(1);
}
$j['appDir'] = '/home9/npivfupq/erp';
if (isset($j['experimental'])) {
    $j['experimental']['outputFileTracingRoot'] = '/home9/npivfupq/erp';
}
if (isset($j['files'])) {
    foreach ($j['files'] as $i => $p) {
        $j['files'][$i] = str_replace('\\', '/', $p);
    }
}
if (isset($j['ignore'])) {
    foreach ($j['ignore'] as $i => $p) {
        $j['ignore'][$i] = str_replace('\\', '/', $p);
    }
}
$out = json_encode($j, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
file_put_contents($f, $out);
echo "OK " . strlen($out) . " bytes written\n";
