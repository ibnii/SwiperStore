<?php
declare(strict_types=1);

require_once __DIR__ . '/media.php';
require_once __DIR__ . '/video.php';

const AKUN_PER_HALAMAN = 12;
const AKUN_ADMIN_PER_HALAMAN = 20;
const JUDUL_MIN = 3;
const JUDUL_MAKS = 100;
const DESKRIPSI_MIN = 10;
const DESKRIPSI_MAKS = 5000;
const HARGA_MAKS = 1000000000;
const CARI_MAKS = 80;

class AkunTidakDitemukan extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Akun tidak ditemukan.');
    }
}

function escape_like(string $nilai): string
{
    return addcslashes($nilai, '\\%_');
}

function normalkan_status(string $status): string
{
    return in_array($status, ['tersedia', 'terjual'], true) ? $status : 'semua';
}

function normalkan_sort(string $sort): string
{
    return in_array($sort, ['termurah', 'termahal'], true) ? $sort : 'terbaru';
}

function normalkan_halaman(int|string $halaman): int
{
    $angka = (int) $halaman;

    return $angka > 0 ? $angka : 1;
}

function baris_akun(array $baris): array
{
    $baris['id'] = (int) $baris['id'];
    $baris['harga'] = (int) $baris['harga'];
    $baris['terjual'] = $baris['terjual'] === true
        || $baris['terjual'] === 't'
        || $baris['terjual'] === '1'
        || $baris['terjual'] === 1;

    return $baris;
}

function daftar_akun_publik(PDO $pdo, array $filter): array
{
    $cari = mb_substr(trim((string) ($filter['q'] ?? '')), 0, CARI_MAKS, 'UTF-8');
    $status = normalkan_status((string) ($filter['status'] ?? 'semua'));
    $sort = normalkan_sort((string) ($filter['sort'] ?? 'terbaru'));
    $halaman_diminta = normalkan_halaman($filter['halaman'] ?? 1);

    $kondisi = [];
    $parameter = [];

    if ($cari !== '') {
        $kondisi[] = "judul ILIKE ? ESCAPE '\\'";
        $parameter[] = '%' . escape_like($cari) . '%';
    }

    if ($status === 'tersedia') {
        $kondisi[] = 'terjual = FALSE';
    } elseif ($status === 'terjual') {
        $kondisi[] = 'terjual = TRUE';
    }

    $where = $kondisi === [] ? 'TRUE' : implode(' AND ', $kondisi);

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM akun WHERE {$where}");
    $stmt->execute($parameter);
    $total = (int) $stmt->fetchColumn();
    $total_halaman = max(1, (int) ceil($total / AKUN_PER_HALAMAN));
    $halaman = min($halaman_diminta, $total_halaman);

    $urut = match ($sort) {
        'termurah' => 'harga ASC, id ASC',
        'termahal' => 'harga DESC, id DESC',
        default => 'dibuat_pada DESC, id DESC',
    };

    $stmt = $pdo->prepare(
        "SELECT id, kode, judul, harga, terjual, jalur_gambar, dibuat_pada
         FROM akun
         WHERE {$where}
         ORDER BY {$urut}
         LIMIT " . AKUN_PER_HALAMAN . ' OFFSET ' . (($halaman - 1) * AKUN_PER_HALAMAN),
    );
    $stmt->execute($parameter);
    $items = array_map('baris_akun', $stmt->fetchAll());

    return [
        'items' => $items,
        'total' => $total,
        'halaman' => $halaman,
        'total_halaman' => $total_halaman,
    ];
}

function ambil_akun_publik(PDO $pdo, string $kode): ?array
{
    if (!kode_akun_valid($kode)) {
        return null;
    }

    $stmt = $pdo->prepare('SELECT * FROM akun WHERE kode = ? LIMIT 1');
    $stmt->execute([$kode]);
    $baris = $stmt->fetch();

    return $baris ? baris_akun($baris) : null;
}

function daftar_akun_admin(PDO $pdo, array $filter): array
{
    $status = normalkan_status((string) ($filter['status'] ?? 'semua'));
    $halaman_diminta = normalkan_halaman($filter['halaman'] ?? 1);

    $hitung = $pdo->query(
        'SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE terjual) AS terjual FROM akun',
    )->fetch();

    $total_semua = (int) ($hitung['total'] ?? 0);
    $total_terjual = (int) ($hitung['terjual'] ?? 0);
    $total_tersedia = $total_semua - $total_terjual;

    $where = match ($status) {
        'tersedia' => 'terjual = FALSE',
        'terjual' => 'terjual = TRUE',
        default => 'TRUE',
    };

    $total = match ($status) {
        'tersedia' => $total_tersedia,
        'terjual' => $total_terjual,
        default => $total_semua,
    };

    $total_halaman = max(1, (int) ceil($total / AKUN_ADMIN_PER_HALAMAN));
    $halaman = min($halaman_diminta, $total_halaman);

    $stmt = $pdo->query(
        "SELECT * FROM akun
         WHERE {$where}
         ORDER BY dibuat_pada DESC, id DESC
         LIMIT " . AKUN_ADMIN_PER_HALAMAN . ' OFFSET ' . (($halaman - 1) * AKUN_ADMIN_PER_HALAMAN),
    );
    $items = array_map('baris_akun', $stmt->fetchAll());

    return [
        'items' => $items,
        'total' => $total,
        'halaman' => $halaman,
        'total_halaman' => $total_halaman,
        'jumlah_tersedia' => $total_tersedia,
        'jumlah_terjual' => $total_terjual,
    ];
}

function ambil_akun(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM akun WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $baris = $stmt->fetch();

    return $baris ? baris_akun($baris) : null;
}

