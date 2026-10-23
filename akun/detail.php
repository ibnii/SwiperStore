<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/akun.php';
require_once __DIR__ . '/../includes/whatsapp.php';

$kode = input($_GET, 'kode');
$akun = $kode !== '' ? ambil_akun_publik($pdo, $kode) : null;

if ($akun === null) {
    require __DIR__ . '/../404.php';
    exit;
}

$video = video_tersemat($akun['penyedia_video'], $akun['tautan_video']);
$whatsapp = url_wa(NOMOR_WHATSAPP, $akun['kode']);
$deskripsi_meta = potong_teks($akun['deskripsi'], 160);

$judul_halaman = $akun['kode'] . ' · ' . $akun['judul'] . ' — Swiper Store';
$deskripsi_halaman = $deskripsi_meta;
$og_gambar = URL_APLIKASI . url_media($akun['jalur_gambar']);
$og_gambar_alt = $akun['judul'];
$gaya = ['detail'];

require __DIR__ . '/../includes/header.php';
?>
<main id="konten" class="wadah halaman-detail">
    <a href="/" class="tautan-kembali">Kembali ke katalog</a>

    <div class="detail-grid">
        <div class="detail-video">
            <?php if ($video !== null): ?>
                <div class="video-bingkai">
                    <iframe
                        src="<?= e($video['sematan']) ?>"
                        title="Video <?= e($akun['kode']) ?>"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerpolicy="strict-origin-when-cross-origin"
                        allowfullscreen
                    ></iframe>
                </div>
                <p class="video-catatan">
                    Video tidak muncul?
                    <a href="<?= e($video['tautan']) ?>" target="_blank" rel="noopener noreferrer">
                        Buka di <?= e(label_penyedia($video['penyedia'])) ?>
                    </a>
                </p>
            <?php else: ?>
                <div class="video-kosong">
                    <p>Video tidak dapat ditampilkan. Hubungi kami lewat WhatsApp untuk melihat detail akun ini.</p>
                </div>
            <?php endif; ?>
        </div>

        <aside class="panel-detail">
            <div class="panel-detail__atas">
                <p class="panel-detail__kode"><?= e($akun['kode']) ?></p>
                <span class="lencana <?= $akun['terjual'] ? 'lencana--terjual' : 'lencana--tersedia' ?>">
                    <span aria-hidden="true" class="lencana__titik"></span>
                    <?= $akun['terjual'] ? 'Terjual' : 'Tersedia' ?>
                </span>
            </div>

            <h1 class="panel-detail__judul"><?= e($akun['judul']) ?></h1>
            <p class="panel-detail__harga"><?= e(rupiah($akun['harga'])) ?></p>

            <?php if ($akun['terjual']): ?>
                <button type="button" class="tombol tombol--mati tombol--lebar" disabled>Sudah terjual</button>
            <?php else: ?>
                <a
                    href="<?= e($whatsapp) ?>"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="tombol tombol--emas tombol--lebar"
                    data-testid="whatsapp-cta"
                >Beli via WhatsApp</a>
            <?php endif; ?>

            <p class="panel-detail__bantuan">
                <?= $akun['terjual']
                    ? 'Akun ini sudah terjual. Hubungi kami untuk akun serupa.'
                    : 'Klik tombol di atas untuk chat admin dan menyelesaikan pembelian.' ?>
            </p>

            <dl class="rincian">
                <div><dt>Kode akun</dt><dd><?= e($akun['kode']) ?></dd></div>
                <div><dt>Status</dt><dd><?= $akun['terjual'] ? 'Terjual' : 'Tersedia' ?></dd></div>
                <div><dt>Pembayaran</dt><dd>Transfer / e-wallet</dd></div>
            </dl>
        </aside>

        <section class="deskripsi-panel">
            <h2>Deskripsi</h2>
            <p class="deskripsi-teks"><?= e($akun['deskripsi']) ?></p>
        </section>
    </div>
</main>

<div class="cta-lengket" data-testid="sticky-cta">
    <div class="wadah cta-lengket__isi">
        <div class="cta-lengket__info">
            <p class="cta-lengket__kode"><?= e($akun['kode']) ?></p>
            <p class="cta-lengket__harga"><?= e(rupiah($akun['harga'])) ?></p>
        </div>
        <?php if ($akun['terjual']): ?>
            <button type="button" class="tombol tombol--mati" disabled>Sudah terjual</button>
        <?php else: ?>
            <a
                href="<?= e($whatsapp) ?>"
                target="_blank"
                rel="noopener noreferrer"
                class="tombol tombol--emas"
                data-testid="sticky-whatsapp-cta"
            >Beli via WhatsApp</a>
        <?php endif; ?>
    </div>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
<div aria-hidden="true" class="ruang-cta-mobile"></div>
