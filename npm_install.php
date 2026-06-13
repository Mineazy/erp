<?php
$dir = '/home9/npivfupq/erp';
$cmd = "cd $dir && NODE_OPTIONS='--max-old-space-size=512' /home9/npivfupq/nodevenv/payroll/20/bin/npm install next@14.2.21 2>&1";
echo "Installing next...\n";
$out = shell_exec($cmd);
echo $out;
echo "DONE\n";
