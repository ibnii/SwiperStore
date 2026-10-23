-- Opsional: salin data dari skema Next.js lama (tabel listings) ke tabel akun.
-- Jalankan setelah 01_schema.sql. Aman dijalankan pada database tanpa tabel listings.

DO $$
BEGIN
    IF to_regclass('public.listings') IS NULL THEN
        RAISE NOTICE 'Tabel listings tidak ada, migrasi dilewati.';
        RETURN;
    END IF;

    EXECUTE $migrasi$
        INSERT INTO akun (
            kode, judul, deskripsi, harga, penyedia_video, tautan_video,
            jalur_gambar, terjual, terjual_pada, dibuat_pada, diperbarui_pada
        )
        SELECT
            code,
            title,
            description,
            price_idr,
            video_provider,
            video_url,
            regexp_replace(thumbnail_path, '^/media/', ''),
            is_sold,
            sold_at::timestamp,
            created_at::timestamp,
            updated_at::timestamp
        FROM listings
        ON CONFLICT (kode) DO NOTHING
    $migrasi$;

    EXECUTE $setel$
        SELECT setval(
            'akun_kode_seq',
            (SELECT GREATEST(COALESCE(MAX(substring(kode FROM 5)::integer), 0), 1) FROM akun),
            (SELECT COUNT(*) > 0 FROM akun)
        )
    $setel$;

    RAISE NOTICE 'Migrasi listings -> akun selesai.';
END $$;
