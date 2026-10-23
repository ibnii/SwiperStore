<?php
declare(strict_types=1);

function e(mixed $nilai): string
{
    return htmlspecialchars((string) $nilai, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function rupiah(int|float|string $angka): string
{
    return 'Rp' . number_format((float) $angka, 0, ',', '.');
}

function aset(string $jalur): string
{
    $bersih = ltrim($jalur, '/');
    $berkas = __DIR__ . '/../assets/' . $bersih;
    $versi = is_file($berkas) ? (string) filemtime($berkas) : '';

    return '/assets/' . $bersih . ($versi !== '' ? '?v=' . $versi : '');
}

function url_media(string $jalur): string
{
    $segmen = array_map('rawurlencode', explode('/', ltrim($jalur, '/')));

    return PREFIX_MEDIA . implode('/', $segmen);
}

function redirect(string $tujuan): never
{
    header('Location: ' . $tujuan, true, 303);
    exit;
}

function is_post(): bool
{
    return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
}

function input(array $sumber, string $kunci, string $bawaan = ''): string
{
    $nilai = $sumber[$kunci] ?? $bawaan;

    return is_string($nilai) ? $nilai : $bawaan;
}

function potong_teks(string $teks, int $maks): string
{
    $teks = trim(preg_replace('/\s+/u', ' ', $teks) ?? $teks);

    return mb_strlen($teks, 'UTF-8') > $maks
        ? rtrim(mb_substr($teks, 0, $maks - 1, 'UTF-8')) . '…'
        : $teks;
}

function kode_akun_valid(string $kode): bool
{
    return preg_match('/^SWP-\d{4,}$/D', $kode) === 1;
}

function flash(string $jenis, string $pesan): void
{
    $_SESSION['flash'][] = ['jenis' => $jenis, 'pesan' => $pesan];
}

function tampil_flash(): void
{
    $daftar = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);

    foreach ($daftar as $item) {
        $jenis = in_array($item['jenis'], ['sukses', 'gagal', 'info'], true)
            ? $item['jenis']
            : 'info';
        $peran = $jenis === 'gagal' ? 'alert' : 'status';

        echo '<p class="pesan pesan--' . e($jenis) . '" role="' . $peran . '">'
            . e($item['pesan']) . '</p>';
    }
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

function csrf_valid(): bool
{
    $token = input($_POST, 'csrf');
    $sesi = $_SESSION['csrf'] ?? '';

    return $sesi !== '' && $token !== '' && hash_equals($sesi, $token);
}

/**
 * Saat POST melebihi post_max_size, PHP mengosongkan $_POST dan $_FILES
 * sehingga token CSRF ikut hilang. Deteksi lewat CONTENT_LENGTH agar
 * pengguna melihat pesan ukuran, bukan pesan sesi kedaluwarsa.
 */
function post_terlalu_besar(): bool
{
    $panjang = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    $nilai = trim((string) ini_get('post_max_size'));

    if ($panjang <= 0 || $nilai === '' || $nilai === '-1' || $nilai === '0') {
        return false;
    }

    $satuan = strtolower(substr($nilai, -1));
    $angka = (int) $nilai;
    $batas = match ($satuan) {
        'g' => $angka * 1024 * 1024 * 1024,
        'm' => $angka * 1024 * 1024,
        'k' => $angka * 1024,
        default => $angka,
    };

    return $batas > 0 && $panjang > $batas;
}

function tautan_kembali(string $bawaan = '/'): string
{
    $referer = $_SERVER['HTTP_REFERER'] ?? '';

    if ($referer === '') {
        return $bawaan;
    }

    $host = parse_url($referer, PHP_URL_HOST);
    $host_sendiri = parse_url(URL_APLIKASI, PHP_URL_HOST);

    return $host === $host_sendiri ? $referer : $bawaan;
}
