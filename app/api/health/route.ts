import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

export async function GET() {
  try {
    await db.execute(sql`select 1`);

    return Response.json({ status: "ok" }, { headers: NO_STORE });
  } catch (error) {
    console.error("Health check failed:", error);

    return Response.json({ status: "error" }, { status: 503, headers: NO_STORE });
  }
}
