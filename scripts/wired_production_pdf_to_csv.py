#!/usr/bin/env python
from __future__ import annotations

import argparse
import csv
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

import pdfplumber


CODE_QTY_RE = re.compile(r"(.+?)\s*\[(\d+)\]\s*$")


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").split()).strip()


def parse_codes(codes_raw: str) -> list[tuple[str, int]]:
    parts = [clean_text(p) for p in str(codes_raw or "").split(",")]
    result: list[tuple[str, int]] = []
    for part in parts:
        if not part:
            continue
        m = CODE_QTY_RE.match(part)
        if m:
            code = clean_text(m.group(1))
            qty = int(m.group(2))
        else:
            code = part
            qty = 1
        if code:
            result.append((code, qty))
    return result


def extract_rows(pdf_path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables() or []
            for table in tables:
                if not table:
                    continue
                for raw_row in table[1:]:
                    if not raw_row or len(raw_row) < 5:
                        continue
                    job_map = clean_text(raw_row[0])
                    enclosure = clean_text(raw_row[1])
                    tech = clean_text(raw_row[2])
                    date = clean_text(raw_row[3])
                    codes_raw = clean_text(raw_row[4])
                    test_raw = clean_text(raw_row[5] if len(raw_row) > 5 else "")
                    if not job_map or job_map.lower() == "job/map":
                        continue
                    if job_map.lower().startswith("production summary"):
                        continue
                    external_ref = f"{job_map}|{enclosure}"
                    code_pairs = parse_codes(codes_raw)
                    billing_codes = sorted({code for code, _ in code_pairs})
                    rows.append(
                        {
                            "job_map": job_map,
                            "enclosure": enclosure,
                            "external_ref": external_ref,
                            "tech": tech,
                            "date": date,
                            "codes_raw": codes_raw,
                            "test": test_raw,
                            "code_pairs": code_pairs,
                            "billing_codes": billing_codes,
                        }
                    )
    return rows


def normalize_key(value: str) -> str:
    return clean_text(value).lower()


def load_coords_map(coords_csv: Path | None) -> dict[str, tuple[str, str]]:
    if not coords_csv:
        return {}
    key_to_coords: dict[str, tuple[str, str]] = {}
    with coords_csv.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = [normalize_key(h) for h in (reader.fieldnames or [])]
        hdr_map = {normalize_key(h): h for h in (reader.fieldnames or [])}

        def find_header(candidates: list[str]) -> str | None:
            for c in candidates:
                if c in headers:
                    return hdr_map[c]
            return None

        lat_h = find_header(["latitude", "lat", "gps_lat"])
        lng_h = find_header(["longitude", "lng", "gps_lng"])
        if not lat_h or not lng_h:
            raise SystemExit("coords CSV is missing latitude/longitude headers.")
        key_headers = [
            find_header(["external_ref"]),
            find_header(["location_name"]),
            find_header(["enclosure"]),
            find_header(["name"]),
        ]
        key_headers = [h for h in key_headers if h]
        if not key_headers:
            raise SystemExit("coords CSV must include one of: external_ref, location_name, enclosure, name.")

        for row in reader:
            lat = clean_text(row.get(lat_h, ""))
            lng = clean_text(row.get(lng_h, ""))
            if not lat or not lng:
                continue
            for h in key_headers:
                key_val = normalize_key(row.get(h, ""))
                if key_val:
                    key_to_coords[key_val] = (lat, lng)
    return key_to_coords


def build_import_rows(
    production_rows: list[dict[str, Any]],
    coords_map: dict[str, tuple[str, str]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    all_rows: list[dict[str, Any]] = []
    app_rows: list[dict[str, Any]] = []
    missing_coords: list[dict[str, Any]] = []

    for src in production_rows:
        lat = ""
        lng = ""
        for key in (
            normalize_key(src["external_ref"]),
            normalize_key(src["enclosure"]),
            normalize_key(src["job_map"]),
        ):
            if key in coords_map:
                lat, lng = coords_map[key]
                break

        notes = f"Wired production import | job_map={src['job_map']} | enclosure={src['enclosure']} | tech={src['tech']} | date={src['date']}"
        row: dict[str, Any] = {
            "location_name": src["enclosure"] or src["external_ref"],
            "latitude": lat,
            "longitude": lng,
            "progress_notes": notes,
            "billing_codes": ", ".join(src["billing_codes"]),
            "external_ref": src["external_ref"],
            "job_map": src["job_map"],
            "enclosure": src["enclosure"],
            "production_date": src["date"],
            "tech": src["tech"],
            "codes_raw": src["codes_raw"],
        }
        for idx, (code, qty) in enumerate(src["code_pairs"], start=1):
            row[f"item_{idx}"] = code
            row[f"qty_{idx}"] = qty

        all_rows.append(row)
        if lat and lng:
            app_rows.append(row)
        else:
            missing_coords.append(row)

    return all_rows, app_rows, missing_coords


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    all_headers: list[str] = []
    for row in rows:
        for key in row.keys():
            if key not in all_headers:
                all_headers.append(key)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=all_headers)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def run(pdf_path: Path, out_dir: Path, coords_csv: Path | None) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    production_rows = extract_rows(pdf_path)
    coords_map = load_coords_map(coords_csv)
    all_rows, app_rows, missing_coords = build_import_rows(production_rows, coords_map)

    stem = pdf_path.stem
    all_path = out_dir / f"{stem}__normalized.csv"
    app_path = out_dir / f"{stem}__app_import_ready.csv"
    missing_path = out_dir / f"{stem}__missing_coords.csv"

    write_csv(all_path, all_rows)
    write_csv(app_path, app_rows)
    write_csv(missing_path, missing_coords)

    by_map = Counter([r["job_map"] for r in production_rows])
    print(f"Source PDF: {pdf_path}")
    print(f"Rows extracted: {len(production_rows)}")
    print(f"Unique Job/Map IDs: {len(by_map)}")
    print("Top Job/Map IDs:", by_map.most_common(8))
    print(f"Coords map keys: {len(coords_map)}")
    print(f"Output (all rows): {all_path}")
    print(f"Output (app import ready): {app_path}")
    print(f"Output (missing coords): {missing_path}")
    print(f"Rows ready for app import: {len(app_rows)}")
    print(f"Rows missing coords: {len(missing_coords)}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert Wired production PDF into import-ready CSV for SpecCom."
    )
    parser.add_argument("--pdf", required=True, help="Path to Wired production PDF.")
    parser.add_argument(
        "--out",
        default=str(Path("project_uploads") / f"wired_production_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
        help="Output directory.",
    )
    parser.add_argument(
        "--coords-csv",
        default="",
        help="Optional CSV with coordinates keyed by external_ref or location_name/enclosure.",
    )
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        raise SystemExit(f"PDF not found: {pdf_path}")
    out_dir = Path(args.out)
    coords_csv = Path(args.coords_csv) if args.coords_csv else None
    if coords_csv and not coords_csv.exists():
        raise SystemExit(f"coords CSV not found: {coords_csv}")

    run(pdf_path, out_dir, coords_csv)


if __name__ == "__main__":
    main()
