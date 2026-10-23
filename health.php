<?php
declare(strict_types=1);

define('MODE_HEALTH', true);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    require __DIR__ . '/config/koneksi.php';
    $pdo->query('SELECT 1');
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
} catch (Throwable $e) {
    error_log('Health check gagal: ' . $e->getMessage());
    http_response_code(503);
    echo json_encode(['status' => 'error']);
}
