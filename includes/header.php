<?php
declare(strict_types=1);

if (!defined('APP_MULAI')) {
    http_response_code(404);
    exit;
}

$judul_halaman = $judul_halaman ?? NAMA_APLIKASI . ' — Akun premium, proses cepat.';
$deskripsi_halaman = $deskripsi_halaman ?? 'Swiper Store, katalog akun premium pilihan dengan proses pembelian cepat.';
$area_admin = $area_admin ?? false;
$gaya = $gaya ?? [];
$skrip = $skrip ?? [];
$kanonik = URL_APLIKASI . ($_SERVER['REQUEST_URI'] ?? '/');
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($judul_halaman) ?></title>
    <meta name="description" content="<?= e($deskripsi_halaman) ?>">
    <link rel="canonical" href="<?= e($kanonik) ?>">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="<?= e(NAMA_APLIKASI) ?>">
    <meta property="og:title" content="<?= e($judul_halaman) ?>">
    <meta property="og:description" content="<?= e($deskripsi_halaman) ?>">
    <meta property="og:url" content="<?= e($kanonik) ?>">
    <?php if (!empty($og_gambar)): ?>
        <meta property="og:image" content="<?= e($og_gambar) ?>">
        <meta property="og:image:alt" content="<?= e($og_gambar_alt ?? $judul_halaman) ?>">
    <?php endif; ?>
    <?php if ($area_admin): ?>
        <meta name="robots" content="noindex, nofollow">
    <?php endif; ?>
    <link rel="icon" href="<?= e(aset('img/favicon.svg')) ?>" type="image/svg+xml">
    <link rel="preload" href="<?= e(aset('fonts/bebas-neue-400.woff2')) ?>" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="<?= e(aset('fonts/plus-jakarta-sans-latin-wght-normal.woff2')) ?>" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="<?= e(aset('css/base.css')) ?>">
    <link rel="stylesheet" href="<?= e(aset('css/layout.css')) ?>">
    <?php foreach ($gaya as $nama_gaya): ?>
        <link rel="stylesheet" href="<?= e(aset('css/' . $nama_gaya . '.css')) ?>">
    <?php endforeach; ?>
</head>
<body class="<?= $area_admin ? 'area-admin' : 'area-publik' ?>">
<a class="lewati-ke-konten" href="#konten">Lewati ke konten</a>

<?php if ($area_admin): ?>
    <?php require __DIR__ . '/admin_nav.php'; ?>
<?php else: ?>
    <header class="situs-header">
        <div class="wadah situs-header__isi">
            <a class="merek" href="/">Swiper Store</a>
            <span class="situs-header__slogan">Akun premium</span>
        </div>
    </header>
<?php endif; ?>
