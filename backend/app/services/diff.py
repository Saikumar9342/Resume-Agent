"""Generates diff patches between original and suggested resume content."""

import difflib
import json
from typing import Any


def _flatten(obj: Any, prefix: str = "") -> dict[str, str]:
    """Flatten nested dict/list into dot-notation paths."""
    items = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            items.update(_flatten(v, f"{prefix}.{k}" if prefix else k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            items.update(_flatten(v, f"{prefix}[{i}]"))
    else:
        items[prefix] = str(obj) if obj is not None else ""
    return items


def generate_diff_patches(original: dict, suggested: dict) -> list[dict]:
    orig_flat = _flatten(original)
    sugg_flat = _flatten(suggested)

    patches = []
    all_keys = set(orig_flat) | set(sugg_flat)

    for key in sorted(all_keys):
        orig_val = orig_flat.get(key, "")
        sugg_val = sugg_flat.get(key, "")

        if orig_val == sugg_val:
            continue

        diff = list(difflib.unified_diff(
            orig_val.splitlines(),
            sugg_val.splitlines(),
            lineterm="",
        ))

        patches.append({
            "path": key,
            "original": orig_val,
            "suggested": sugg_val,
            "diff": "\n".join(diff),
            "type": "modified" if orig_val else "added",
        })

    return patches
