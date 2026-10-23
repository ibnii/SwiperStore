// Deterministic environment for unit tests. Values are dev-only placeholders.
const testEnv: Record<string, string> = {
  DATABASE_URL:
    "postgres://swiperstore:swiperstore_dev@localhost:5433/swiperstore",
  ADMIN_EMAIL: "admin@swiperstore.local",
  ADMIN_PASSWORD_HASH: "dev-placeholder-hash",
  WA_NUMBER: "6281234567890",
  UPLOAD_DIR: "./storage/test-uploads",
  SITE_URL: "http://localhost:3000",
};

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] = value;
}
