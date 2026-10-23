<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

http_response_code(404);

$judul_halaman = 'Halaman tidak ditemukan — Swiper Store';
$deskripsi_halaman = 'Halaman yang kamu cari tidak tersedia.';
$gaya = ['katalog'];

require __DIR__ . '/includes/header.php';
?>
<main id="konten" class="wadah halaman-kosong">
    <p class="halaman-kosong__kode">404</p>
    <h1 class="halaman-kosong__judul">Halaman tidak ditemukan.</h1>
    <p class="halaman-kosong__teks">
        Akun atau halaman yang kamu cari sudah dipindahkan atau tidak pernah ada.
    </p>
    <a href="/" class="tombol tombol--emas">Kembali ke katalog</a>
</main>
<?php require __DIR__ . '/includes/footer.php'; ?>
