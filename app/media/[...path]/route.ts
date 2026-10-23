import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { resolveMediaFilePath } from "@/lib/media/paths";

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Development/fallback media route. Production serves the same files through
 * Nginx, so this handler repeats the containment and symlink checks.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const candidate = resolveMediaFilePath(
    env.UPLOAD_DIR,
    `/media/${segments.join("/")}`,
  );

  if (!candidate) {
    return notFound();
  }

  try {
    const root = await realpath(env.UPLOAD_DIR);
    const filePath = await realpath(candidate);

    if (!filePath.startsWith(root + path.sep)) {
      return notFound();
    }

    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      return notFound();
    }

    const data = await readFile(filePath);

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(data.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
