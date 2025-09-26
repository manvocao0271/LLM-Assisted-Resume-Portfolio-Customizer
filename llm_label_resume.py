from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from extract import extract_text_and_links, resolve_pdf_path, write_output

# Optional dependency on OpenAI SDK v1
try:
	from openai import OpenAI
except Exception:  # pragma: no cover
	OpenAI = None  # type: ignore


SYSTEM_PROMPT = (
	"You are a resume labeling assistant. Given the raw resume text, extract structured data.\n"
	"Return well-formed JSON only, with these fields when available: name, email(s), phone(s), urls, "
	"summary, education (list of entries with institution, degree, location, start_date, end_date, gpa, "
	"coursework[]), experience (list of entries with title, organization, location, start_date, end_date, "
	"achievements[]), projects (title, role, start_date, end_date, bullets[]), skills (list of strings).\n"
	"Dates should be ISO-like 'YYYY-MM' when months are known; use null otherwise. Use empty arrays for missing lists.\n"
)


@dataclass
class LLMContact:
	emails: List[str]
	phones: List[str]
	urls: List[str]


@dataclass
class LLMOutput:
	name: Optional[str]
	contact: LLMContact
	summary: List[str]
	education: List[Dict[str, Any]]
	experience: List[Dict[str, Any]]
	projects: List[Dict[str, Any]]
	skills: List[str]
	links: List[Dict[str, Any]]  # embedded links from PDF, passthrough for traceability


def call_openai(prompt: str, model: str = "gpt-4o-mini", base_url: str | None = None) -> str:
	api_key = os.getenv("OPENAI_API_KEY")
	if not api_key:
		raise RuntimeError("OPENAI_API_KEY not set. Export it to use LLM labeling.")
	if OpenAI is None:
		raise RuntimeError("openai package missing. Try: pip install openai>=1.41.0")
	client = OpenAI(api_key=api_key, base_url=base_url or os.getenv("OPENAI_BASE_URL") or None)
	resp = client.chat.completions.create(
		model=model,
		messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
		temperature=0.2,
	)
	return resp.choices[0].message.content or ""


def build_prompt(raw_text: str) -> str:
	preamble = (
		"Label the resume content below. Output JSON only, no prose. If unsure about a field, set it to null or [] as appropriate.\n\n"
	)
	return preamble + raw_text


def label_with_llm(pdf_path: Path, model: str, dry_run: bool, base_url: str | None = None) -> Dict[str, Any]:
	raw_text, links = extract_text_and_links(pdf_path)
	if dry_run:
		# Minimal stub output for verification without API calls
		return {
			"name": None,
			"contact": {"emails": [], "phones": [], "urls": []},
			"summary": [],
			"education": [],
			"experience": [],
			"projects": [],
			"skills": [],
			"embedded_links": links,
		}

	prompt = build_prompt(raw_text)
	content = call_openai(prompt, model=model, base_url=base_url)
	try:
		parsed = json.loads(content)
	except json.JSONDecodeError:
		raise RuntimeError("LLM returned non-JSON content. Try again or adjust the prompt.")
	parsed["embedded_links"] = links
	return parsed


def build_arg_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Label resume using an LLM against the extracted PDF text.")
	parser.add_argument("pdf_path", nargs="?", help="Path to the PDF file. If omitted, use the only PDF in CWD.")
	parser.add_argument("--model", default="gpt-4o-mini", help="LLM model name.")
	parser.add_argument("--base-url", default=os.getenv("OPENAI_BASE_URL", ""), help="Custom base URL for OpenAI-compatible endpoints (e.g., http://localhost:11434/v1 for Ollama, http://localhost:1234/v1 for LM Studio). Empty uses OpenAI's default.")
	parser.add_argument("--output-json", default="labeled_resume.json", help="Path for LLM-structured JSON output.")
	parser.add_argument("--dry-run", action="store_true", help="Do not call the LLM; output a stub JSON using extracted text headers.")
	parser.add_argument("--output-text", default="", help="Optional: also write extracted text with section breaks to this path.")
	return parser


def main(argv: Optional[List[str]] = None) -> int:
	parser = build_arg_parser()
	args = parser.parse_args(argv)

	pdf_path = resolve_pdf_path(args.pdf_path)
	result = label_with_llm(pdf_path=pdf_path, model=args.model, dry_run=bool(args.dry_run), base_url=args.base_url or None)
	out_path = Path(args.output_json).expanduser().resolve()
	out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
	print(f"LLM-labeled JSON written to {out_path}")
	# optional extracted text output
	if args.output_text:
		raw_text, links = extract_text_and_links(pdf_path)
		write_output(raw_text=raw_text, links=links, output_path=Path(args.output_text).expanduser().resolve())
		print(f"Extracted text written to {Path(args.output_text).expanduser().resolve()}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
