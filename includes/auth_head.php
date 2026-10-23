<?php
declare(strict_types=1);

if (!defined('APP_MULAI')) {
    http_response_code(404);
    exit;
}

$judul_halaman = $judul_halaman ?? 'Masuk Admin — ' . NAMA_APLIKASI;
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($judul_halaman) ?></title>
    <meta name="robots" content="noindex, nofollow">
    <link rel="icon" href="<?= e(aset('img/favicon.svg')) ?>" type="image/svg+xml">
    <link rel="preload" href="<?= e(aset('fonts/bebas-neue-400.woff2')) ?>" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="<?= e(aset('fonts/plus-jakarta-sans-latin-wght-normal.woff2')) ?>" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="<?= e(aset('css/base.css')) ?>">
    <link rel="stylesheet" href="<?= e(aset('css/layout.css')) ?>">
    <link rel="stylesheet" href="<?= e(aset('css/auth.css')) ?>">
    <link rel="stylesheet" href="<?= e(aset('css/form.css')) ?>">
</head>
<body class="area-auth">
<main id="konten" class="auth-shell">
