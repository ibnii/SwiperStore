import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended Argon2id baseline: 19 MiB, 2 iterations, 1 lane.
// 2 is Algorithm.Argon2id; importing the ambient const enum breaks isolatedModules.
const HASH_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

// Valid Argon2id hash of a throwaway password. Login verifies against this
// when the email does not match so response timing does not reveal the email.
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$YpppyPfXWNVfyaWwQsrLwg$BQ3EdfmOvaQrMZ+7QitcvzkQteZ7ycfCgVVLoQqyoY8";

export type VerifyPassword = (
  password: string,
  passwordHash: string,
) => Promise<boolean>;

export type AdminCredentials = {
  email: string;
  passwordHash: string;
};

export type AdminLoginInput = {
  email: string;
  password: string;
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, HASH_OPTIONS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function authenticateAdmin(
  input: AdminLoginInput,
  credentials: AdminCredentials,
  verifyFn: VerifyPassword = verifyPassword,
): Promise<boolean> {
  const emailMatches =
    normalizeAdminEmail(input.email) === normalizeAdminEmail(credentials.email);
  const hashToVerify = emailMatches
    ? credentials.passwordHash
    : DUMMY_PASSWORD_HASH;
  const passwordMatches = await verifyFn(input.password, hashToVerify);

  return emailMatches && passwordMatches;
}
