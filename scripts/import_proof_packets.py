#!/usr/bin/env python
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Any

from PIL import ExifTags, Image


MIN_JPEG_BYTES = 15_000


def sanitize_slug(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return slug or "unknown"


def parse_source_name(pdf_name: str) -> tuple[str, str | None, int | None]:
    stem = Path(pdf_name).stem
    match = re.match(r"^\s*([A-Za-z]{1,4})\s+(.+?)\s*(?:\((\d+)\))?\s*$", stem)
    if not match:
        return stem.strip(), None, None
    code = match.group(1).strip().upper()
    location = match.group(2).strip()
    reported = int(match.group(3)) if match.group(3) else None
    return location, code, reported


def exif_tag_lookup() -> dict[str, int]:
    return {name: tag for tag, name in ExifTags.TAGS.items()}


def gps_to_decimal(gps_info: dict[int, Any]) -> tuple[float | None, float | None]:
    def rational_to_float(value: Any) -> float:
        if isinstance(value, tuple) and len(value) == 2:
            return float(value[0]) / float(value[1]) if value[1] else 0.0
        if hasattr(value, "numerator") and hasattr(value, "denominator"):
            return float(value.numerator) / float(value.denominator) if value.denominator else 0.0
        return float(value)

    def dms_to_decimal(values: Any, ref: str | bytes | None) -> float | None:
        if not values or len(values) < 3:
            return None
        degrees = rational_to_float(values[0])
        minutes = rational_to_float(values[1])
        seconds = rational_to_float(values[2])
        decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
        ref_text = ref.decode() if isinstance(ref, bytes) else str(ref or "")
        if ref_text.upper() in {"S", "W"}:
            decimal *= -1
        return decimal

    lat = dms_to_decimal(gps_info.get(2), gps_info.get(1))
    lng = dms_to_decimal(gps_info.get(4), gps_info.get(3))
    return lat, lng


@dataclass
class PhotoRecord:
    file_name: str
    relative_path: str
    sha1: str
    size_bytes: int
    width: int | None
    height: int | None
    captured_at: str | None
    gps_lat: float | None
    gps_lng: float | None


def extract_exif_metadata(image_bytes: bytes) -> dict[str, Any]:
    result: dict[str, Any] = {
        "width": None,
        "height": None,
        "captured_at": None,
        "gps_lat": None,
        "gps_lng": None,
    }
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            result["width"] = img.width
            result["height"] = img.height
            exif = img.getexif() or {}
            tags = exif_tag_lookup()
            dt_tag = tags.get("DateTimeOriginal")
            fallback_dt_tag = tags.get("DateTime")
            captured = exif.get(dt_tag) if dt_tag else None
            if not captured and fallback_dt_tag:
                captured = exif.get(fallback_dt_tag)
            if captured:
                captured_text = captured.decode() if isinstance(captured, bytes) else str(captured)
                result["captured_at"] = captured_text.replace(":", "-", 2)
            gps_tag = tags.get("GPSInfo")
            gps_raw = exif.get(gps_tag) if gps_tag else None
            if isinstance(gps_raw, dict):
                lat, lng = gps_to_decimal(gps_raw)
                result["gps_lat"] = lat
                result["gps_lng"] = lng
    except Exception:
        return result
    return result


def extract_jpegs_from_pdf_bytes(pdf_bytes: bytes) -> list[bytes]:
    images: list[bytes] = []
    cursor = 0
    while True:
        start = pdf_bytes.find(b"\xff\xd8", cursor)
        if start < 0:
            break
        end = pdf_bytes.find(b"\xff\xd9", start + 2)
        if end < 0:
            break
        chunk = pdf_bytes[start : end + 2]
        cursor = end + 2
        if len(chunk) < MIN_JPEG_BYTES:
            continue
        images.append(chunk)
    return images


def write_seed_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    headers = ["location_name", "latitude", "longitude", "notes", "source_pdf"]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def run(pdf_paths: list[Path], out_root: Path) -> None:
    out_root.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, Any] = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "files": [],
    }
    seed_rows: list[dict[str, Any]] = []

    for pdf_path in pdf_paths:
        pdf_bytes = pdf_path.read_bytes()
        location_name, prefix_code, reported_count = parse_source_name(pdf_path.name)
        location_slug = sanitize_slug(location_name)
        location_dir = out_root / location_slug
        location_dir.mkdir(parents=True, exist_ok=True)

        raw_images = extract_jpegs_from_pdf_bytes(pdf_bytes)
        dedupe: set[str] = set()
        photo_records: list[PhotoRecord] = []
        first_lat = None
        first_lng = None

        for idx, chunk in enumerate(raw_images, start=1):
            sha1 = hashlib.sha1(chunk).hexdigest()
            if sha1 in dedupe:
                continue
            dedupe.add(sha1)

            image_meta = extract_exif_metadata(chunk)
            if first_lat is None and image_meta.get("gps_lat") is not None:
                first_lat = image_meta["gps_lat"]
            if first_lng is None and image_meta.get("gps_lng") is not None:
                first_lng = image_meta["gps_lng"]

            file_name = f"{location_slug}__proof_{idx:02d}.jpg"
            output_path = location_dir / file_name
            output_path.write_bytes(chunk)

            photo_records.append(
                PhotoRecord(
                    file_name=file_name,
                    relative_path=str(output_path.relative_to(out_root)).replace("\\", "/"),
                    sha1=sha1,
                    size_bytes=len(chunk),
                    width=image_meta.get("width"),
                    height=image_meta.get("height"),
                    captured_at=image_meta.get("captured_at"),
                    gps_lat=image_meta.get("gps_lat"),
                    gps_lng=image_meta.get("gps_lng"),
                )
            )

        manifest["files"].append(
            {
                "source_pdf": str(pdf_path),
                "source_pdf_name": pdf_path.name,
                "prefix_code": prefix_code,
                "location_name": location_name,
                "reported_count_hint": reported_count,
                "extracted_photos": len(photo_records),
                "photos": [asdict(r) for r in photo_records],
            }
        )

        seed_rows.append(
            {
                "location_name": location_name,
                "latitude": first_lat if first_lat is not None else "",
                "longitude": first_lng if first_lng is not None else "",
                "notes": f"Imported from {pdf_path.name}",
                "source_pdf": pdf_path.name,
            }
        )

    manifest_path = out_root / "proof_packets_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    seed_csv_path = out_root / "locations_seed_from_packets.csv"
    write_seed_csv(seed_csv_path, seed_rows)

    print(f"Output folder: {out_root}")
    print(f"Manifest: {manifest_path}")
    print(f"Seed CSV: {seed_csv_path}")
    for item in manifest["files"]:
        print(
            f"- {item['source_pdf_name']}: "
            f"location='{item['location_name']}', photos={item['extracted_photos']}"
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract proof photos from PM PDF packets and generate import manifest/seed CSV."
    )
    parser.add_argument(
        "--input",
        nargs="+",
        required=True,
        help="One or more PDF file paths.",
    )
    parser.add_argument(
        "--out",
        default=str(Path("project_uploads") / f"packet_import_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
        help="Output directory root for extracted photos and manifests.",
    )
    args = parser.parse_args()

    pdf_paths = [Path(p) for p in args.input]
    missing = [str(p) for p in pdf_paths if not p.exists()]
    if missing:
        raise SystemExit(f"Missing input files: {missing}")
    out_root = Path(args.out)
    run(pdf_paths, out_root)


if __name__ == "__main__":
    main()
