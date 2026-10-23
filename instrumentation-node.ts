export async function register() {
  try {
    await import("./lib/env");
  } catch (error) {
    // Next catches instrumentation errors and keeps serving; exit instead so a
    // broken deployment never comes up half-alive.
    console.error("Invalid environment configuration:", error);
    process.exit(1);
  }
}
