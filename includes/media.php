<?php
declare(strict_types=1);

const MEDIA_MAKS_BYTE = 8 * 1024 * 1024;
const MEDIA_MAKS_PIKSEL = 40000000;
const MEDIA_MAKS_SISI = 1600;
const MEDIA_KUALITAS_WEBP = 80;

function folder_unggahan(): string
{
    return __DIR__ . '/../storage/uploads';
}

function jalur_media_aman(string $relatif): bool
{
    if (!str_starts_with($relatif, 'listings/') || strlen($relatif) > 255) {
        return false;
    }

    if (str_contains($relatif, '\\') || str_contains($relatif, "\0")) {
        return false;
    }

    $segmen = explode('/', $relatif);

    foreach ($segmen as $bagian) {
        if ($bagian === '' || str_starts_with($bagian, '.') || preg_match('/^[A-Za-z0-9._-]+$/D', $bagian) !== 1) {
            return false;
        }
    }

    return str_ends_with($segmen[array_key_last($segmen)], '.webp');
}

function path_gambar_absolut(string $relatif): ?string
{
    if (!jalur_media_aman($relatif)) {
        return null;
    }

    $akar = realpath(folder_unggahan());

    if ($akar === false) {
        return null;
    }

    $path = realpath($akar . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relatif));

    if ($path === false || !str_starts_with($path, $akar . DIRECTORY_SEPARATOR) || !is_file($path)) {
        return null;
    }

    return $path;
}

function galat_upload(array $berkas): string
{
    return match ((int) ($berkas['error'] ?? UPLOAD_ERR_NO_FILE)) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Ukuran gambar melebihi batas 8 MB.',
        UPLOAD_ERR_PARTIAL => 'Gambar gagal diunggah. Coba lagi.',
        UPLOAD_ERR_NO_FILE => 'Thumbnail wajib diunggah.',
        UPLOAD_ERR_NO_TMP_DIR, UPLOAD_ERR_CANT_WRITE, UPLOAD_ERR_EXTENSION => 'Server tidak dapat menyimpan gambar. Coba lagi.',
        default => 'Gambar tidak valid.',
    };
}

function buka_gambar(string $path, int $tipe): GdImage|false
{
    return match ($tipe) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($path),
        IMAGETYPE_PNG => imagecreatefrompng($path),
        IMAGETYPE_WEBP => imagecreatefromwebp($path),
        default => false,
    };
}

function memory_limit_bytes(): int
{
    $nilai = trim((string) ini_get('memory_limit'));

    if ($nilai === '' || $nilai === '-1') {
        return PHP_INT_MAX;
    }

    $satuan = strtolower(substr($nilai, -1));
    $angka = (int) $nilai;

    return match ($satuan) {
        'g' => $angka * 1024 * 1024 * 1024,
        'm' => $angka * 1024 * 1024,
        'k' => $angka * 1024,
        default => $angka,
    };
}

function perbaiki_orientasi(GdImage $gambar, string $path, int $tipe): GdImage
{
    if ($tipe !== IMAGETYPE_JPEG || !function_exists('exif_read_data')) {
        return $gambar;
    }

    $exif = @exif_read_data($path);
    $orientasi = (int) ($exif['Orientation'] ?? 1);

    if ($orientasi === 1) {
        return $gambar;
    }

    $hasil = $gambar;

    if (in_array($orientasi, [2, 4, 5, 7], true)) {
        imageflip($gambar, in_array($orientasi, [2, 5], true) ? IMG_FLIP_HORIZONTAL : IMG_FLIP_VERTICAL);
    }

    $sudut = match ($orientasi) {
        3, 4 => 180,
        5, 6 => -90,
        7, 8 => 90,
        default => 0,
    };

    if ($sudut !== 0) {
        $diputar = imagerotate($gambar, $sudut, 0);

        if ($diputar !== false) {
            $hasil = $diputar;
        }
    }

    return $hasil;
}

