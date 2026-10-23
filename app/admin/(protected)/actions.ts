"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { destroyAdminSession } from "@/lib/auth/session";

export async function logout(): Promise<void> {
  await requireAdmin();
  await destroyAdminSession();
  redirect("/admin/login");
}
