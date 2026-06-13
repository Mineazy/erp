<?php
$restartFile = __DIR__ . '/tmp/restart.txt';
$dir = dirname($restartFile);
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}
touch($restartFile);
echo "Passenger restarted.\n";
