#!/usr/bin/env bash
# Recompress public stills (JPEG/PNG/WebP) for faster loads. Requires ImageMagick (`magick`).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 <<'PY'
import subprocess, tempfile
from pathlib import Path

root = Path("public")
before = sum(p.stat().st_size for p in root.rglob("*") if p.is_file())
jpg_q = {"hood": 85, "brand": 82, "og": 80, "share": 82, "collection": 82}
optimized = saved = 0

for path in sorted(root.rglob("*")):
    if not path.is_file():
        continue
    suf = path.suffix.lower()
    if suf not in {".jpg", ".jpeg", ".png", ".webp"}:
        continue
    size = path.stat().st_size
    rel = path.relative_to(root).as_posix()
    top = rel.split("/", 1)[0] if "/" in rel else ""
    with tempfile.NamedTemporaryFile(suffix=suf, delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        if suf in {".jpg", ".jpeg"}:
            q = jpg_q.get(top, 82)
            maxw = 800 if top == "hood" else (1200 if top == "og" else (1600 if top in {"brand", "funnels"} else 1400))
            cmd = [
                "magick", str(path), "-auto-orient", "-strip",
                "-resize", f"{maxw}x{maxw}>",
                "-sampling-factor", "4:2:0", "-interlace", "Plane",
                "-quality", str(q), str(tmp_path),
            ]
        elif suf == ".png":
            maxw = 640 if top in {"stickers", "crew"} else 1200
            cmd = [
                "magick", str(path), "-auto-orient", "-strip",
                "-resize", f"{maxw}x{maxw}>",
                "-define", "png:compression-level=9",
                "-define", "png:compression-filter=5",
                str(tmp_path),
            ]
        else:
            cmd = ["magick", str(path), "-strip", "-quality", "80", str(tmp_path)]
        subprocess.run(cmd, check=True, capture_output=True)
        new_size = tmp_path.stat().st_size
        if new_size > 0 and new_size < size * 0.98:
            path.write_bytes(tmp_path.read_bytes())
            saved += size - new_size
            optimized += 1
            print(f"OK {rel}: {size // 1024}K → {new_size // 1024}K")
    except Exception as e:
        print(f"ERR {rel}: {e}")
    finally:
        tmp_path.unlink(missing_ok=True)

after = sum(p.stat().st_size for p in root.rglob("*") if p.is_file())
print(f"optimized={optimized} saved_kb={saved // 1024} before={before // 1024}K after={after // 1024}K")
PY
