import { normalizeVideoUrl } from "@/lib/video/normalize";

type VideoEmbedProps = {
  code: string;
  videoUrl: string;
};

const providerLabel = {
  youtube: "YouTube",
  tiktok: "TikTok",
  google_drive: "Google Drive",
} as const;

export function VideoEmbed({ code, videoUrl }: VideoEmbedProps) {
  const video = normalizeVideoUrl(videoUrl);

  if (!video) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 text-center">
        <p className="text-sm text-muted">
          Video tidak dapat ditampilkan. Hubungi kami lewat WhatsApp untuk
          melihat detail akun ini.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-elevated">
        <iframe
          src={video.embedUrl}
          title={`Video ${code}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="aspect-video w-full"
        />
      </div>
      <p className="mt-3 text-xs text-muted">
        Video tidak muncul?{" "}
        <a
          href={video.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-champagne underline-offset-4 transition hover:text-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Buka di {providerLabel[video.provider]}
        </a>
      </p>
    </div>
  );
}
