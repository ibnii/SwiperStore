<?php
declare(strict_types=1);

const BATAS_LOGIN_IP = 5;
const BATAS_LOGIN_EMAIL = 10;
const BATAS_LOGIN_MENIT = 15;

function batas_login_email(string $email): string
{
    return mb_strtolower(trim($email), 'UTF-8');
}

function batas_login_ip(): string
{
    return mb_substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

function batas_login_tersisa(PDO $pdo, string $email, string $ip): int
{
    $email = batas_login_email($email);

    try {
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) AS jumlah FROM percobaan_login
             WHERE ip = ? AND dibuat_pada > CURRENT_TIMESTAMP - INTERVAL '15 minutes'",
        );
        $stmt->execute([$ip]);
        $jumlah_ip = (int) $stmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT COUNT(*) AS jumlah FROM percobaan_login
             WHERE email = ? AND dibuat_pada > CURRENT_TIMESTAMP - INTERVAL '15 minutes'",
        );
        $stmt->execute([$email]);
        $jumlah_email = (int) $stmt->fetchColumn();

        $sisa = 0;

        if ($jumlah_ip >= BATAS_LOGIN_IP) {
            $stmt = $pdo->prepare(
                "SELECT EXTRACT(EPOCH FROM (dibuat_pada + INTERVAL '15 minutes' - CURRENT_TIMESTAMP))
                 FROM percobaan_login
                 WHERE ip = ? AND dibuat_pada > CURRENT_TIMESTAMP - INTERVAL '15 minutes'
                 ORDER BY dibuat_pada DESC OFFSET 4 LIMIT 1",
            );
            $stmt->execute([$ip]);
            $sisa = max($sisa, (int) ceil((float) $stmt->fetchColumn()));
        }

        if ($jumlah_email >= BATAS_LOGIN_EMAIL) {
            $stmt = $pdo->prepare(
                "SELECT EXTRACT(EPOCH FROM (dibuat_pada + INTERVAL '15 minutes' - CURRENT_TIMESTAMP))
                 FROM percobaan_login
                 WHERE email = ? AND dibuat_pada > CURRENT_TIMESTAMP - INTERVAL '15 minutes'
                 ORDER BY dibuat_pada DESC OFFSET 9 LIMIT 1",
            );
            $stmt->execute([$email]);
            $sisa = max($sisa, (int) ceil((float) $stmt->fetchColumn()));
        }

        return max(0, $sisa);
    } catch (Throwable $e) {
        error_log('Pembatas login tidak tersedia: ' . $e->getMessage());

        return 0;
    }
}

function catat_login_gagal(PDO $pdo, string $email, string $ip): void
{
    try {
        $pdo->prepare('INSERT INTO percobaan_login (email, ip) VALUES (?, ?)')
            ->execute([batas_login_email($email), $ip]);
        $pdo->exec("DELETE FROM percobaan_login WHERE dibuat_pada < CURRENT_TIMESTAMP - INTERVAL '1 day'");
    } catch (Throwable $e) {
        error_log('Gagal mencatat percobaan login: ' . $e->getMessage());
    }
}

function bersihkan_login_gagal(PDO $pdo, string $email, string $ip): void
{
    try {
        $pdo->prepare('DELETE FROM percobaan_login WHERE email = ? OR ip = ?')
            ->execute([batas_login_email($email), $ip]);
    } catch (Throwable $e) {
        error_log('Gagal membersihkan percobaan login: ' . $e->getMessage());
    }
}

function pesan_batas_login(int $sisa): string
{
    $menit = max(1, (int) ceil($sisa / 60));

    return 'Terlalu banyak percobaan masuk. Coba lagi dalam ' . $menit . ' menit.';
}
