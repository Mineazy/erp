<?php
$files = ['deploy.php', 'migrate.php', 'restart.php', 'deploy.zip', 'restart.zip', 'migration.sql', 'run_migration.php'];
$deleted = 0;
foreach ($files as $f) {
    $path = __DIR__ . '/' . $f;
    if (file_exists($path)) {
        unlink($path);
        $deleted++;
    }
}
echo "Cleaned up $deleted files.\n";
// Self-destruct
unlink(__FILE__);
