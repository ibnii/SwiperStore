<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/akun.php';

$admin = wajib_admin();
$id = (int) ($_POST['id'] ?? $_GET['id'] ?? 0);
$akun = $id > 0 ? ambil_akun($pdo, $id) : null;

if ($akun === null) {
    require __DIR__ . '/../404.php';
    exit;
}

$error = null;

if (is_post()) {
    if (!csrf_valid()) {
        http_response_code(400);
        $error = 'Sesi formulir tidak valid. Muat ulang halaman lalu coba lagi.';
    } else {
        try {
            hapus_akun($pdo, $id);
            flash('sukses', 'Akun ' . $akun['kode'] . ' berhasil dihapus.');
            redirect('/admin');
        } catch (Throwable $e) {
            error_log('Gagal menghapus akun: ' . $e->getMessage());
            $error = 'Akun gagal dihapus. Coba lagi.';
        }
    }
}

$judul_halaman = 'Hapus ' . $akun['kode'] . ' — Swiper Store';
$area_admin = true;
$gaya = ['admin', 'form'];

require __DIR__ . '/../includes/header.php';
?>
<main id="konten" class="wadah admin-utama">
    <a href="/admin" class="tautan-kembali">Kembali ke daftar</a>

    <div class="panel-konfirmasi">
        <h1>Hapus <?= e($akun['kode']) ?>?</h1>
        <p>Akun ini akan dihapus permanen dari katalog. Thumbnail dipindahkan ke folder trash selama 7 hari.</p>

        <div class="konfirmasi-akun">
            <img src="<?= e(url_media($akun['jalur_gambar'])) ?>" alt="Thumbnail <?= e($akun['kode']) ?>">
            <div>
                <p class="konfirmasi-akun__kode"><?= e($akun['kode']) ?></p>
                <p class="konfirmasi-akun__judul"><?= e($akun['judul']) ?></p>
                <p class="konfirmasi-akun__harga"><?= e(rupiah($akun['harga'])) ?></p>
            </div>
        </div>

        <?php if ($error !== null): ?>
            <p class="pesan pesan--gagal" role="alert"><?= e($error) ?></p>
        <?php endif; ?>

        <form action="/admin/akun/<?= $id ?>/hapus" method="post" class="form-aksi">
            <?= csrf_field() ?>
            <button type="submit" class="tombol tombol--bahaya">Ya, hapus</button>
            <a href="/admin" class="tombol tombol--garis">Batal</a>
        </form>
    </div>
</main>
<?php require __DIR__ . '/../includes/footer.php'; ?>
