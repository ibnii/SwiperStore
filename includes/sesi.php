<?php
declare(strict_types=1);

const SESI_UMUR = 604800;

function permintaan_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function mulai_sesi(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $folder = __DIR__ . '/../storage/sessions';

    if (is_dir($folder) && is_writable($folder)) {
        session_save_path($folder);
    }

    ini_set('session.gc_maxlifetime', (string) SESI_UMUR);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');

    session_name('SWIPERSTORE');
    session_set_cookie_params([
        'lifetime' => SESI_UMUR,
        'path' => '/',
        'secure' => permintaan_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function sesi_mulai(PDO $pdo, int $id_admin): void
{
    $token = bin2hex(random_bytes(32));

    $pdo->prepare('DELETE FROM sesi_admin WHERE kedaluwarsa_pada <= CURRENT_TIMESTAMP')
        ->execute();
    $pdo->prepare(
        "INSERT INTO sesi_admin (id_admin, token_hash, kedaluwarsa_pada)
         VALUES (?, ?, CURRENT_TIMESTAMP + INTERVAL '7 days')",
    )->execute([$id_admin, hash('sha256', $token)]);

    session_regenerate_id(true);
    unset($_SESSION['csrf']);
    $_SESSION['token_sesi'] = $token;
}

function sesi_admin_saat_ini(PDO $pdo): ?array
{
    static $sudah_dicek = false;
    static $admin = null;

    if ($sudah_dicek) {
        return $admin;
    }

    $sudah_dicek = true;
    $token = $_SESSION['token_sesi'] ?? '';

    if (!is_string($token) || $token === '') {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT a.id, a.email
         FROM sesi_admin s
         JOIN admin a ON a.id = s.id_admin
         WHERE s.token_hash = ? AND s.kedaluwarsa_pada > CURRENT_TIMESTAMP
         LIMIT 1',
    );
    $stmt->execute([hash('sha256', $token)]);
    $baris = $stmt->fetch();

    if (!$baris) {
        sesi_akhiri($pdo);
        return null;
    }

    $admin = ['id' => (int) $baris['id'], 'email' => (string) $baris['email']];

    return $admin;
}

function sesi_akhiri(PDO $pdo): void
{
    $token = $_SESSION['token_sesi'] ?? '';

    if (is_string($token) && $token !== '') {
        $pdo->prepare('DELETE FROM sesi_admin WHERE token_hash = ?')
            ->execute([hash('sha256', $token)]);
    }

    unset($_SESSION['token_sesi']);
    session_regenerate_id(true);
}

function sesi_bersihkan_kedaluwarsa(PDO $pdo): void
{
    $pdo->exec('DELETE FROM sesi_admin WHERE kedaluwarsa_pada <= CURRENT_TIMESTAMP');
}