function validasi_akun(array $masukan): array
{
    $judul = trim((string) ($masukan['judul'] ?? ''));
    $deskripsi = trim((string) ($masukan['deskripsi'] ?? ''));
    $harga_mentah = trim((string) ($masukan['harga'] ?? ''));
    $tautan = trim((string) ($masukan['tautan_video'] ?? ''));
    $terjual = isset($masukan['terjual']);
    $errors = [];

    $panjang_judul = mb_strlen($judul, 'UTF-8');

    if ($panjang_judul < JUDUL_MIN || $panjang_judul > JUDUL_MAKS) {
        $errors['judul'] = 'Judul harus 3–100 karakter.';
    }

    $panjang_deskripsi = mb_strlen($deskripsi, 'UTF-8');

    if ($panjang_deskripsi < DESKRIPSI_MIN || $panjang_deskripsi > DESKRIPSI_MAKS) {
        $errors['deskripsi'] = 'Deskripsi harus 10–5.000 karakter.';
    }

    $harga = 0;

    if ($harga_mentah === '' || preg_match('/^\d+$/D', $harga_mentah) !== 1) {
        $errors['harga'] = 'Harga wajib berupa angka bulat tanpa titik atau koma.';
    } else {
        $harga = (int) $harga_mentah;

        if ($harga < 1 || $harga > HARGA_MAKS) {
            $errors['harga'] = 'Harga harus antara Rp1 dan Rp1.000.000.000.';
        }
    }

    $video = null;

    if ($tautan === '' || strlen($tautan) > VIDEO_MAKS_PANJANG) {
        $errors['tautan_video'] = 'URL video wajib diisi, maksimal 2.048 karakter.';
    } else {
        $video = normalisasi_video($tautan);

        if ($video === null) {
            $errors['tautan_video'] = 'Gunakan URL lengkap YouTube, TikTok, atau Google Drive yang valid.';
        }
    }

    return [
        'data' => [
            'judul' => $judul,
            'deskripsi' => $deskripsi,
            'harga' => $harga,
            'tautan_video' => $video['tautan'] ?? $tautan,
            'penyedia_video' => $video['penyedia'] ?? '',
            'terjual' => $terjual,
        ],
        'errors' => $errors,
    ];
}

function simpan_akun(PDO $pdo, array $data, array $berkas): string
{
    $gambar = simpan_gambar_akun($berkas);

    try {
        $terjual = $data['terjual'] ? 'TRUE' : 'FALSE';
        $stmt = $pdo->prepare(
            "INSERT INTO akun (judul, deskripsi, harga, penyedia_video, tautan_video, jalur_gambar, terjual, terjual_pada)
             VALUES (?, ?, ?, ?, ?, ?, {$terjual}, CASE WHEN {$terjual} THEN CURRENT_TIMESTAMP ELSE NULL END)
             RETURNING kode",
        );
        $stmt->execute([
            $data['judul'],
            $data['deskripsi'],
            $data['harga'],
            $data['penyedia_video'],
            $data['tautan_video'],
            $gambar['jalur'],
        ]);

        return (string) $stmt->fetchColumn();
    } catch (Throwable $e) {
        hapus_gambar_akun($gambar['jalur']);
        throw $e;
    }
}

function ubah_akun(PDO $pdo, int $id, array $data, ?array $berkas): string
{
    $lama = ambil_akun($pdo, $id);

    if ($lama === null) {
        throw new AkunTidakDitemukan();
    }

    $gambar = null;

    if ($berkas !== null && (int) ($berkas['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        $gambar = simpan_gambar_akun($berkas);
    }

    try {
        $terjual = $data['terjual'] ? 'TRUE' : 'FALSE';
        $stmt = $pdo->prepare(
            "UPDATE akun SET
                judul = ?,
                deskripsi = ?,
                harga = ?,
                penyedia_video = ?,
                tautan_video = ?,
                jalur_gambar = ?,
                terjual = {$terjual},
                terjual_pada = CASE WHEN {$terjual} THEN COALESCE(terjual_pada, CURRENT_TIMESTAMP) ELSE NULL END,
                diperbarui_pada = CURRENT_TIMESTAMP
             WHERE id = ?
             RETURNING kode",
        );
        $stmt->execute([
            $data['judul'],
            $data['deskripsi'],
            $data['harga'],
            $data['penyedia_video'],
            $data['tautan_video'],
            $gambar['jalur'] ?? $lama['jalur_gambar'],
            $id,
        ]);

        $kode = (string) $stmt->fetchColumn();

        if ($gambar !== null && $lama['jalur_gambar'] !== $gambar['jalur']) {
            hapus_gambar_akun($lama['jalur_gambar']);
        }

        return $kode;
    } catch (Throwable $e) {
        if ($gambar !== null) {
            hapus_gambar_akun($gambar['jalur']);
        }

        throw $e;
    }
}

function atur_terjual(PDO $pdo, int $id, bool $terjual): void
{
    $nilai = $terjual ? 'TRUE' : 'FALSE';
    $stmt = $pdo->prepare(
        "UPDATE akun SET
            terjual = {$nilai},
            terjual_pada = CASE WHEN {$nilai} THEN COALESCE(terjual_pada, CURRENT_TIMESTAMP) ELSE NULL END,
            diperbarui_pada = CURRENT_TIMESTAMP
         WHERE id = ?",
    );
    $stmt->execute([$id]);
}

function hapus_akun(PDO $pdo, int $id): void
{
    $stmt = $pdo->prepare('DELETE FROM akun WHERE id = ? RETURNING jalur_gambar');
    $stmt->execute([$id]);
    $jalur = $stmt->fetchColumn();

    if (is_string($jalur) && $jalur !== '') {
        hapus_gambar_akun($jalur);
    }
}
