// Server-only: load share-kit MP4 bytes for native X upload.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getSharePost, shareVideoAbsoluteUrl, type SharePost } from "@/lib/share-posts";

/** Pull /v/{id} from a tweet body (drip captions include the watch URL). */
export function sharePostIdFromBody(body: string): string | null {
  const m = body.match(/\/v\/([a-z0-9-]+)/i);
  return m?.[1] ?? null;
}

/** Read clip bytes from disk (VPS public/) or fall back to HTTPS fetch. */
export async function loadShareVideoBytes(postId: string): Promise<{
  post: SharePost;
  bytes: Buffer;
}> {
  const post = getSharePost(postId);
  if (!post) throw new Error(`Unknown share clip: ${postId}`);

  const candidates = [
    join(process.cwd(), "public", `${post.file}.mp4`),
    join(process.cwd(), ".output", "public", `${post.file}.mp4`),
    join("/opt/auraos/public", `${post.file}.mp4`),
  ];

  for (const path of candidates) {
    try {
      const bytes = await readFile(path);
      if (bytes.length > 0) return { post, bytes };
    } catch {
      /* try next */
    }
  }

  const url = shareVideoAbsoluteUrl(post.file);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Share clip missing on disk and CDN: ${post.file}.mp4`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!bytes.length) throw new Error(`Empty clip: ${post.file}.mp4`);
  return { post, bytes };
}
