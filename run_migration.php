<?php
// Run ERP migration (add POS tables)
require_once __DIR__ . '/db_config.php';

$pdo = new PDO(
    "mysql:host=localhost;dbname=npivfupq_payroll;charset=utf8mb4",
    DB_USER, DB_PASS,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$sql = file_get_contents(__DIR__ . '/migration.sql');
$statements = array_filter(array_map('trim', explode(';', $sql)));

foreach ($statements as $stmt) {
    if (!empty($stmt) && !str_starts_with($stmt, '--')) {
        try {
            $pdo->exec($stmt);
            echo "OK: " . substr($stmt, 0, 60) . "...\n";
        } catch (PDOException $e) {
            if (str_contains($e->getMessage(), 'already exists')) {
                echo "SKIP (exists): " . substr($stmt, 0, 60) . "...\n";
            } else {
                echo "ERROR: " . $e->getMessage() . "\n";
            }
        }
    }
}

echo "\nMigration complete.\n";
