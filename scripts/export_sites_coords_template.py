#!/usr/bin/env python
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").split()).strip()


def infer_enclosure(name: str) -> str:
    text = clean_text(name)
    if not text:
        return ""
    direct = re.match(r"^\d+(?:\/@[\w.]+)?$", text)
    if direct:
        return text
    m = re.search(r"\b(\d+(?:\/@[\w.]+)?)\b", text)
    return m.group(1) if m else text


def fetch_sites(
    supabase_url: str,
    supabase_key: str,
    project_id: str | None,
    limit: int,
) -> list[dict[str, Any]]:
    base = supabase_url.rstrip("/")
    endpoint = f"{base}/rest/v1/sites"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Accept": "application/json",
    }
    select = "id,project_id,name,gps_lat,gps_lng,lat,lng,created_at"
    params: dict[str, str] = {
        "select": select,
        "order": "created_at.asc",
        "limit": str(limit),
    }
    if project_id:
        params["project_id"] = f"eq.{project_id}"

    query = urllib.parse.urlencode(params, safe=".,*()")
    url = f"{endpoint}?{query}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            status = getattr(resp, "status", 200)
    except Exception as exc:
        raise SystemExit(f"Supabase query failed: {exc}") from exc
    if status >= 400:
        raise SystemExit(f"Supabase query failed ({status}): {body}")
    data = json.loads(body)
    if not isinstance(data, list):
        raise SystemExit("Unexpected response from Supabase.")
    return data


def run(
    out_csv: Path,
    supabase_url: str,
    supabase_key: str,
    project_id: str | None,
    limit: int,
) -> None:
    rows = fetch_sites(supabase_url, supabase_key, project_id, limit)
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    headers = [
        "external_ref",
        "location_name",
        "enclosure",
        "latitude",
        "longitude",
        "job_map",
        "project_id",
        "site_id",
        "site_name",
    ]
    written = 0
    with out_csv.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for row in rows:
            name = clean_text(row.get("name", ""))
            enclosure = infer_enclosure(name)
            lat = row.get("gps_lat")
            lng = row.get("gps_lng")
            if lat is None:
                lat = row.get("lat")
            if lng is None:
                lng = row.get("lng")
            writer.writerow(
                {
                    "external_ref": "",
                    "location_name": enclosure or name,
                    "enclosure": enclosure,
                    "latitude": "" if lat is None else lat,
                    "longitude": "" if lng is None else lng,
                    "job_map": "",
                    "project_id": clean_text(row.get("project_id")),
                    "site_id": clean_text(row.get("id")),
                    "site_name": name,
                }
            )
            written += 1
    print(f"Wrote {written} rows to: {out_csv}")
    print("Fill 'job_map' and/or 'external_ref' to make matching stricter for Wired imports.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export current SpecCom sites into a coords CSV template for Wired production joins."
    )
    parser.add_argument("--out", required=True, help="Output CSV path.")
    parser.add_argument("--project-id", default="", help="Optional project UUID filter.")
    parser.add_argument("--limit", type=int, default=5000, help="Max sites to export.")
    parser.add_argument(
        "--supabase-url",
        default=os.getenv("SUPABASE_URL", "").strip(),
        help="Supabase project URL (or set SUPABASE_URL).",
    )
    parser.add_argument(
        "--supabase-key",
        default=(os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")).strip(),
        help="Supabase API key (prefer service role) or set SUPABASE_SERVICE_ROLE_KEY.",
    )
    args = parser.parse_args()

    if not args.supabase_url:
        raise SystemExit("Missing --supabase-url (or SUPABASE_URL env).")
    if not args.supabase_key:
        raise SystemExit("Missing --supabase-key (or SUPABASE_SERVICE_ROLE_KEY env).")

    run(
        out_csv=Path(args.out),
        supabase_url=args.supabase_url,
        supabase_key=args.supabase_key,
        project_id=args.project_id or None,
        limit=args.limit,
    )


if __name__ == "__main__":
    main()
