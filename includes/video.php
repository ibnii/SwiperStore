<?php
declare(strict_types=1);

const VIDEO_MAKS_PANJANG = 2048;

function video_youtube(string $id): array
{
    return [
        'penyedia' => 'youtube',
        'tautan' => 'https://www.youtube.com/watch?v=' . $id,
        'sematan' => 'https://www.youtube-nocookie.com/embed/' . $id . '?rel=0&playsinline=1',
    ];
}

function normalisasi_video(string $mentah): ?array
{
    $nilai = trim($mentah);

    if ($nilai === '' || strlen($nilai) > VIDEO_MAKS_PANJANG) {
        return null;
    }

    $url = parse_url($nilai);

    if ($url === false || !isset($url['scheme'], $url['host'])) {
        return null;
    }

    if (strtolower($url['scheme']) !== 'https') {
        return null;
    }

    if (isset($url['user']) || isset($url['pass'])) {
        return null;
    }

    if (isset($url['port']) && (int) $url['port'] !== 443) {
        return null;
    }

    if (isset($url['fragment']) && $url['fragment'] !== '') {
        return null;
    }

    $host = strtolower($url['host']);
    $jalur = $url['path'] ?? '/';
    $kueri = [];
    parse_str($url['query'] ?? '', $kueri);

    if (in_array($host, ['www.youtube.com', 'youtube.com', 'm.youtube.com'], true)) {
        if ($jalur === '/watch') {
            $id = $kueri['v'] ?? null;

            return is_string($id) && preg_match('/^[A-Za-z0-9_-]{11}$/D', $id) === 1
                ? video_youtube($id)
                : null;
        }

        if (preg_match('#^/shorts/([A-Za-z0-9_-]{11})/?$#D', $jalur, $cocok) === 1) {
            return video_youtube($cocok[1]);
        }

        if (preg_match('#^/embed/([A-Za-z0-9_-]{11})/?$#D', $jalur, $cocok) === 1) {
            return video_youtube($cocok[1]);
        }

        return null;
    }

    if ($host === 'youtu.be') {
        return preg_match('#^/([A-Za-z0-9_-]{11})/?$#D', $jalur, $cocok) === 1
            ? video_youtube($cocok[1])
            : null;
    }

    if (in_array($host, ['www.tiktok.com', 'tiktok.com', 'm.tiktok.com'], true)) {
        if (preg_match('#^/(@[A-Za-z0-9._-]+)/video/(\d{6,25})/?$#D', $jalur, $cocok) !== 1) {
            return null;
        }

        return [
            'penyedia' => 'tiktok',
            'tautan' => 'https://www.tiktok.com/' . $cocok[1] . '/video/' . $cocok[2],
            'sematan' => 'https://www.tiktok.com/embed/v2/' . $cocok[2],
        ];
    }

    if ($host === 'drive.google.com') {
        $id = null;

        if ($jalur === '/open') {
            $id = $kueri['id'] ?? null;
            $id = is_string($id) ? $id : null;
        } elseif (preg_match('#^/file/d/([A-Za-z0-9_-]{10,100})/(?:view|preview)/?$#D', $jalur, $cocok) === 1) {
            $id = $cocok[1];
        }

        if ($id === null || preg_match('/^[A-Za-z0-9_-]{10,100}$/D', $id) !== 1) {
            return null;
        }

        return [
            'penyedia' => 'google_drive',
            'tautan' => 'https://drive.google.com/file/d/' . $id . '/view',
            'sematan' => 'https://drive.google.com/file/d/' . $id . '/preview',
        ];
    }

    return null;
}

function label_penyedia(string $penyedia): string
{
    return match ($penyedia) {
        'youtube' => 'YouTube',
        'tiktok' => 'TikTok',
        'google_drive' => 'Google Drive',
        default => 'Video',
    };
}

function video_tersemat(string $penyedia, string $tautan): ?array
{
    $video = normalisasi_video($tautan);

    return $video !== null && $video['penyedia'] === $penyedia ? $video : null;
}
