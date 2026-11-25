#!/usr/bin/env python3
"""Generate index.json for Umefor Library extension repository."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXTENSIONS_DIR = ROOT / "extensions"
OUTPUT_FILE = ROOT / "index.json"

REPO_NAME = "Umefor Library Official Extensions"
REPO_DESCRIPTION = (
    "Kho nguồn mở rộng chính thức cho Umefor Library "
    "(Truyện chữ, Truyện tranh, Ebook & Sách nói)."
)
ISSUE_TEMPLATE_URL = (
    "https://github.com/umefor-labs/umefor-library-extensions/issues/new"
    "?template=request-source.yml"
)


def compute_normalized_sha256(path: Path) -> str:
    raw = path.read_text(encoding="utf-8")
    normalized = raw.replace("\r\n", "\n")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def build_index() -> dict:
    entries: list[dict] = []
    manifest_paths = sorted(
        EXTENSIONS_DIR.glob("*/manifest.json"),
        key=lambda p: p.parent.name,
    )
    for manifest_path in manifest_paths:
        ext_dir = manifest_path.parent
        plugin_path = ext_dir / "plugin.js"
        if not plugin_path.is_file():
            raise FileNotFoundError(f"Missing plugin.js in {ext_dir}")

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        ext_id = manifest["id"]
        sha256 = compute_normalized_sha256(plugin_path)

        entries.append(
            {
                "id": ext_id,
                "name": manifest["name"],
                "mediaType": manifest["mediaType"],
                "lang": manifest.get("lang", "vi"),
                "version": int(manifest["version"]),
                "minAppApi": int(manifest.get("minAppApi", 1)),
                "baseUrl": manifest["baseUrl"].rstrip("/"),
                "description": manifest.get("description", ""),
                "scriptPath": f"extensions/{ext_id}/plugin.js",
                "sha256": sha256,
                "iconUrl": manifest.get("iconUrl", ""),
                "changelog": manifest.get("changelog", ""),
                "nsfw": bool(manifest.get("nsfw", False)),
            }
        )

    entries.sort(key=lambda item: item["id"])
    return {
        "schemaVersion": 1,
        "repoName": REPO_NAME,
        "repoDescription": REPO_DESCRIPTION,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "issueTemplateUrl": ISSUE_TEMPLATE_URL,
        "extensions": entries,
    }


def main() -> None:
    index_data = build_index()
    if OUTPUT_FILE.exists():
        try:
            existing = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
            if existing.get("extensions") == index_data["extensions"] and (
                existing.get("repoName") == index_data["repoName"]
                and existing.get("repoDescription") == index_data["repoDescription"]
                and existing.get("issueTemplateUrl") == index_data["issueTemplateUrl"]
            ):
                index_data["generatedAt"] = existing.get(
                    "generatedAt", index_data["generatedAt"]
                )
        except Exception:
            pass

    serialized = json.dumps(index_data, ensure_ascii=False, indent=2) + "\n"
    OUTPUT_FILE.write_text(serialized, encoding="utf-8", newline="\n")
    print(f"Generated {OUTPUT_FILE} with {len(index_data['extensions'])} extensions.")


if __name__ == "__main__":
    main()
