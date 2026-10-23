<?php
declare(strict_types=1);

// Router khusus server pengembangan: php -S localhost:8000 router.php
$jalur = rawurldecode((string) (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'));

function tolak_404(): never
{
    http_response_code(404);
    require __DIR__ . '/404.php';
    exit;
}

foreach (['/config/', '/includes/', '/database/', '/cron/', '/deploy/', '/storage/'] as $privat) {
    if (str_starts_with($jalur, $privat)) {
        tolak_404();
    }
}

if (str_starts_with($jalur, '/.') || str_contains($jalur, "\0")) {
    tolak_404();
}

if (str_starts_with($jalur, '/assets/')) {
    if (str_contains($jalur, '..') || !is_file(__DIR__ . $jalur)) {
        tolak_404();
    }

    return false;
}

if ($jalur === '/robots.txt') {
    return false;
}

if (str_starts_with($jalur, '/media/')) {
    require_once __DIR__ . '/includes/media.php';
    $relatif = substr($jalur, strlen('/media/'));

    if (!jalur_media_aman($relatif)) {
        tolak_404();
    }

    $berkas = path_gambar_absolut($relatif);

    if ($berkas === null) {
        tolak_404();
    }

    header('Content-Type: image/webp');
    header('Cache-Control: public, max-age=2592000, immutable');
    readfile($berkas);
    exit;
}

$rute = [
    '#^/$#' => ['index.php', []],
    '#^/api/health$#' => ['health.php', []],
    '#^/admin/?$#' => ['admin/index.php', []],
    '#^/admin/login$#' => ['auth/login.php', []],
    '#^/admin/logout$#' => ['auth/logout.php', []],
    '#^/admin/akun/baru$#' => ['admin/tambah.php', []],
    '#^/admin/akun/(\d+)/edit$#' => ['admin/edit.php', ['id' => 1]],
    '#^/admin/akun/(\d+)/hapus$#' => ['admin/hapus.php', ['id' => 1]],
    '#^/admin/akun/(\d+)/status$#' => ['admin/status.php', ['id' => 1]],
    '#^/akun/(SWP-\d{4,})/?$#' => ['akun/detail.php', ['kode' => 1]],
];

foreach ($rute as $pola => [$berkas, $parameter]) {
    if (preg_match($pola, $jalur, $cocok) === 1) {
        foreach ($parameter as $nama => $indeks) {
            $_GET[$nama] = $cocok[$indeks];
        }

        require __DIR__ . '/' . $berkas;
        exit;
    }
}

$berkas_langsung = __DIR__ . $jalur;

if (str_ends_with($jalur, '.php') && is_file($berkas_langsung)) {
    require $berkas_langsung;
    exit;
}

tolak_404();
