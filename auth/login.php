<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/batas_login.php';

if (sesi_admin_saat_ini($pdo) !== null) {
    redirect('/admin');
}

const HASH_UMPAN = '$argon2id$v=19$m=65536,t=4,p=1$VDVzZm9BdWoxbEpQWWl0bg$qZIV7hvgnq6DoDEP4bIBQhWYNUVyLVX751QuA4qsnbg';

$email = '';
$error = null;
$ip = batas_login_ip();

if (is_post()) {
    $email = batas_login_email(input($_POST, 'email'));
    $sandi = (string) ($_POST['kata_sandi'] ?? '');

    if (!csrf_valid()) {
        $error = 'Sesi formulir sudah kedaluwarsa. Muat ulang halaman lalu coba lagi.';
    } else {
        $sisa = batas_login_tersisa($pdo, $email, $ip);

        if ($sisa > 0) {
            http_response_code(429);
            $error = pesan_batas_login($sisa);
        } elseif ($email === '' || $sandi === '') {
            $error = 'Email dan kata sandi wajib diisi.';
        } else {
            $stmt = $pdo->prepare('SELECT id, hash_kata_sandi FROM admin WHERE email = ? LIMIT 1');
            $stmt->execute([$email]);
            $admin = $stmt->fetch();
            $cocok = password_verify($sandi, $admin['hash_kata_sandi'] ?? HASH_UMPAN);

            if ($admin && $cocok) {
                bersihkan_login_gagal($pdo, $email, $ip);
                sesi_mulai($pdo, (int) $admin['id']);

                $tujuan = $_SESSION['tujuan_setelah_masuk'] ?? '/admin';
                unset($_SESSION['tujuan_setelah_masuk']);

                if (!is_string($tujuan) || !str_starts_with($tujuan, '/admin') || str_starts_with($tujuan, '//')) {
                    $tujuan = '/admin';
                }

                flash('sukses', 'Selamat datang, ' . $email . '.');
                redirect($tujuan);
            }

            catat_login_gagal($pdo, $email, $ip);
            $sisa = batas_login_tersisa($pdo, $email, $ip);

            if ($sisa > 0) {
                http_response_code(429);
                $error = pesan_batas_login($sisa);
            } else {
                http_response_code(401);
                $error = 'Email atau kata sandi salah.';
            }
        }
    }
}

$judul_halaman = 'Masuk Admin — Swiper Store';
require __DIR__ . '/../includes/auth_head.php';
?>
<div class="auth-kartu">
    <a href="/" class="auth-merek">Swiper Store</a>
    <p class="auth-eyebrow">Panel admin</p>
    <h1 class="auth-judul">Masuk</h1>
    <p class="auth-teks">Kelola katalog akun Swiper Store.</p>

    <?php if ($error !== null): ?>
        <p class="pesan pesan--gagal" role="alert"><?= e($error) ?></p>
    <?php endif; ?>

    <form action="/admin/login" method="post" class="auth-form">
        <?= csrf_field() ?>

        <div class="bidang">
            <label for="email">Email</label>
            <input
                id="email"
                name="email"
                type="email"
                value="<?= e($email) ?>"
                required
                autocomplete="username"
                autofocus
            >
        </div>

        <div class="bidang">
            <label for="kata_sandi">Kata sandi</label>
            <input
                id="kata_sandi"
                name="kata_sandi"
                type="password"
                required
                autocomplete="current-password"
            >
        </div>

        <button type="submit" class="tombol tombol--emas tombol--lebar">Masuk</button>
    </form>

    <a href="/" class="auth-kembali">Kembali ke katalog</a>
</div>
<?php require __DIR__ . '/../includes/auth_foot.php'; ?>
