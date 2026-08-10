/** Server-only marketing creative helpers (images + body enrichment). */

import { shareWatchUrl } from "@/lib/share-posts";

function env(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return undefined;
}

export function openaiImagesConfigured(): boolean {
  return Boolean(env("OPENAI_API_KEY"));
}

/** Generate a still via OpenAI Images API (requires OPENAI_API_KEY). */
export async function generateOpenAiImageBytes(prompt: string): Promise<{
  bytes: Buffer;
  mime: string;
}> {
  const key = env("OPENAI_API_KEY");
  if (!key) {
    throw new Error(
      "Image generation needs OPENAI_API_KEY (DALL·E / Images API). Text models alone cannot render images.",
    );
  }
  const base = (env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = env("OPENAI_IMAGE_MODEL") ?? "dall-e-3";
  const clean = prompt.replace(/\s+/g, " ").trim().slice(0, 1000);
  if (clean.length < 8) throw new Error("Image prompt is too short.");

  const res = await fetch(`${base}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model,
      prompt: clean,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Image API ${res.status}: ${detail.slice(0, 240) || res.statusText}`);
  }

  const json = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const b64 = json.data?.[0]?.b64_json;
  if (b64) {
    return { bytes: Buffer.from(b64, "base64"), mime: "image/png" };
  }
  const url = json.data?.[0]?.url;
  if (!url) throw new Error("Image API returned no image data.");
  const img = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!img.ok) throw new Error("Could not download generated image.");
  const buf = Buffer.from(await img.arrayBuffer());
  return { bytes: buf, mime: img.headers.get("content-type") || "image/png" };
}

/** Ensure share-kit watch link is in the post body when a clip is attached. */
export function enrichBodyWithMedia(opts: {
  body: string;
  sharePostId?: string | null;
  mediaUrl?: string | null;
  mediaKind?: string | null;
}): string {
  let body = opts.body.trim();
  const shareId = opts.sharePostId?.trim();
  if (shareId) {
    const watch = shareWatchUrl(shareId);
    if (watch && !body.includes(`/v/${shareId}`) && !body.includes(watch)) {
      body = `${body}\n\n${watch}`.trim();
    }
  }
  if (opts.mediaKind === "image" && opts.mediaUrl && !body.includes(opts.mediaUrl)) {
    body = `${body}\n\n${opts.mediaUrl}`.trim();
  }
  if (opts.mediaKind === "video" && opts.mediaUrl && !body.includes(opts.mediaUrl)) {
    body = `${body}\n\n${opts.mediaUrl}`.trim();
  }
  return body;
}
