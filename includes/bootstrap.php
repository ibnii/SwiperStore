<?php
declare(strict_types=1);

define('APP_MULAI', true);

require_once __DIR__ . '/../config/aplikasi.php';
require_once __DIR__ . '/../config/koneksi.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/sesi.php';

date_default_timezone_set(ZONA_WAKTU);

if (PHP_SAPI !== 'cli' && !headers_sent()) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
    header(
        "Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; "
        . "style-src 'self'; script-src 'self'; "
        . 'frame-src https://www.youtube-nocookie.com https://www.tiktok.com https://drive.google.com; '
        . "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
    );
}

mulai_sesi();
