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

$judul_halaman = 'Kelola Katalog — Swiper Store';
$area_admin = true;
$gaya = ['admin'];

require __DIR__ . '/../includes/header.php';
?>
<main id="konten" class="wadah admin-utama">
    <div class="admin-kepala">
        <div>
            <h1>Kelola Katalog</h1>
            <p>Tambah akun baru, perbarui detail, atau tandai akun yang sudah terjual.</p>
        </div>
        <a href="/admin/akun/baru" class="tombol tombol--emas">+ Tambah listing</a>
    </div>

    <?php tampil_flash(); ?>

    <dl class="statistik">
        <div><dt>Tersedia</dt><dd><?= $hasil['jumlah_tersedia'] ?></dd></div>
        <div><dt>Terjual</dt><dd><?= $hasil['jumlah_terjual'] ?></dd></div>
        <div><dt>Total</dt><dd><?= $hasil['jumlah_tersedia'] + $hasil['jumlah_terjual'] ?></dd></div>
    </dl>

    <nav class="tab-filter" aria-label="Filter status">
        <?php
        $tab = [
            'semua' => ['label' => 'Semua', 'jumlah' => $hasil['jumlah_tersedia'] + $hasil['jumlah_terjual']],
            'tersedia' => ['label' => 'Tersedia', 'jumlah' => $hasil['jumlah_tersedia']],
            'terjual' => ['label' => 'Terjual', 'jumlah' => $hasil['jumlah_terjual']],
        ];
        ?>
        <?php foreach ($tab as $nilai => $item): ?>
            <a
                href="<?= e(tautan_admin($nilai)) ?>"
                class="tab-filter__tautan<?= $status === $nilai ? ' tab-filter__tautan--aktif' : '' ?>"
                <?= $status === $nilai ? 'aria-current="page"' : '' ?>
            ><?= e($item['label']) ?> (<?= $item['jumlah'] ?>)</a>
        <?php endforeach; ?>
    </nav>

    <?php if ($hasil['items'] === []): ?>
        <div class="kosong">
            <p class="kosong__judul">
                <?= $status === 'semua' ? 'Belum ada listing.' : 'Tidak ada listing di filter ini.' ?>
            </p>
            <p class="kosong__teks">
                <?= $status === 'semua'
                    ? 'Tambahkan akun pertama untuk mulai mengisi katalog.'
                    : 'Coba pilih filter lain.' ?>
            </p>
        </div>
    <?php else: ?>
        <div class="tabel-bungkus">
            <table class="tabel-akun">
                <caption class="sr-only">Daftar listing, halaman <?= $hasil['halaman'] ?> dari <?= $hasil['total_halaman'] ?></caption>
                <thead>
                    <tr>
                        <th scope="col">Akun</th>
                        <th scope="col">Harga</th>
                        <th scope="col">Status</th>
                        <th scope="col">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($hasil['items'] as $akun): ?>
                        <tr>
                            <td>
                                <div class="sel-akun">
                                    <img src="<?= e(url_media($akun['jalur_gambar'])) ?>" alt="Thumbnail <?= e($akun['kode']) ?>" loading="lazy">
                                    <div>
                                        <p class="sel-akun__kode"><?= e($akun['kode']) ?></p>
                                        <p class="sel-akun__judul"><?= e($akun['judul']) ?></p>
                                    </div>
                                </div>
                            </td>
                            <td class="tabular"><?= e(rupiah($akun['harga'])) ?></td>
                            <td>
                                <span class="lencana <?= $akun['terjual'] ? 'lencana--terjual' : 'lencana--tersedia' ?>">
                                    <span aria-hidden="true" class="lencana__titik"></span>
                                    <?= $akun['terjual'] ? 'Terjual' : 'Tersedia' ?>
                                </span>
                            </td>
                            <td>
                                <div class="aksi-baris">
                                    <a href="/admin/akun/<?= $akun['id'] ?>/edit" class="tombol tombol--garis tombol--kecil">Edit</a>

                                    <form action="/admin/akun/<?= $akun['id'] ?>/status" method="post">
                                        <?= csrf_field() ?>
                                        <input type="hidden" name="terjual" value="<?= $akun['terjual'] ? '0' : '1' ?>">
                                        <button type="submit" class="tombol tombol--garis tombol--kecil">
                                            <?= $akun['terjual'] ? 'Tandai tersedia' : 'Tandai terjual' ?>
                                        </button>
                                    </form>

                                    <a href="/admin/akun/<?= $akun['id'] ?>/hapus" class="tombol tombol--bahaya tombol--kecil">Hapus</a>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <ul class="daftar-admin-mobile">
            <?php foreach ($hasil['items'] as $akun): ?>
                <li class="kartu-admin">
                    <div class="kartu-admin__atas">
                        <img src="<?= e(url_media($akun['jalur_gambar'])) ?>" alt="Thumbnail <?= e($akun['kode']) ?>" loading="lazy">
                        <div>
                            <p class="sel-akun__kode"><?= e($akun['kode']) ?></p>
                            <p class="sel-akun__judul"><?= e($akun['judul']) ?></p>
                            <p class="kartu-admin__harga"><?= e(rupiah($akun['harga'])) ?></p>
                        </div>
                    </div>
                    <div class="kartu-admin__status">
                        <span class="lencana <?= $akun['terjual'] ? 'lencana--terjual' : 'lencana--tersedia' ?>">
                            <span aria-hidden="true" class="lencana__titik"></span>
                            <?= $akun['terjual'] ? 'Terjual' : 'Tersedia' ?>
                        </span>
                    </div>
                    <div class="aksi-baris">
                        <a href="/admin/akun/<?= $akun['id'] ?>/edit" class="tombol tombol--garis tombol--kecil">Edit</a>
                        <form action="/admin/akun/<?= $akun['id'] ?>/status" method="post">
                            <?= csrf_field() ?>
                            <input type="hidden" name="terjual" value="<?= $akun['terjual'] ? '0' : '1' ?>">
                            <button type="submit" class="tombol tombol--garis tombol--kecil">
                                <?= $akun['terjual'] ? 'Tandai tersedia' : 'Tandai terjual' ?>
                            </button>
                        </form>
                        <a href="/admin/akun/<?= $akun['id'] ?>/hapus" class="tombol tombol--bahaya tombol--kecil">Hapus</a>
                    </div>
                </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>

    <?php if ($hasil['total_halaman'] > 1): ?>
        <nav class="paginasi" aria-label="Pagination listing admin">
            <?php if ($hasil['halaman'] > 1): ?>
                <a href="<?= e(tautan_admin($status, $hasil['halaman'] - 1)) ?>" class="tombol tombol--garis">Sebelumnya</a>
            <?php else: ?>
                <span aria-hidden="true" class="paginasi__kosong"></span>
            <?php endif; ?>

            <p>Halaman <?= $hasil['halaman'] ?> dari <?= $hasil['total_halaman'] ?></p>

            <?php if ($hasil['halaman'] < $hasil['total_halaman']): ?>
                <a href="<?= e(tautan_admin($status, $hasil['halaman'] + 1)) ?>" class="tombol tombol--garis">Berikutnya</a>
            <?php else: ?>
                <span aria-hidden="true" class="paginasi__kosong"></span>
            <?php endif; ?>
        </nav>
    <?php endif; ?>
</main>
<?php require __DIR__ . '/../includes/footer.php'; ?>
