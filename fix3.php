<?php
$dir = '/home9/npivfupq/erp';
$f = $dir . '/.next/required-server-files.json';
$x = file_get_contents($f);
$j = json_decode($x, true);
if ($j == null) { echo "FAIL\n"; exit; }
$j['appDir'] = $dir;
if (isset($j['experimental'])) {
    $j['experimental']['outputFileTracingRoot'] = $dir;
}
if (isset($j['files'])) {
    foreach ($j['files'] as $k => $v) {
        $j['files'][$k] = str_replace('\\', '/', $v);
    }
}
if (isset($j['ignore'])) {
    foreach ($j['ignore'] as $k => $v) {
        $j['ignore'][$k] = str_replace('\\', '/', $v);
    }
}
file_put_contents($f, json_encode($j, JSON_UNESCAPED_SLASHES));
echo "OK\n";
