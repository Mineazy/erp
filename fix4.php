<?php
$dir = '/home9/npivfupq/erp';
$next = $dir . '/.next';
$files = array();
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($next));
foreach ($it as $f) {
    if ($f->isFile()) {
        $rel = substr($f->getPathname(), strlen($next) + 1);
        if (strpos($rel, 'cache/') !== 0) {
            $files[] = '.next/' . $rel;
        }
    }
}
sort($files);
$data = array(
    'version' => 1,
    'config' => array(
        'distDir' => '.next',
        'configOrigin' => 'next.config.mjs',
        'configFileName' => 'next.config.mjs',
        'env' => new stdClass(),
        'eslint' => array('ignoreDuringBuilds' => false),
        'typescript' => array('ignoreBuildErrors' => false, 'tsconfigPath' => 'tsconfig.json'),
        'outputFileTracing' => true,
    ),
    'appDir' => $dir,
    'relativeAppDir' => '',
    'files' => $files,
    'ignore' => array('node_modules/next/dist/compiled/@ampproject/toolbox-optimizer/**/*'),
);
$json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
file_put_contents($next . '/required-server-files.json', $json);
echo "OK " . count($files) . " files\n";
