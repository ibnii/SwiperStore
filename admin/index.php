<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/akun.php';

$admin = wajib_admin();
$status = normalkan_status(input($_GET, 'status', 'semua'));
$hasil = daftar_akun_admin($pdo, [
    'status' => $status,
    'halaman' => normalkan_halaman(input($_GET, 'page', '1')),
]);

function tautan_admin(string $status, int $halaman = 1): string
{
    $kueri = [];

    if ($status !== 'semua') {
        $kueri['status'] = $status;
    }

    if ($halaman > 1) {
        $kueri['page'] = (string) $halaman;
    }

    return '/admin' . ($kueri === [] ? '' : '?' . http_build_query($kueri));
}

$total_semua = $hasil['jumlah_tersedia'] + $hasil['jumlah_terjual'];
$mulai = $hasil['total'] > 0 ? (($hasil['halaman'] - 1) * AKUN_ADMIN_PER_HALAMAN) + 1 : 0;
$selesai = min($hasil['halaman'] * AKUN_ADMIN_PER_HALAMAN, $hasil['total']);

$tab = [
    'semua' => ['label' => 'Semua', 'jumlah' => $total_semua],
    'tersedia' => ['label' => 'Tersedia', 'jumlah' => $hasil['jumlah_tersedia']],
    'terjual' => ['label' => 'Terjual', 'jumlah' => $hasil['jumlah_terjual']],
];

$judul_halaman = 'Katalog Akun — Swiper Store';
$area_admin = true;
$gaya = ['admin'];
$skrip = ['admin'];

