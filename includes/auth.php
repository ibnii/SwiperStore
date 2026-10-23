<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

function wajib_admin(): array
{
    global $pdo;

    $admin = sesi_admin_saat_ini($pdo);

    if ($admin === null) {
        $tujuan = $_SERVER['REQUEST_URI'] ?? '/admin';
        $_SESSION['tujuan_setelah_masuk'] = $tujuan;
        redirect('/admin/login');
    }

    return $admin;
}
