import { afterEach, describe, expect, it } from "vitest";

import {
  hashRelicPhrase,
  normalizeRelicPhrase,
  relicAnswerConfigured,
  relicPhraseMatches,
} from "./relic.server";

describe("relic phrase", () => {
  afterEach(() => {
    delete process.env["RELIC_ANSWER_HASH"];
  });

  it("normalizes whitespace and case", () => {
    expect(normalizeRelicPhrase("  Foo   BAR ")).toBe("foo bar");
  });

  it("keeps punctuation", () => {
    expect(normalizeRelicPhrase("Hello/World")).toBe("hello/world");
  });

  it("hashes stably across normalize", () => {
    expect(hashRelicPhrase("x")).toBe(hashRelicPhrase(" X "));
  });

  it("does not match when the env hash is missing", () => {
    delete process.env["RELIC_ANSWER_HASH"];
    expect(relicAnswerConfigured()).toBe(false);
    expect(relicPhraseMatches("")).toBe(false);
    expect(relicPhraseMatches("anything")).toBe(false);
  });

  it("matches only the hashed phrase", () => {
    const phrase = "dummy-fixture-not-the-hunt";
    process.env["RELIC_ANSWER_HASH"] = hashRelicPhrase(phrase);
    expect(relicAnswerConfigured()).toBe(true);
    expect(relicPhraseMatches(phrase)).toBe(true);
    expect(relicPhraseMatches(` ${phrase.toUpperCase()} `)).toBe(true);
    expect(relicPhraseMatches("wrong")).toBe(false);
  });
});
