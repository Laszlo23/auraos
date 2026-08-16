#!/usr/bin/env python3
"""Capture Aura Local phone screenshots into docs/deck-lokal/."""

from __future__ import annotations

import json
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:4000"
OUT = Path(__file__).resolve().parents[1] / "docs" / "deck-lokal"
SESSION_FILE = Path("/tmp/lokal-session.json")
STORAGE_KEY = "sb-fjmrlnwqzjhyzerruhsq-auth-token"


def wait_ready(page, needle: str, timeout_ms: int = 25000) -> None:
    page.wait_for_function(
        """(needle) => document.body && document.body.innerText.includes(needle)""",
        arg=needle,
        timeout=timeout_ms,
    )
    time.sleep(0.5)


def shot(page, name: str) -> None:
    path = OUT / name
    page.screenshot(path=str(path), full_page=False, type="png")
    print(f"wrote {path} ({path.stat().st_size} bytes)")


def inject_session(page) -> None:
    session = json.loads(SESSION_FILE.read_text())
    # Supabase SSR/client expects this shape in localStorage
    payload = {
        "access_token": session["access_token"],
        "refresh_token": session["refresh_token"],
        "expires_in": session.get("expires_in", 3600),
        "expires_at": session.get("expires_at"),
        "token_type": session.get("token_type", "bearer"),
        "user": session.get("user"),
    }
    page.goto(f"{BASE}/lokal", wait_until="domcontentloaded")
    page.evaluate(
        """([key, value]) => { localStorage.setItem(key, JSON.stringify(value)); }""",
        [STORAGE_KEY, payload],
    )
    print("session injected")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if not SESSION_FILE.exists():
        raise SystemExit(f"Missing {SESSION_FILE} — password-grant session first")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        page = context.new_page()

        page.goto(f"{BASE}/lokal", wait_until="networkidle")
        wait_ready(page, "Dein lokales Geschäft")
        shot(page, "01-lokal-landing.png")

        page.goto(f"{BASE}/b/salon-mira-test", wait_until="networkidle")
        wait_ready(page, "Salon Mira")
        shot(page, "10-public-card.png")

        inject_session(page)

        tabs = [
            ("/heute", "Nächster Schritt", "05-heute.png"),
            ("/social", "Kanäle", "06-social.png"),
            ("/kunden", "Neukunden", "07-kunden.png"),
            ("/bewertungen", "Google Review Boost", "08-bewertungen.png"),
            ("/boost", "Boost", "09-boost.png"),
        ]
        for path, needle, filename in tabs:
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
            try:
                wait_ready(page, needle)
            except Exception:
                time.sleep(3)
                body = page.inner_text("body")
                print(f"warn {path}: needle={needle!r} url={page.url} sample={body[:220]!r}")
                page.screenshot(path=str(OUT / f"debug-{filename}"))
            shot(page, filename)

        browser.close()
        print("done")


if __name__ == "__main__":
    main()
