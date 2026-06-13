<?php
$dir = __DIR__;
$cmd = "cd $dir && NODE_OPTIONS='--max-old-space-size=512' npm install --production --no-optional 2>&1";
echo "Running: $cmd\n";
$out = shell_exec($cmd);
echo $out;
