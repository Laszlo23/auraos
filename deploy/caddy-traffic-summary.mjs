#!/usr/bin/env node
/**
 * Summarize Caddy JSON access logs into page-view counts.
 * No IPs or query strings are written to the output file.
 */
import { createReadStream, existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";

const STATIC_EXT = /\.(js|css|mjs|map|woff2?|ttf|eot|png|jpe?g|gif|webp|svg|ico|mp4|webm)(\?|$)/i;
const BOT_UA =
  /bot|crawler|spider|preview|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|gptbot|claudebot|bytespider|semrush|ahrefs|petalbot|applebot|yandex|curl|wget|httpie/i;

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] || fallback;
}

function sanitizePath(uri) {
  if (!uri || typeof uri !== "string") return null;
  let path = uri.split("?")[0] || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  if (STATIC_EXT.test(path)) return null;
  if (path.startsWith("/api")) return null;
  if (path.startsWith("/assets")) return null;
  if (path.startsWith("/_serverFn")) return null;
  if (path === "/sw.js") return null;
  if (path.startsWith("/lokal/claim")) return "/lokal/claim";
  if (path.length > 200) path = path.slice(0, 200);
  return path;
}

function isBot(ua) {
  return !ua || BOT_UA.test(ua);
}

function logCandidates(primary) {
  if (!primary) return [];
  const dir = dirname(primary);
  const base = primary.split("/").pop();
  const files = [primary];
  if (existsSync(dir) && base) {
    for (const name of readdirSync(dir)) {
      if (name === base || name.startsWith(`${base}.`)) {
        files.push(resolve(dir, name));
      }
    }
  }
  return [...new Set(files)].filter((f) => existsSync(f));
}

async function readLog(file, sinceMs, into) {
  const stream = createReadStream(file, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.startsWith("{")) continue;
    into.lines += 1;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const ts = typeof row.ts === "number" ? row.ts * 1000 : Date.parse(row.ts || "") || 0;
    if (ts && ts < sinceMs) continue;
    const req = row.request || {};
    const method = String(req.method || row.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") continue;
    const status = Number(row.status ?? 0);
    if (status >= 400) {
      into.status[String(status)] = (into.status[String(status)] || 0) + 1;
      continue;
    }
    const path = sanitizePath(req.uri || row.uri || "");
    if (!path) continue;
    const ua = Array.isArray(req.headers?.["User-Agent"])
      ? req.headers["User-Agent"][0]
      : req.headers?.["User-Agent"] || "";
    const bucket = isBot(String(ua)) ? into.bots : into.humans;
    bucket.hits += 1;
    bucket.paths[path] = (bucket.paths[path] || 0) + 1;
    into.status[String(status || 200)] = (into.status[String(status || 200)] || 0) + 1;
  }
}

function topPaths(map, n = 20) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([path, hits]) => ({ path, hits }));
}

async function main() {
  const log = arg("--log", "/var/lib/caddy/logs/aibusiness.access.log");
  const reviewLog = arg("--review-log", "/var/lib/caddy/logs/review.access.log");
  const out = arg("--out", "/opt/auraos/var/caddy-traffic.json");
  const now = Date.now();
  const since = now - 24 * 60 * 60 * 1000;

  const acc = {
    lines: 0,
    status: {},
    humans: { hits: 0, paths: {} },
    bots: { hits: 0, paths: {} },
  };

  const files = [...logCandidates(log), ...logCandidates(reviewLog)];
  for (const file of files) {
    try {
      if (statSync(file).size === 0) continue;
      await readLog(file, since, acc);
    } catch {
      /* unreadable rotated file */
    }
  }

  const payload = {
    generated_at: new Date(now).toISOString(),
    window: "24h",
    source: "caddy json access log",
    files: files.length,
    lines_read: acc.lines,
    html_gets: acc.humans.hits + acc.bots.hits,
    human_hits: acc.humans.hits,
    bot_hits: acc.bots.hits,
    status: acc.status,
    top_paths: topPaths(acc.humans.paths),
    top_bot_paths: topPaths(acc.bots.paths, 8),
  };

  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