require __DIR__ . '/../includes/header.php';
?>
<main id="konten" class="wadah admin-utama">
    <div class="admin-kepala">
        <div>
            <h1>Katalog akun</h1>
            <p>Pantau stok dan perbarui status akun.</p>
        </div>
        <?php if ($total_semua > 0): ?>
            <a href="/admin/akun/baru" class="tombol tombol--emas">+ Tambah akun</a>
        <?php endif; ?>
    </div>

    <?php tampil_flash(); ?>

    <?php if ($total_semua > 0): ?>
        <section class="stok" aria-label="Ringkasan stok">
            <p class="stok__total"><span>Total</span><strong><?= $total_semua ?></strong></p>
            <progress
                class="stok__meter"
                value="<?= $hasil['jumlah_tersedia'] ?>"
                max="<?= $total_semua ?>"
                aria-label="<?= $hasil['jumlah_tersedia'] ?> dari <?= $total_semua ?> akun tersedia"
            ><?= $hasil['jumlah_tersedia'] ?> dari <?= $total_semua ?></progress>
            <dl class="stok__rincian">
                <div><dt><span class="titik titik--tersedia"></span>Tersedia</dt><dd><?= $hasil['jumlah_tersedia'] ?></dd></div>
                <div><dt><span class="titik titik--terjual"></span>Terjual</dt><dd><?= $hasil['jumlah_terjual'] ?></dd></div>
            </dl>
        </section>

        <nav class="filter" aria-label="Filter status">
            <?php foreach ($tab as $nilai => $item): ?>
                <a
                    href="<?= e(tautan_admin($nilai)) ?>"
                    class="filter__tab<?= $status === $nilai ? ' filter__tab--aktif' : '' ?>"
                    <?= $status === $nilai ? 'aria-current="page"' : '' ?>
                ><?= e($item['label']) ?> <span><?= $item['jumlah'] ?></span></a>
            <?php endforeach; ?>
        </nav>
    <?php endif; ?>

    <?php if ($hasil['items'] === []): ?>
        <section class="kosong kosong--admin">
            <svg class="kosong__ikon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">
                <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h4l1.6 2h7.4A1.5 1.5 0 0 1 20 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/>
                <path d="M4 10h16"/>
            </svg>
            <?php if ($total_semua === 0): ?>
                <h2 class="kosong__judul">Katalog masih kosong</h2>
                <p class="kosong__teks">Tambahkan akun pertama supaya pembeli bisa melihat stok yang tersedia.</p>
                <a href="/admin/akun/baru" class="tombol tombol--emas">Tambah akun</a>
            <?php else: ?>
                <h2 class="kosong__judul">Tidak ada akun di filter ini</h2>
                <p class="kosong__teks">Coba pilih filter lain atau lihat semua akun yang tersedia.</p>
                <a href="/admin" class="tombol tombol--garis">Lihat semua akun</a>
            <?php endif; ?>
        </section>
    <?php else: ?>
        <section class="daftar" aria-label="Daftar akun">
            <div class="daftar__kepala" aria-hidden="true">
                <span>Akun</span><span>Harga</span><span>Status</span><span>Aksi</span>
            </div>
            <ul>
                <?php foreach ($hasil['items'] as $akun): ?>
                    <li class="baris<?= $akun['terjual'] ? ' baris--terjual' : '' ?>">
                        <a class="baris__akun" href="/admin/akun/<?= $akun['id'] ?>/edit">
                            <img
                                class="baris__gambar"
                                src="<?= e(url_media($akun['jalur_gambar'])) ?>"
                                alt=""
                                width="64"
                                height="44"
                                loading="lazy"
                            >
                            <span class="baris__teks">
                                <span class="baris__judul"><?= e($akun['judul']) ?></span>
                                <span class="baris__kode"><?= e($akun['kode']) ?></span>
                            </span>
                        </a>
                        <p class="baris__harga"><?= e(rupiah($akun['harga'])) ?></p>
                        <p class="baris__status <?= $akun['terjual'] ? 'baris__status--terjual' : 'baris__status--tersedia' ?>">
                            <span class="titik <?= $akun['terjual'] ? 'titik--terjual' : 'titik--tersedia' ?>"></span>
                            <?= $akun['terjual'] ? 'Terjual' : 'Tersedia' ?>
                        </p>
                        <div class="baris__aksi">
                            <form action="/admin/akun/<?= $akun['id'] ?>/status" method="post">
                                <?= csrf_field() ?>
                                <input type="hidden" name="terjual" value="<?= $akun['terjual'] ? '0' : '1' ?>">
                                <button type="submit" class="tombol-status">
                                    <?= $akun['terjual'] ? 'Tandai tersedia' : 'Tandai terjual' ?>
                                </button>
                            </form>
                            <details class="menu">
                                <summary aria-label="Aksi lain untuk <?= e($akun['kode']) ?>">
                                    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                        <circle cx="3" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="13" cy="8" r="1.3"/>
                                    </svg>
                                </summary>
                                <div class="menu__isi">
                                    <a href="/admin/akun/<?= $akun['id'] ?>/edit">Edit akun</a>
                                    <a href="/admin/akun/<?= $akun['id'] ?>/hapus" class="menu__hapus">Hapus akun</a>
                                </div>
                            </details>
                        </div>
                    </li>
                <?php endforeach; ?>
            </ul>
        </section>

        <nav class="paginasi" aria-label="Paginasi katalog">
            <p class="paginasi__info">Menampilkan <?= $mulai ?>–<?= $selesai ?> dari <?= $hasil['total'] ?> akun</p>
            <div class="paginasi__tombol">
                <?php if ($hasil['halaman'] > 1): ?>
                    <a href="<?= e(tautan_admin($status, $hasil['halaman'] - 1)) ?>" class="tombol tombol--garis">Sebelumnya</a>
                <?php else: ?>
                    <span class="tombol tombol--garis tombol--nonaktif" aria-disabled="true">Sebelumnya</span>
                <?php endif; ?>

                <?php if ($hasil['halaman'] < $hasil['total_halaman']): ?>
                    <a href="<?= e(tautan_admin($status, $hasil['halaman'] + 1)) ?>" class="tombol tombol--garis">Berikutnya</a>
                <?php else: ?>
                    <span class="tombol tombol--garis tombol--nonaktif" aria-disabled="true">Berikutnya</span>
                <?php endif; ?>
            </div>
        </nav>
    <?php endif; ?>
</main>
<?php require __DIR__ . '/../includes/footer.php'; ?>
