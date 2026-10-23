<?php
declare(strict_types=1);

function normalisasi_nomor_wa(string $mentah): string
{
    $angka = preg_replace('/[\s\-()+]/', '', $mentah) ?? '';

    if ($angka === '' || preg_match('/^\d+$/D', $angka) !== 1) {
        throw new InvalidArgumentException('Nomor WhatsApp tidak valid');
    }

    $normal = str_starts_with($angka, '0') ? '62' . substr($angka, 1) : $angka;

    if (!str_starts_with($normal, '62') || strlen($normal) < 10 || strlen($normal) > 15) {
        throw new InvalidArgumentException('Nomor WhatsApp tidak valid');
    }

    return $normal;
}

function pesan_wa(string $kode): string
{
    return 'Halo min, saya ingin membeli akun dengan Id ' . $kode;
}

function url_wa(string $nomor, string $kode): string
{
    return 'https://wa.me/' . normalisasi_nomor_wa($nomor)
        . '?text=' . rawurlencode(pesan_wa($kode));
}
