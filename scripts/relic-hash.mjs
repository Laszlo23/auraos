#!/usr/bin/env node
/**
 * Print keccak256(utf8(normalize(phrase))) for RELIC_ANSWER_HASH.
 * Pipe the phrase on stdin so it never lands in argv/history if you use a here-string carefully.
 *
 *   printf '%s' 'your phrase' | node scripts/relic-hash.mjs
 */
import { keccak256, toBytes } from "viem";

const raw = await new Response(process.stdin).text();
const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
if (!normalized) {
  console.error("Pass the phrase on stdin.");
  process.exit(1);
}
process.stdout.write(`${keccak256(toBytes(normalized))}\n`);
