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

$nilai = [
    'judul' => $akun['judul'],
    'deskripsi' => $akun['deskripsi'],
    'harga' => (string) $akun['harga'],
    'tautan_video' => $akun['tautan_video'],
    'terjual' => $akun['terjual'],
];
$errors = [];
$error_umum = null;

if (is_post()) {
    if (post_terlalu_besar()) {
        $error_umum = 'Ukuran gambar melebihi batas 8 MB.';
    } else {
        $nilai = [
            'judul' => input($_POST, 'judul'),
            'deskripsi' => input($_POST, 'deskripsi'),
            'harga' => input($_POST, 'harga'),
            'tautan_video' => input($_POST, 'tautan_video'),
            'terjual' => isset($_POST['terjual']),
        ];

        if (!csrf_valid()) {
            $error_umum = 'Sesi formulir sudah kedaluwarsa. Muat ulang halaman lalu coba lagi.';
        } else {
            $validasi = validasi_akun($_POST);
            $errors = $validasi['errors'];
            $berkas = $_FILES['gambar'] ?? null;
            $ada_gambar = is_array($berkas)
                && (int) ($berkas['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;

            if ($ada_gambar && (int) $berkas['error'] !== UPLOAD_ERR_OK) {
                $errors['gambar'] = galat_upload($berkas);
            }

            if ($errors === []) {
                try {
                    $kode = ubah_akun($pdo, $id, $validasi['data'], $ada_gambar ? $berkas : null);
                    flash('sukses', 'Akun ' . $kode . ' berhasil diperbarui.');
                    redirect('/admin');
                } catch (AkunTidakDitemukan) {
                    require __DIR__ . '/../404.php';
                    exit;
                } catch (RuntimeException $e) {
                    $errors['gambar'] = $e->getMessage();
                } catch (Throwable $e) {
                    error_log('Gagal memperbarui akun: ' . $e->getMessage());
                    $error_umum = 'Perubahan gagal disimpan. Coba lagi.';
                }
            }
        }
    }
}

$judul_halaman = 'Edit ' . $akun['kode'] . ' — Swiper Store';
$area_admin = true;
$gaya = ['admin', 'form'];
$skrip = ['admin'];
$mode = 'edit';
$aksi = '/admin/akun/' . $id . '/edit';
$gambar_wajib = false;
$kode = $akun['kode'];
$jalur_gambar = $akun['jalur_gambar'];

require __DIR__ . '/../includes/header.php';
?>
<main id="konten" class="wadah admin-utama">
    <a href="/admin" class="tautan-kembali">Kembali ke daftar</a>
    <h1 class="judul-halaman">Edit <?= e($akun['kode']) ?></h1>
    <p class="subjudul-halaman">Perbarui detail akun atau ganti thumbnail.</p>

    <?php if ($error_umum !== null): ?>
        <p class="pesan pesan--gagal" role="alert"><?= e($error_umum) ?></p>
    <?php endif; ?>

    <div class="panel-form">
        <?php require __DIR__ . '/_form.php'; ?>
    </div>
</main>
<?php require __DIR__ . '/../includes/footer.php'; ?>
