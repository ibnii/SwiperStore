-- Skema database Swiper Store (PostgreSQL).
-- Jalankan sekali pada database kosong. Aplikasi memakai schema public.

CREATE SEQUENCE akun_kode_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE TABLE akun (
    id              BIGSERIAL PRIMARY KEY,
    kode            VARCHAR(20) NOT NULL UNIQUE
                    DEFAULT ('SWP-' || to_char(nextval('akun_kode_seq'), 'FM0000')),
    judul           VARCHAR(100) NOT NULL,
    deskripsi       TEXT NOT NULL,
    harga           BIGINT NOT NULL,
    penyedia_video  VARCHAR(20) NOT NULL,
    tautan_video    TEXT NOT NULL,
    jalur_gambar    VARCHAR(255) NOT NULL,
    terjual         BOOLEAN NOT NULL DEFAULT FALSE,
    terjual_pada    TIMESTAMP,
    dibuat_pada     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cek_akun_judul CHECK (char_length(judul) BETWEEN 3 AND 100),
    CONSTRAINT cek_akun_deskripsi CHECK (char_length(deskripsi) BETWEEN 10 AND 5000),
    CONSTRAINT cek_akun_harga CHECK (harga > 0 AND harga <= 1000000000),
    CONSTRAINT cek_akun_penyedia CHECK (penyedia_video IN ('youtube', 'tiktok', 'google_drive')),
    CONSTRAINT cek_akun_tautan CHECK (tautan_video LIKE 'https://%' AND char_length(tautan_video) <= 2048),
    CONSTRAINT cek_akun_gambar CHECK (jalur_gambar LIKE 'listings/%.webp'),
    CONSTRAINT cek_akun_terjual_pada CHECK (
        (terjual AND terjual_pada IS NOT NULL) OR (NOT terjual AND terjual_pada IS NULL)
    )
);

CREATE INDEX idx_akun_dibuat ON akun(dibuat_pada DESC, id DESC);
CREATE INDEX idx_akun_status_dibuat ON akun(terjual, dibuat_pada DESC, id DESC);
CREATE INDEX idx_akun_harga ON akun(harga ASC, id ASC);

CREATE TABLE admin (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    hash_kata_sandi VARCHAR(255) NOT NULL,
    dibuat_pada     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sesi_admin (
    id              BIGSERIAL PRIMARY KEY,
    id_admin        BIGINT NOT NULL,
    token_hash      CHAR(64) NOT NULL UNIQUE,
    kedaluwarsa_pada TIMESTAMP NOT NULL,
    dibuat_pada     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sesi_admin_admin FOREIGN KEY (id_admin)
        REFERENCES admin(id) ON DELETE CASCADE
);

CREATE INDEX idx_sesi_admin_kedaluwarsa ON sesi_admin(kedaluwarsa_pada);

-- Pembatas login: 5 kegagalan per IP dan 10 per email dalam 15 menit.
CREATE TABLE percobaan_login (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    ip          VARCHAR(45) NOT NULL,
    dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_percobaan_login_email_ip ON percobaan_login(email, ip, dibuat_pada);
CREATE INDEX idx_percobaan_login_ip ON percobaan_login(ip, dibuat_pada);
CREATE INDEX idx_percobaan_login_email ON percobaan_login(email, dibuat_pada);
CREATE INDEX idx_percobaan_login_dibuat ON percobaan_login(dibuat_pada);
