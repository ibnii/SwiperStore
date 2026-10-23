import { hashPassword } from "@/lib/auth/password";

async function main() {
  const password = process.argv[2];

  if (!password) {
    console.error(
      "Usage: npm run hash-password -- '<password>'\nThe password is passed as a single quoted argument.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(await hashPassword(password));
}

main().catch((error: unknown) => {
  console.error(
    "Hash failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
