<?php
set_time_limit(120);
$dir = __DIR__;
$engineDir = "$dir/node_modules/.prisma/client";
$commit = '605197351a3c8bdd595af2d2a9bc3025bca48ea2';
$platforms = ['rhel-openssl-1.1.x', 'debian-openssl-1.1.x', 'linux-musl-openssl-1.1.x'];

foreach ($platforms as $platform) {
    $binary = 'libquery_engine.so.node';
    $url = "https://binaries.prisma.sh/all_commits/$commit/$platform/$binary.gz";
    echo "Trying: $url\n";
    $gzFile = "$engineDir/$binary.gz";
    $fp = fopen($gzFile, 'w');
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_FILE, $fp);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    fclose($fp);
    $size = filesize($gzFile);
    echo "HTTP $httpCode, Size: $size\n";
    if ($httpCode == 200 && $size > 1000) {
        echo "FOUND on $platform!\n";
        $gz = gzopen($gzFile, 'r');
        $out = fopen("$engineDir/$binary", 'w');
        while (!gzeof($gz)) fwrite($out, gzread($gz, 65536));
        gzclose($gz); fclose($out);
        unlink($gzFile);
        chmod("$engineDir/$binary", 0755);
        echo "Done: " . filesize("$engineDir/$binary") . " bytes\n";
        exit;
    }
    unlink($gzFile);
}
echo "Engine not found on any platform\n";
