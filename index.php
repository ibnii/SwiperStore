<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/akun.php';

$filter = [
    'q' => input($_GET, 'q'),
    'status' => normalkan_status(input($_GET, 'status', 'semua')),
    'sort' => normalkan_sort(input($_GET, 'sort', 'terbaru')),
    'halaman' => normalkan_halaman(input($_GET, 'page', '1')),
];
$hasil = daftar_akun_publik($pdo, $filter);
$ada_filter = $filter['q'] !== '' || $filter['status'] !== 'semua' || $filter['sort'] !== 'terbaru';

$judul_halaman = 'Katalog Akun — Swiper Store';
$deskripsi_halaman = 'Jelajahi akun PUBG premium pilihan Swiper Store. Cari berdasarkan judul, filter status, dan urutkan sesuai kebutuhanmu.';
$gaya = ['katalog'];

function tautan_katalog(array $filter, int $halaman): string
{
    $kueri = [];

    if ($filter['q'] !== '') {
        $kueri['q'] = $filter['q'];
    }

    if ($filter['status'] !== 'semua') {
        $kueri['status'] = $filter['status'];
    }

    if ($filter['sort'] !== 'terbaru') {
        $kueri['sort'] = $filter['sort'];
    }

    if ($halaman > 1) {
        $kueri['page'] = (string) $halaman;
    }

    return '/' . ($kueri === [] ? '' : '?' . http_build_query($kueri));
}

require __DIR__ . '/includes/header.php';
?>
<main id="konten" class="wadah katalog">
    <section class="hero">
        <h1 class="hero__judul">Akun premium, proses cepat.</h1>
        <p class="hero__teks">
            Setiap akun sudah diperiksa dan siap dipakai. Pilih yang cocok,
            lalu hubungi kami lewat WhatsApp.
        </p>
    </section>

    <form action="/" method="get" role="search" class="filter-katalog">
        <div class="filter-katalog__grid">
            <div class="filter-katalog__cari">
                <label for="catalog-q">Cari akun</label>
                <input
                    id="catalog-q"
                    name="q"
                    type="search"
                    value="<?= e($filter['q']) ?>"
                    maxlength="80"
                    placeholder="Contoh: Glacier, Conqueror…"
                >
            </div>

            <div>
                <label for="catalog-status">Status</label>
                <select id="catalog-status" name="status">
                    <option value="semua"<?= $filter['status'] === 'semua' ? ' selected' : '' ?>>Semua akun</option>
                    <option value="tersedia"<?= $filter['status'] === 'tersedia' ? ' selected' : '' ?>>Tersedia</option>
                    <option value="terjual"<?= $filter['status'] === 'terjual' ? ' selected' : '' ?>>Terjual</option>
                </select>
            </div>

            <div>
                <label for="catalog-sort">Urutkan</label>
                <select id="catalog-sort" name="sort">
                    <option value="terbaru"<?= $filter['sort'] === 'terbaru' ? ' selected' : '' ?>>Terbaru</option>
                    <option value="termurah"<?= $filter['sort'] === 'termurah' ? ' selected' : '' ?>>Harga terendah</option>
                    <option value="termahal"<?= $filter['sort'] === 'termahal' ? ' selected' : '' ?>>Harga tertinggi</option>
                </select>
            </div>

            <div class="filter-katalog__aksi">
                <button type="submit" class="tombol tombol--emas">Cari</button>
                <?php if ($ada_filter): ?>
                    <a href="/" class="tombol tombol--garis">Reset</a>
                <?php endif; ?>
            </div>
        </div>
    </form>

    <?php tampil_flash(); ?>

    <?php if ($hasil['items'] === []): ?>
        <div class="kosong">
            <?php if ($ada_filter): ?>
                <p class="kosong__judul">Tidak ada akun yang cocok dengan pencarianmu.</p>
                <p class="kosong__teks">Coba kata kunci lain atau reset filter yang aktif.</p>
                <a href="/" class="tombol tombol--garis">Lihat semua akun</a>
            <?php else: ?>
                <p class="kosong__judul">Belum ada akun yang tersedia.</p>
                <p class="kosong__teks">Akun baru akan muncul di sini setelah ditambahkan lewat panel admin.</p>
            <?php endif; ?>
        </div>
    <?php else: ?>
        <p class="katalog__hitungan"><?= count($hasil['items']) ?> dari <?= $hasil['total'] ?> akun</p>

        <ul class="grid-kartu">
            <?php foreach ($hasil['items'] as $akun): ?>
                <li>
                    <article class="kartu<?= $akun['terjual'] ? ' kartu--terjual' : '' ?>">
                        <a href="/akun/<?= e(rawurlencode($akun['kode'])) ?>" class="kartu__tautan">
                            <div class="kartu__media">
                                <img
                                    src="<?= e(url_media($akun['jalur_gambar'])) ?>"
                                    alt=""
                                    loading="lazy"
                                >
                                <?php if ($akun['terjual']): ?>
                                    <span class="lencana lencana--terjual kartu__lencana">Terjual</span>
                                <?php endif; ?>
                            </div>
                            <div class="kartu__isi">
                                <p class="kartu__kode"><?= e($akun['kode']) ?></p>
                                <h2 class="kartu__judul"><?= e($akun['judul']) ?></h2>
                                <div class="kartu__bawah">
                                    <p class="kartu__harga"><?= e(rupiah($akun['harga'])) ?></p>
                                    <span class="kartu__detail">Lihat detail</span>
                                </div>
                            </div>
                        </a>
                    </article>
                </li>
            <?php endforeach; ?>
        </ul>

        <?php if ($hasil['total_halaman'] > 1): ?>
            <nav aria-label="Pagination katalog" class="paginasi">
                <?php if ($hasil['halaman'] > 1): ?>
                    <a href="<?= e(tautan_katalog($filter, $hasil['halaman'] - 1)) ?>" class="tombol tombol--garis">Sebelumnya</a>
                <?php else: ?>
                    <span aria-hidden="true" class="paginasi__kosong"></span>
                <?php endif; ?>

                <p>Halaman <?= $hasil['halaman'] ?> dari <?= $hasil['total_halaman'] ?></p>

                <?php if ($hasil['halaman'] < $hasil['total_halaman']): ?>
                    <a href="<?= e(tautan_katalog($filter, $hasil['halaman'] + 1)) ?>" class="tombol tombol--garis">Berikutnya</a>
                <?php else: ?>
                    <span aria-hidden="true" class="paginasi__kosong"></span>
                <?php endif; ?>
            </nav>
        <?php endif; ?>
    <?php endif; ?>
</main>
<?php require __DIR__ . '/includes/footer.php'; ?>
