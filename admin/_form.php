<?php
declare(strict_types=1);

if (!defined('APP_MULAI')) {
    http_response_code(404);
    exit;
}

$ringkasan_error = [
    'judul' => ['label' => 'Judul akun', 'pesan' => $errors['judul'] ?? null],
    'harga' => ['label' => 'Harga', 'pesan' => $errors['harga'] ?? null],
    'tautan_video' => ['label' => 'URL video', 'pesan' => $errors['tautan_video'] ?? null],
    'deskripsi' => ['label' => 'Deskripsi', 'pesan' => $errors['deskripsi'] ?? null],
    'gambar' => ['label' => 'Thumbnail', 'pesan' => $errors['gambar'] ?? null],
];
$ringkasan_error = array_filter($ringkasan_error, static fn (array $item): bool => $item['pesan'] !== null);
?>
<form action="<?= e($aksi) ?>" method="post" enctype="multipart/form-data" class="form-akun">
    <?= csrf_field() ?>

    <?php if ($ringkasan_error !== []): ?>
        <div class="ringkasan-error" role="alert" tabindex="-1" id="ringkasan-error">
            <p class="ringkasan-error__judul"><?= count($ringkasan_error) ?> isian perlu diperbaiki.</p>
            <ul>
                <?php foreach ($ringkasan_error as $nama => $item): ?>
                    <li><a href="#<?= e($nama) ?>"><?= e($item['label']) ?>: <?= e($item['pesan']) ?></a></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>

    <div class="bidang">
        <label for="judul">Judul akun</label>
        <input
            id="judul"
            name="judul"
            type="text"
            required
            minlength="3"
            maxlength="100"
            value="<?= e($nilai['judul']) ?>"
            placeholder="Contoh: Akun M416 Glacier Rank Conqueror"
            <?= isset($errors['judul']) ? 'aria-invalid="true" aria-describedby="judul-error"' : '' ?>
        >
        <?php if (isset($errors['judul'])): ?>
            <p class="galat-bidang" id="judul-error"><?= e($errors['judul']) ?></p>
        <?php endif; ?>
    </div>

    <div class="form-grid">
        <div class="bidang">
            <label for="harga">Harga (Rp)</label>
            <input
                id="harga"
                name="harga"
                type="number"
                required
                min="1"
                max="1000000000"
                step="1"
                inputmode="numeric"
                value="<?= e((string) $nilai['harga']) ?>"
                placeholder="1500000"
                <?= isset($errors['harga']) ? 'aria-invalid="true" aria-describedby="harga-error"' : 'aria-describedby="harga-petunjuk"' ?>
            >
            <p class="petunjuk" id="harga-petunjuk">Tulis angka tanpa titik atau koma. Contoh: 1500000</p>
            <?php if (isset($errors['harga'])): ?>
                <p class="galat-bidang" id="harga-error"><?= e($errors['harga']) ?></p>
            <?php endif; ?>
        </div>

        <div class="bidang">
            <label for="tautan_video">URL video</label>
            <input
                id="tautan_video"
                name="tautan_video"
                type="url"
                required
                maxlength="2048"
                value="<?= e($nilai['tautan_video']) ?>"
                placeholder="https://www.youtube.com/watch?v=..."
                <?= isset($errors['tautan_video']) ? 'aria-invalid="true" aria-describedby="tautan_video-error"' : 'aria-describedby="tautan_video-petunjuk"' ?>
            >
            <p class="petunjuk" id="tautan_video-petunjuk">YouTube, TikTok, atau Google Drive. Tempel URL lengkap.</p>
            <?php if (isset($errors['tautan_video'])): ?>
                <p class="galat-bidang" id="tautan_video-error"><?= e($errors['tautan_video']) ?></p>
            <?php endif; ?>
        </div>
    </div>

    <div class="bidang">
        <label for="deskripsi">Deskripsi</label>
        <textarea
            id="deskripsi"
            name="deskripsi"
            required
            minlength="10"
            maxlength="5000"
            rows="6"
            placeholder="Skin, rank, dan detail penting akun."
            <?= isset($errors['deskripsi']) ? 'aria-invalid="true" aria-describedby="deskripsi-error"' : 'aria-describedby="deskripsi-petunjuk"' ?>
        ><?= e($nilai['deskripsi']) ?></textarea>
        <p class="petunjuk" id="deskripsi-petunjuk">Minimal 10 karakter, maksimal 5.000 karakter.</p>
        <?php if (isset($errors['deskripsi'])): ?>
            <p class="galat-bidang" id="deskripsi-error"><?= e($errors['deskripsi']) ?></p>
        <?php endif; ?>
    </div>

    <div class="bidang">
        <label for="gambar">Thumbnail</label>
        <div class="gambar-bidang">
            <div class="gambar-pratinjau-bingkai<?= !empty($jalur_gambar) ? ' gambar-pratinjau-bingkai--terisi' : '' ?>">
                <?php if (!empty($jalur_gambar)): ?>
                    <img
                        src="<?= e(url_media($jalur_gambar)) ?>"
                        alt="Pratinjau thumbnail akun"
                        class="gambar-pratinjau"
                    >
                <?php endif; ?>
                <div class="gambar-pratinjau-kosong" <?= !empty($jalur_gambar) ? 'hidden' : '' ?>>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="16" rx="2"/>
                        <circle cx="8.5" cy="9.5" r="1.5"/>
                        <path d="m4 17 4.5-4.5 3 3L15 12l5 5"/>
                    </svg>
                    <span class="gambar-pratinjau-kosong__judul">Belum ada thumbnail</span>
                    <span class="gambar-pratinjau-kosong__teks">Pilih foto untuk melihat pratinjau.</span>
                </div>
            </div>
            <div class="gambar-input">
                <input
                    id="gambar"
                    name="gambar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    <?= !empty($gambar_wajib) ? 'required' : '' ?>
                    <?= isset($errors['gambar']) ? 'aria-invalid="true" aria-describedby="gambar-error"' : 'aria-describedby="gambar-petunjuk"' ?>
                >
                <p class="petunjuk" id="gambar-petunjuk">
                    JPG, PNG, atau WebP. Maksimal 8 MB, otomatis dikonversi ke WebP.
                    <?= !empty($jalur_gambar) ? 'Biarkan kosong jika tidak ingin mengganti.' : '' ?>
                </p>
                <?php if (isset($errors['gambar'])): ?>
                    <p class="galat-bidang" id="gambar-error"><?= e($errors['gambar']) ?></p>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <?php if ($mode === 'edit'): ?>
        <label class="centang">
            <input type="checkbox" name="terjual" value="1" <?= $nilai['terjual'] ? 'checked' : '' ?>>
            <span>Tandai sebagai terjual</span>
        </label>
    <?php endif; ?>

    <div class="form-aksi">
        <button type="submit" class="tombol tombol--emas"><?= $mode === 'edit' ? 'Simpan perubahan' : 'Tambah akun' ?></button>
        <a href="/admin" class="tombol tombol--garis">Batal</a>
    </div>
</form>
