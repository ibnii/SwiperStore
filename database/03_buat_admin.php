<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../config/koneksi.php';

$email = strtolower(trim((string) ($argv[1] ?? '')));
$sandi = (string) ($argv[2] ?? '');

if ($sandi === '') {
    fwrite(STDOUT, 'Kata sandi admin: ');
    $sandi = trim((string) fgets(STDIN));
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Email tidak valid.\n");
    exit(1);
}

if (mb_strlen($sandi) < 12) {
    fwrite(STDERR, "Kata sandi minimal 12 karakter.\n");
    exit(1);
}

$hash = password_hash($sandi, PASSWORD_ARGON2ID);

$stmt = $pdo->prepare(
    'INSERT INTO admin (email, hash_kata_sandi)
     VALUES (?, ?)
     ON CONFLICT (email) DO UPDATE SET hash_kata_sandi = EXCLUDED.hash_kata_sandi',
);
$stmt->execute([$email, $hash]);

fwrite(STDOUT, "Admin {$email} siap dipakai.\n");
