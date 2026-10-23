<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/akun.php';

$admin = wajib_admin();

if (!is_post()) {
    http_response_code(405);
    header('Allow: POST');
    exit('Metode tidak diizinkan.');
}

if (!csrf_valid()) {
    http_response_code(400);
    exit('Sesi formulir tidak valid.');
}

$id = (int) ($_POST['id'] ?? $_GET['id'] ?? 0);
$akun = $id > 0 ? ambil_akun($pdo, $id) : null;

if ($akun === null) {
    flash('gagal', 'Akun tidak ditemukan.');
    redirect('/admin');
}

$terjual = input($_POST, 'terjual') === '1';
atur_terjual($pdo, $id, $terjual);

flash(
    'sukses',
    'Akun ' . $akun['kode'] . ($terjual ? ' ditandai terjual.' : ' ditandai tersedia.'),
);
redirect('/admin');
