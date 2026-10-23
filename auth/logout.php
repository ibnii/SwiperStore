<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

if (!is_post()) {
    http_response_code(405);
    header('Allow: POST');
    exit('Metode tidak diizinkan.');
}

if (!csrf_valid()) {
    http_response_code(400);
    exit('Sesi formulir tidak valid.');
}

sesi_akhiri($pdo);
flash('info', 'Kamu sudah keluar dari panel admin.');
redirect('/admin/login');
