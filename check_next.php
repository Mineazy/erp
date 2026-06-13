<?php
$dir = __DIR__;
$next = "$dir/.next";

echo "Real .next dir: " . (is_dir($next) ? "YES" : "NO") . "\n";
if (is_dir($next)) {
    $files = array_diff(scandir($next), ['.', '..']);
    echo "Contents: " . implode(', ', $files) . "\n";
    $buildId = "$next/BUILD_ID";
    if (file_exists($buildId)) {
        echo "BUILD_ID: " . file_get_contents($buildId) . "\n";
        echo "BUILD_ID size: " . filesize($buildId) . "\n";
    }
    $server = "$next/server";
    if (is_dir($server)) {
        $sFiles = array_diff(scandir($server), ['.', '..']);
        echo "server: " . implode(', ', $sFiles) . "\n";
    } else {
        echo "server dir MISSING\n";
    }
    $api = "$next/server/app/api";
    if (is_dir($api)) {
        $aFiles = array_diff(scandir($api), ['.', '..']);
        echo "api: " . implode(', ', $aFiles) . "\n";
    } else {
        echo "api dir MISSING\n";
    }
}
