<?php
set_time_limit(300);
$target = __DIR__;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['zip'])) {
    $zip = $_FILES['zip'];
    if ($zip['error'] !== UPLOAD_ERR_OK) {
        die("Upload error code: " . $zip['error']);
    }
    echo "Received: " . number_format($zip['size']) . " bytes\n";

    $za = new ZipArchive();
    $res = $za->open($zip['tmp_name']);
    if ($res !== true) { die("Failed to open zip (code: $res)"); }

    $count = 0;
    for ($i = 0; $i < $za->numFiles; $i++) {
        $name = $za->getNameIndex($i);
        $name = str_replace('\\', '/', $name);
        if (substr($name, -1) === '/') continue;

        $dest = $target . '/' . $name;
        $dir = dirname($dest);
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $content = $za->getFromIndex($i);
        file_put_contents($dest, $content);
        $count++;
    }
    $za->close();
    echo "Extracted $count files.\nDone.\n";
} else {
    echo '<form method="post" enctype="multipart/form-data">';
    echo '<input type="file" name="zip" />';
    echo '<input type="submit" value="Deploy" />';
    echo '</form>';
}
