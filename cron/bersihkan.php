<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Akses ditolak.');
}

require_once __DIR__ . '/../config/aplikasi.php';
require_once __DIR__ . '/../config/koneksi.php';

date_default_timezone_set(ZONA_WAKTU);

const TRASH_UMUR_HARI = 7;
const PERCOBAAN_UMUR_HARI = 1;
const SESI_PHP_UMUR_HARI = 7;

function hapus_berkas_lama(string $folder, int $batas): int
{
    if (!is_dir($folder)) {
        return 0;
    }

    $jumlah = 0;
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($folder, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST,
    );

    foreach ($iterator as $berkas) {
        /** @var SplFileInfo $berkas */
        if (
            $berkas->isFile()
            && !str_starts_with($berkas->getFilename(), '.')
            && $berkas->getMTime() < $batas
            && @unlink($berkas->getPathname())
        ) {
            $jumlah++;
        }
    }

    $folderIterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($folder, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST,
    );

    foreach ($folderIterator as $item) {
        /** @var SplFileInfo $item */
        if ($item->isDir() && @rmdir($item->getPathname())) {
            continue;
        }
    }

    return $jumlah;
}

try {
    $sekarang = time();

    $sampah = hapus_berkas_lama(
        __DIR__ . '/../storage/trash',
        $sekarang - (TRASH_UMUR_HARI * 86400),
    );

    $sesi = hapus_berkas_lama(
        __DIR__ . '/../storage/sessions',
        $sekarang - (SESI_PHP_UMUR_HARI * 86400),
    );

    $percobaan = $pdo->prepare(
        'DELETE FROM percobaan_login
         WHERE dibuat_pada <= CURRENT_TIMESTAMP - (? * INTERVAL \'1 day\')',
    );
    $percobaan->execute([PERCOBAAN_UMUR_HARI]);

    $sesiAdmin = $pdo->exec(
        'DELETE FROM sesi_admin WHERE kedaluwarsa_pada <= CURRENT_TIMESTAMP',
    );

    printf(
        "[%s] trash=%d sesi_php=%d percobaan_login=%d sesi_admin=%d\n",
        date('Y-m-d H:i:s'),
        $sampah,
        $sesi,
        $percobaan->rowCount(),
        $sesiAdmin,
    );

    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Gagal membersihkan data: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
