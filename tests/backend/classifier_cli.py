#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import textwrap
from pathlib import Path
from typing import Any

from backend.app import _normalize_job_description, _normalized_payload

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_RESUME_FIXTURE = PACKAGE_ROOT / "labeled_resume.json"


def _load_fixture(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise SystemExit(f"Unable to find fixture at {path}. Run the parser once (dry-run) to generate it.") from exc


def _describe_classifier(label: str, classifier: dict[str, Any]) -> str:
    lines: list[str] = [f"{label}"]
    lines.append(f"  Category: {classifier.get('category', 'General')} ({classifier.get('category_id', 'general')})")
    confidence = classifier.get("confidence")
    if isinstance(confidence, (int, float)):
        lines.append(f"  Confidence: {round(confidence * 100, 1)}%")
    matches = classifier.get("matches") or []
    if matches:
        lines.append(f"  Matches: {', '.join(str(m) for m in matches[:6])}")
    similarity = classifier.get("similarity")
    if similarity is not None:
        lines.append(f"  Semantic similarity: {round(similarity, 3)}")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate the job-type classifiers offline using a JSON fixture.")
    parser.add_argument(
        "--resume-json",
        type=Path,
        default=DEFAULT_RESUME_FIXTURE,
        help="Path to the parsed résumé JSON output (default: labeled_resume.json)",
    )
    parser.add_argument(
        "--job-description",
        type=str,
        default="",
        help="Optional job description text to include for the job-type classifier",
    )
    parser.add_argument(
        "--job-description-file",
        type=Path,
        help="Path to a text file with the job description (overrides --job-description)",
    )
    args = parser.parse_args()

    resume_payload = _load_fixture(args.resume_json)
    job_description = args.job_description
    if args.job_description_file:
        job_description = args.job_description_file.read_text(encoding="utf-8").strip()

    if job_description:
        resume_payload["job_description"] = job_description

    normalized = _normalized_payload(resume_payload)
    job_classifier = normalized.get("job_type") or {}
    resume_classifier = normalized.get("resume_job_type") or {}

    print("Job classifier results")
    print(_describe_classifier("Job description classifier", job_classifier))
    print()
    print("Résumé classifier results")
    print(_describe_classifier("Résumé classifier", resume_classifier))
    print()
    summary = normalized.get("summary")
    if summary:
        print("Normalized résumé summary:")
        print(textwrap.indent(summary.strip(), "  "))
    print()
    print(f"Job description passed to the classifier ({len(job_description)} characters):")
    print(textwrap.indent(_normalize_job_description(job_description), "  "))


if __name__ == "__main__":
    main()
