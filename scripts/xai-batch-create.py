#!/usr/bin/env python3
"""Smoke-test xAI Batch API: create an empty named batch.

Usage:
  set -a && source .env && set +a
  .venv-xai/bin/python scripts/xai-batch-create.py [batch_name]

Needs XAI_API_KEY in the environment (same key as the Node app).
Docs: https://docs.x.ai/developers/advanced-api-usage/batch-api
"""
from __future__ import annotations

import os
import sys

from xai_sdk import Client


def main() -> int:
    if not os.getenv("XAI_API_KEY"):
        print("XAI_API_KEY is not set", file=sys.stderr)
        return 1

    client = Client()
    info = client.auth.get_api_key_info()
    print(f"api_key name={info.name} team_id={info.team_id} team_blocked={info.team_blocked}")
    if info.team_blocked:
        print(
            "This API key's team is blocked (prepaid API credits / spend limit), "
            "not your Grok Business seat balance. Top up API credits or raise the "
            "invoiced spend limit for this team in https://console.x.ai → Billing.",
            file=sys.stderr,
        )
        return 2

    name = sys.argv[1] if len(sys.argv) > 1 else "your_first_batch"
    batch = client.batch.create(batch_name=name)
    print(f"Created new batch: {batch}")
    batch_id = getattr(batch, "batch_id", None)
    if batch_id:
        print(f"batch_id={batch_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
