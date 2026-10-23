<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/akun.php';

$admin = wajib_admin();
$nilai = [
    'judul' => '',
    'deskripsi' => '',
    'harga' => '',
    'tautan_video' => '',
    'terjual' => false,
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

            if (!is_array($berkas) || (int) ($berkas['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
                $errors['gambar'] = 'Thumbnail wajib diunggah.';
            } elseif ((int) $berkas['error'] !== UPLOAD_ERR_OK) {
                $errors['gambar'] = galat_upload($berkas);
            }

            if ($errors === []) {
                try {
                    $kode = simpan_akun($pdo, $validasi['data'], $berkas);
                    flash('sukses', 'Akun ' . $kode . ' berhasil dibuat.');
                    redirect('/admin');
                } catch (RuntimeException $e) {
                    $errors['gambar'] = $e->getMessage();
                } catch (Throwable $e) {
                    error_log('Gagal menyimpan akun: ' . $e->getMessage());
                    $error_umum = 'Akun gagal disimpan. Coba lagi.';
                }
            }
        }
    }
}

$judul_halaman = 'Tambah Akun — Swiper Store';
$area_admin = true;
$gaya = ['admin', 'form'];
$skrip = ['admin'];
$mode = 'tambah';
$aksi = '/admin/akun/baru';
$gambar_wajib = true;
$kode = null;
$jalur_gambar = null;

require __DIR__ . '/../includes/header.php';
?>
<main id="konten" class="wadah admin-utama">
    <a href="/admin" class="tautan-kembali">Kembali ke daftar</a>
    <h1 class="judul-halaman">Tambah akun</h1>
    <p class="subjudul-halaman">Lengkapi detail akun dan unggah thumbnail terbaik.</p>

    <?php if ($error_umum !== null): ?>
        <p class="pesan pesan--gagal" role="alert"><?= e($error_umum) ?></p>
    <?php endif; ?>

    <div class="panel-form">
        <?php require __DIR__ . '/_form.php'; ?>
    </div>
</main>
<?php require __DIR__ . '/../includes/footer.php'; ?>
