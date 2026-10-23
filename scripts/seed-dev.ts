import { chmod, mkdir } from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import sharp from "sharp";
import { listings } from "@/lib/db/schema";

type SeedRow = {
  title: string;
  description: string;
  priceIdr: number;
  isSold: boolean;
  videoId: string;
  thumbnail: string;
  daysAgo: number;
};

const seedRows: SeedRow[] = [
  {
    title: "Akun PUBG M416 Glacier Sultan",
    description:
      "Akun PUBG Mobile dengan M416 Glacier level 5, set outfit Sultan, dan koleksi senjata langka. Sudah bind email, aman dan siap main.",
    priceIdr: 850_000,
    isSold: false,
    videoId: "dQw4w9WgXcQ",
    thumbnail: "/media/listings/seed/akun-01.webp",
    daysAgo: 2,
  },
  {
    title: "Akun PUBG Season 5 Conqueror",
    description:
      "Akun Conqueror Season 5 dengan badge langka, K/D stabil, dan banyak skin senjata. Cocok untuk koleksi atau push rank.",
    priceIdr: 1_250_000,
    isSold: true,
    videoId: "M7lc1UVf-VE",
    thumbnail: "/media/listings/seed/akun-02.webp",
    daysAgo: 14,
  },
  {
    title: "Akun PUBG Mythic Fashion Lengkap",
    description:
      "Koleksi outfit Mythic lengkap dari beberapa season, termasuk set Pharaoh dan Blood Raven. Akun bersih tanpa riwayat banned.",
    priceIdr: 2_400_000,
    isSold: false,
    videoId: "9bZkp7q19f0",
    thumbnail: "/media/listings/seed/akun-03.webp",
    daysAgo: 5,
  },
  {
    title: "Akun PUBG Rookie Friendly",
    description:
      "Akun santai untuk pemula dengan beberapa skin populer dan rank Gold. Harga ramah, langsung bisa dipakai bermain.",
    priceIdr: 450_000,
    isSold: false,
    videoId: "kJQP7kiw5Fk",
    thumbnail: "/media/listings/seed/akun-04.webp",
    daysAgo: 8,
  },
  {
    title: "Akun PUBG M416 Wasteland + UMP45",
    description:
      "Punya M416 Wasteland dan UMP45 skin langka, plus set outfit tactical. Rank Ace dengan riwayat match bersih.",
    priceIdr: 3_750_000,
    isSold: false,
    videoId: "RgKAFK5djSk",
    thumbnail: "/media/listings/seed/akun-05.webp",
    daysAgo: 11,
  },
  {
    title: "Akun PUBG K/D Tinggi Tier Ace",
    description:
      "Akun tier Ace dengan K/D di atas 4, banyak skin senjata favorit, dan set outfit kompetitif. Siap dipakai push rank.",
    priceIdr: 1_100_000,
    isSold: true,
    videoId: "OPf0YbXqDm0",
    thumbnail: "/media/listings/seed/akun-06.webp",
    daysAgo: 21,
  },
  {
    title: "Akun PUBG Full Mythic Outfit",
    description:
      "Akun koleksi dengan beberapa Mythic outfit, emote langka, dan kendaraan berskin. Semua item sudah permanen.",
    priceIdr: 5_500_000,
    isSold: false,
    videoId: "fJ9rUzIMcZQ",
    thumbnail: "/media/listings/seed/akun-07.webp",
    daysAgo: 3,
  },
  {
    title: "Akun PUBG Budget Skin Populer",
    description:
      "Akun hemat dengan skin populer seperti School Uniform dan beberapa senjata umum. Cocok untuk main harian.",
    priceIdr: 675_000,
    isSold: false,
    videoId: "CevxZvSJLk8",
    thumbnail: "/media/listings/seed/akun-08.webp",
    daysAgo: 17,
  },
  {
    title: "Akun PUBG AKM Glacier Level 7",
    description:
      "AKM Glacier sudah level 7 dengan kill message, plus M416 skin pendamping. Akun terawat dan tidak pernah dijual sebelumnya.",
    priceIdr: 950_000,
    isSold: true,
    videoId: "JGwWNGJdvx8",
    thumbnail: "/media/listings/seed/akun-09.webp",
    daysAgo: 26,
  },
  {
    title: "Akun PUBG Conqueror Season 12",
    description:
      "Akun Conqueror Season 12 dengan frame eksklusif dan koleksi outfit lengkap. Siap untuk pemain yang ingin tampil beda.",
    priceIdr: 1_800_000,
    isSold: false,
    videoId: "ktvTqknDobU",
    thumbnail: "/media/listings/seed/akun-10.webp",
    daysAgo: 6,
  },
  {
    title: "Akun PUBG Koleksi X-Suit Lengkap",
    description:
      "Koleksi X-Suit lengkap dengan upgrade material, termasuk Poseidon dan Pharaoh. Akun premium untuk kolektor serius.",
    priceIdr: 7_200_000,
    isSold: false,
    videoId: "hT_nvWreIhg",
    thumbnail: "/media/listings/seed/akun-11.webp",
    daysAgo: 9,
  },
  {
    title: "Akun PUBG Starter Rank Gold",
    description:
      "Akun starter rank Gold dengan beberapa skin senjata dan outfit dasar. Harga terjangkau untuk akun cadangan.",
    priceIdr: 525_000,
    isSold: false,
    videoId: "YQHsXMglC9A",
    thumbnail: "/media/listings/seed/akun-12.webp",
    daysAgo: 30,
  },
  {
    title: "Akun PUBG Kar98 Koi + M24",
    description:
      "Punya Kar98 Koi dan M24 skin langka, plus set sniper lengkap. Akun ideal untuk pemain yang suka gaya sniper.",
    priceIdr: 2_900_000,
    isSold: true,
    videoId: "09R8_2nJtjg",
    thumbnail: "/media/listings/seed/akun-13.webp",
    daysAgo: 35,
  },
  {
    title: "Akun PUBG Tier Crown V",
    description:
      "Akun tier Crown V dengan koleksi outfit kasual dan beberapa senjata berskin. Riwayat match bersih dan aman.",
    priceIdr: 1_450_000,
    isSold: false,
    videoId: "pRpeEdMmmQ0",
    thumbnail: "/media/listings/seed/akun-14.webp",
    daysAgo: 12,
  },
  {
    title: "Akun PUBG Mythic Suit Pharaoh",
    description:
      "Mythic Suit Pharaoh dengan efek masuk lobby, plus skin M762 dan set helm langka. Akun siap jadi pusat perhatian.",
    priceIdr: 3_200_000,
    isSold: false,
    videoId: "uelHwf8o7_U",
    thumbnail: "/media/listings/seed/akun-15.webp",
    daysAgo: 4,
  },
  {
    title: "Akun PUBG Smurf Tier Platinum",
    description:
      "Akun smurf tier Platinum dengan skin minimalis dan performa stabil. Cocok untuk bermain santai bersama teman.",
    priceIdr: 890_000,
    isSold: false,
    videoId: "e-ORhEE9VVg",
    thumbnail: "/media/listings/seed/akun-16.webp",
    daysAgo: 24,
  },
  {
    title: "Akun PUBG Whale Account 200+ Skins",
    description:
      "Akun whale dengan lebih dari 200 skin, termasuk banyak item limited dari season awal. Koleksi lengkap untuk kolektor.",
    priceIdr: 12_500_000,
    isSold: true,
    videoId: "Zi_XLOBDo_Y",
    thumbnail: "/media/listings/seed/akun-17.webp",
    daysAgo: 45,
  },
  {
    title: "Akun PUBG M416 Fool + Set PGI",
    description:
      "M416 Fool dengan set PGI lengkap dan beberapa outfit turnamen. Akun langka dengan item yang sudah tidak beredar.",
    priceIdr: 2_100_000,
    isSold: false,
    videoId: "tt2k8PGm-TI",
    thumbnail: "/media/listings/seed/akun-18.webp",
    daysAgo: 7,
  },
  {
    title: "Akun PUBG Season 8 Diamond",
    description:
      "Akun Season 8 Diamond dengan skin senjata klasik dan frame langka. Sudah bind semua akun dan siap transfer.",
    priceIdr: 1_350_000,
    isSold: false,
    videoId: "3JZ_D3ELwOQ",
    thumbnail: "/media/listings/seed/akun-19.webp",
    daysAgo: 19,
  },
  {
    title: "Akun PUBG X-Suit Poseidon",
    description:
      "X-Suit Poseidon level tinggi dengan material upgrade, plus set senjata biru yang serasi. Akun premium terbatas.",
    priceIdr: 6_800_000,
    isSold: true,
    videoId: "2Vv-BfVoq4g",
    thumbnail: "/media/listings/seed/akun-20.webp",
    daysAgo: 38,
  },
  {
    title: "Akun PUBG Akun Lama 2019",
    description:
      "Akun lama sejak 2019 dengan item season awal yang sudah tidak didapat lagi. Cocok untuk kolektor item vintage.",
    priceIdr: 400_000,
    isSold: false,
    videoId: "nfWlot6h_JM",
    thumbnail: "/media/listings/seed/akun-21.webp",
    daysAgo: 52,
  },
  {
    title: "Akun PUBG Full Set Collaboration",
    description:
      "Koleksi set kolaborasi lengkap, termasuk outfit dan senjata edisi terbatas. Akun bersih dengan riwayat aman.",
    priceIdr: 4_900_000,
    isSold: false,
    videoId: "7wtfhZwyrcc",
    thumbnail: "/media/listings/seed/akun-22.webp",
    daysAgo: 10,
  },
  {
    title: "Akun PUBG Tier Ace Master",
    description:
      "Tier Ace Master dengan statistik kompetitif, skin M416 favorit, dan set outfit tactical. Siap untuk push ke Conqueror.",
    priceIdr: 1_650_000,
    isSold: false,
    videoId: "papuvlVeZg8",
    thumbnail: "/media/listings/seed/akun-23.webp",
    daysAgo: 15,
  },
  {
    title: "Akun PUBG Skin Glacier Combo",
    description:
      "Kombinasi skin Glacier untuk M416 dan AKM, plus set outfit hitam elegan. Akun incaran pemain kompetitif.",
    priceIdr: 9_900_000,
    isSold: true,
    videoId: "ru0K8uYEZWw",
    thumbnail: "/media/listings/seed/akun-24.webp",
    daysAgo: 41,
  },
  {
    title: "Akun PUBG Siap Push Rank",
    description:
      "Akun dengan tier stabil, skin senjata lengkap, dan banyak teman aktif. Siap dipakai push rank mulai sekarang.",
    priceIdr: 750_000,
    isSold: false,
    videoId: "QcIy9NiNbmo",
    thumbnail: "/media/listings/seed/akun-25.webp",
    daysAgo: 1,
  },
];

