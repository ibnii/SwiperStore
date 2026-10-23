<?php
declare(strict_types=1);

// Kredensial database ditulis langsung mengikuti gaya proyek PBL.
$db_host = '127.0.0.1';
$db_port = '5432';
$db_nama = 'swiperstore';
$db_pengguna = 'swiperstore';
$db_sandi = 'swiperstore_dev';

try {
    $pdo = new PDO(
        "pgsql:host={$db_host};port={$db_port};dbname={$db_nama}",
        $db_pengguna,
        $db_sandi,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ],
    );
    $pdo->exec("SET TIME ZONE 'Asia/Jakarta'");
} catch (PDOException $e) {
    error_log('Koneksi database gagal: ' . $e->getMessage());

    if (defined('MODE_HEALTH')) {
        throw $e;
    }

    if (PHP_SAPI !== 'cli') {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
    }

    exit('Layanan sedang tidak tersedia.');
}