function simpan_gambar_akun(array $berkas): array
{
    if (memory_limit_bytes() < 512 * 1024 * 1024) {
        ini_set('memory_limit', '512M');
    }

    $galat = galat_upload($berkas);

    if ((int) ($berkas['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new RuntimeException($galat);
    }

    if ((int) ($berkas['size'] ?? 0) <= 0 || (int) $berkas['size'] > MEDIA_MAKS_BYTE) {
        throw new RuntimeException('Ukuran gambar melebihi batas 8 MB.');
    }

    $tmp = (string) ($berkas['tmp_name'] ?? '');

    if ($tmp === '' || !is_uploaded_file($tmp)) {
        throw new RuntimeException('Gambar tidak valid.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($tmp);

    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        throw new RuntimeException('Format gambar harus JPG, PNG, atau WebP.');
    }

    $info = @getimagesize($tmp);

    if ($info === false) {
        throw new RuntimeException('Gambar tidak dapat dibaca.');
    }

    [$lebar, $tinggi, $tipe] = $info;

    if (!in_array($tipe, [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
        throw new RuntimeException('Format gambar harus JPG, PNG, atau WebP.');
    }

    if ($lebar < 1 || $tinggi < 1 || $lebar * $tinggi > MEDIA_MAKS_PIKSEL) {
        throw new RuntimeException('Resolusi gambar terlalu besar (maksimal 40 megapiksel).');
    }

    $gambar = buka_gambar($tmp, $tipe);

    if ($gambar === false) {
        throw new RuntimeException('Gambar tidak dapat diproses.');
    }

    try {
        $gambar = perbaiki_orientasi($gambar, $tmp, $tipe);

        if ($tipe === IMAGETYPE_PNG || $tipe === IMAGETYPE_WEBP) {
            imagepalettetotruecolor($gambar);
            imagealphablending($gambar, false);
            imagesavealpha($gambar, true);
        }

        $lebar = imagesx($gambar);
        $tinggi = imagesy($gambar);
        $skala = min(1, MEDIA_MAKS_SISI / max($lebar, $tinggi));

        if ($skala < 1) {
            $lebar_baru = max(1, (int) round($lebar * $skala));
            $tinggi_baru = max(1, (int) round($tinggi * $skala));
            $diubah = imagescale($gambar, $lebar_baru, $tinggi_baru, IMG_BILINEAR_FIXED);

            if ($diubah === false) {
                throw new RuntimeException('Gambar gagal diperkecil.');
            }

            $gambar = $diubah;

            if ($tipe === IMAGETYPE_PNG || $tipe === IMAGETYPE_WEBP) {
                imagealphablending($gambar, false);
                imagesavealpha($gambar, true);
            }
        }

        $folder_relatif = 'listings/' . date('Y/m');
        $folder = folder_unggahan() . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $folder_relatif);

        if (!is_dir($folder) && !mkdir($folder, 0750, true) && !is_dir($folder)) {
            throw new RuntimeException('Folder gambar tidak dapat dibuat.');
        }

        $nama = bin2hex(random_bytes(16)) . '.webp';
        $jalur_relatif = $folder_relatif . '/' . $nama;
        $tujuan = $folder . DIRECTORY_SEPARATOR . $nama;
        $sementara = $tujuan . '.tmp';

        if (!imagewebp($gambar, $sementara, MEDIA_KUALITAS_WEBP)) {
            @unlink($sementara);
            throw new RuntimeException('Gambar gagal dikonversi ke WebP.');
        }

        chmod($sementara, 0640);

        if (!rename($sementara, $tujuan)) {
            @unlink($sementara);
            throw new RuntimeException('Gambar gagal disimpan.');
        }

        return ['jalur' => $jalur_relatif, 'path' => $tujuan];
    } finally {
        unset($gambar);
    }
}

function hapus_gambar_akun(string $jalur): void
{
    $path = path_gambar_absolut($jalur);

    if ($path === null) {
        return;
    }

    $folder_trash = __DIR__ . '/../storage/trash';

    if (!is_dir($folder_trash) && !mkdir($folder_trash, 0750, true) && !is_dir($folder_trash)) {
        return;
    }

    $tujuan = $folder_trash . DIRECTORY_SEPARATOR
        . date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '-' . basename($path);

    if (!rename($path, $tujuan)) {
        @unlink($path);
    }
}