const DAY_MS = 86_400_000;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function seedImageSvg(code: string, index: number): string {
  const glowX = 200 + (index % 5) * 200;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#D4AF37" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#0B0B0B" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="750" fill="#0B0B0B"/>
  <circle cx="${glowX}" cy="160" r="430" fill="url(#glow)"/>
  <rect x="40" y="40" width="1120" height="670" fill="none" stroke="#D4AF37" stroke-opacity="0.35"/>
  <text x="76" y="620" font-family="sans-serif" font-size="96" font-weight="700" fill="#E8CD7A">${escapeXml(code)}</text>
  <text x="80" y="668" font-family="sans-serif" font-size="26" letter-spacing="10" fill="#A19B8F">SWIPER STORE</text>
</svg>`;
}

async function generateSeedImages(uploadDir: string) {
  const root = path.resolve(uploadDir);
  const seedDirectory = path.join(root, "listings", "seed");

  await mkdir(seedDirectory, { recursive: true, mode: 0o750 });

  await Promise.all(
    seedRows.map(async (row, index) => {
      const code = `SWP-${String(index + 1).padStart(4, "0")}`;
      const relative = row.thumbnail.replace(/^\/media\//, "");
      const target = path.join(root, relative);

      await sharp(Buffer.from(seedImageSvg(code, index)))
        .webp({ quality: 82 })
        .toFile(target);
      await chmod(target, 0o640);
    }),
  );
}


function buildSeedListings() {
  const now = Date.now();

  return seedRows.map((row, index) => {
    const createdAt = new Date(
      now - row.daysAgo * DAY_MS - (index % 6) * 3_600_000,
    );
    const soldAt = row.isSold
      ? new Date(createdAt.getTime() + Math.min(row.daysAgo - 2, 2) * DAY_MS)
      : null;

    return {
      title: row.title,
      description: row.description,
      priceIdr: row.priceIdr,
      isSold: row.isSold,
      soldAt,
      videoProvider: "youtube" as const,
      videoUrl: `https://www.youtube.com/watch?v=${row.videoId}`,
      thumbnailPath: row.thumbnail,
      createdAt,
      updatedAt: soldAt ?? createdAt,
    };
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed listings with NODE_ENV=production.");
  }

  loadEnv({ path: [".env.local", ".env"], quiet: true });

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required. Set it in .env.local or the environment.",
    );
  }

  const uploadDir = process.env.UPLOAD_DIR ?? "./storage/uploads";

  await generateSeedImages(uploadDir);

  let target: URL;

  try {
    target = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (target.protocol !== "postgres:" && target.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres:// scheme.");
  }

  const rows = buildSeedListings();
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });

  try {
    const db = drizzle(pool);

    await db.transaction(async (tx) => {
      await tx.execute(sql`TRUNCATE TABLE listings`);
      await tx.execute(sql`ALTER SEQUENCE listing_code_seq RESTART WITH 1`);
      await tx.insert(listings).values(rows);
    });

    const result = await pool.query<{ count: number; first_code: string; last_code: string }>(
      "SELECT count(*)::int AS count, min(code) AS first_code, max(code) AS last_code FROM listings",
    );

    console.log(
      `Seeded ${result.rows[0].count} listings into ${target.hostname}:${target.port || "5432"}${target.pathname} (codes ${result.rows[0].first_code}..${result.rows[0].last_code}).`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Seed failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
