from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

# PDF extraction dependencies
from PyPDF2 import PdfReader

# Load .env if present (override any previously exported vars for this process)
try:  # lightweight optional dependency
	from dotenv import load_dotenv  # type: ignore
	load_dotenv(override=True)
except Exception:
	pass

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
	"achievements[]), projects (title, role, start_date, end_date, bullets[]), skills (list of strings), etc.\n"
	"Dates should be ISO-like 'YYYY-MM' when months are known; use null otherwise. Use empty arrays for missing lists.\n"
)

# ---- Minimal PDF extraction (inlined) ----

def _extract_links_from_page(page, page_number: int) -> list[dict[str, str | int]]:
	links: list[dict[str, str | int]] = []
	annotations = page.get("/Annots")
	if not annotations:
		return links

	for annotation in annotations:
		annot_obj = annotation.get_object()
		subtype = annot_obj.get("/Subtype")
		if subtype != "/Link":
			continue

		action = annot_obj.get("/A")
		uri = None
		if action and action.get("/S") == "/URI":
			uri = action.get("/URI")
		else:
			uri = annot_obj.get("/URI")

		if not uri:
			continue

		label = annot_obj.get("/Contents") or annot_obj.get("/T")
		entry: dict[str, str | int] = {
			"url": str(uri),
			"page": page_number,
		}
		if label:
			entry["label"] = str(label)
		links.append(entry)

	return links


def _deduplicate_links(links: List[dict[str, str | int]]) -> List[dict[str, str | int]]:
	unique: list[dict[str, str | int]] = []
	seen: set[tuple[str, int | None]] = set()
	for link in links:
		url = str(link.get("url"))
		page = link.get("page")
		fingerprint = (url, int(page) if isinstance(page, int) else None)
		if fingerprint in seen:
			continue
		seen.add(fingerprint)
		unique.append({k: v for k, v in link.items() if v is not None})
	return unique


def extract_text_and_links(pdf_path: Path) -> tuple[str, list[dict[str, str | int]]]:
	reader = PdfReader(str(pdf_path))
	pieces: list[str] = []
	links: list[dict[str, str | int]] = []

	for page_number, page in enumerate(reader.pages, start=1):
		page_text = page.extract_text() or ""
		if not page_text.strip():
			pieces.append(f"\n[Page {page_number} had no extractable text]\n")
		else:
			pieces.append(page_text)
		links.extend(_extract_links_from_page(page, page_number))

	return "\n".join(pieces), _deduplicate_links(links)


def resolve_pdf_path(provided_path: str | None) -> Path:
	if provided_path:
		candidate = Path(provided_path).expanduser().resolve()
		if not candidate.exists():
			raise FileNotFoundError(f"PDF file not found: {candidate}")
		if candidate.suffix.lower() != ".pdf":
			raise ValueError("The input file must be a PDF")
		return candidate

	pdfs = sorted(Path.cwd().glob("*.pdf"))
	if not pdfs:
		raise FileNotFoundError("No PDF files found in the current directory")
	if len(pdfs) > 1:
		raise ValueError("Multiple PDF files detected. Please specify which PDF to process with the positional argument.")
	return pdfs[0].resolve()
def call_openai(prompt: str, model: str = "gpt-4o-mini", base_url: str | None = None) -> str:
	api_key = os.getenv("OPENAI_API_KEY")
	if not api_key:
		raise RuntimeError("OPENAI_API_KEY not set. Export it to use LLM labeling.")
	if OpenAI is None:
		raise RuntimeError("openai package missing. Try: pip install openai>=1.41.0")
	effective_base = base_url or os.getenv("OPENAI_BASE_URL") or None
	client = OpenAI(api_key=api_key, base_url=effective_base)

	kwargs: Dict[str, Any] = {
		"model": model,
		"messages": [
			{"role": "system", "content": SYSTEM_PROMPT},
			{"role": "user", "content": prompt},
		],
		"temperature": 0.2,
		"max_tokens": 1200,
	}
	# Request strict JSON output for OpenAI cloud and Groq (supports OpenAI-compatible response_format)
	force_json = os.getenv("FORCE_JSON", "1").strip() not in {"0", "false", "False"}
	if force_json and (effective_base is None or (isinstance(effective_base, str) and "groq.com" in effective_base)):
		kwargs["response_format"] = {"type": "json_object"}

	try:
		resp = client.chat.completions.create(**kwargs)
	except Exception as err:
		# If provider doesn't support response_format, retry without it
		if "response_format" in kwargs:
			kwargs.pop("response_format", None)
			resp = client.chat.completions.create(**kwargs)
		else:
			raise
	return resp.choices[0].message.content or ""


def build_prompt(raw_text: str) -> str:
	preamble = (
		"Label the resume content below. Output JSON only, no prose. If unsure about a field, set it to null or [] as appropriate.\n\n"
	)
	return preamble + raw_text


def _coerce_json(content: str) -> Dict[str, Any]:
	text = (content or "").strip()
	# Strip Markdown code fences if present
	if text.startswith("```"):
		# remove first fence line
		first_newline = text.find("\n")
		if first_newline != -1:
			text = text[first_newline + 1 :]
		# remove trailing fence
		if text.endswith("```"):
			text = text[: -3]
		text = text.strip()
		# drop a leading json language tag if present
		if text.lower().startswith("json\n"):
			text = text[5:]
			text = text.strip()
	# Heuristic: take the largest {...} block
	if text and (text[0] != "{" or text[-1] != "}"):
		start = text.find("{")
		end = text.rfind("}")
		if start != -1 and end != -1 and end > start:
			text = text[start : end + 1]
	return json.loads(text)


def label_with_llm(pdf_path: Path, model: str, dry_run: bool, base_url: str | None = None) -> Dict[str, Any]:
	raw_text, links = extract_text_and_links(pdf_path)
	if dry_run:
		# When dry running, try to surface realistic data so the UI can be exercised.
		sample_path = Path("labeled_resume.json")
		if sample_path.exists():
			try:
				sample = json.loads(sample_path.read_text(encoding="utf-8"))
				sample.setdefault("embedded_links", links)
				return sample
			except Exception:
				pass

		# Built-in illustrative payload if no saved sample is available
		return {
			"name": "Jordan Rivers",
			"contact": {
				"emails": ["jordan.rivers@example.com"],
				"phones": ["(123) 456-7890"],
				"urls": ["https://www.linkedin.com/in/", "https://github.com/"],
			},
			"summary": [
				"Full-stack engineer focused on AI-assisted productivity tools.",
				"Ships resilient systems, pairs with design to polish UX, and loves rapid experiments.",
			],
			"education": [
				{
					"institution": "Stanford University",
					"degree": "B.S. Computer Science",
					"location": "Stanford, CA",
					"start_date": "2015-09",
					"end_date": "2019-06",
					"gpa": "3.8/4.0",
					"coursework": ["Machine Learning", "Human-Computer Interaction"],
				}
			],
			"experience": [
				{
					"title": "Senior Software Engineer",
					"organization": "Nebula Labs",
					"location": "San Francisco, CA",
					"start_date": "2022-03",
					"end_date": None,
					"achievements": [
						"Led a cross-functional squad building an AI note-taking assistant adopted by 50k users in beta.",
						"Reduced average response latency by 35% through prompt caching and async streaming.",
						"Mentored 5 engineers, instituting pairing sessions and shared architecture decision records.",
					],
				},
				{
					"title": "Software Engineer",
					"organization": "Atlas Analytics",
					"location": "Remote",
					"start_date": "2019-07",
					"end_date": "2022-02",
					"achievements": [
						"Built real-time dashboards with FastAPI and React processing 5M events/hour.",
						"Introduced contract tests and CI pipelines, cutting production incidents by 40%.",
					],
				},
			],
			"projects": [
				{
					"title": "Open Source Prompt Playground",
					"role": "Creator",
					"start_date": "2023-01",
					"end_date": "2023-06",
					"bullets": [
						"Developed a web sandbox for comparing LLM prompts with shareable snapshots.",
						"Implemented plugin system allowing the community to add providers and templates.",
					],
				},
				{
					"title": "Hackathon: City Bikes Availability Predictor",
					"role": "Team Lead",
					"start_date": "2021-10",
					"end_date": "2021-11",
					"bullets": [
						"Trained gradient-boosted models forecasting bike availability with 89% accuracy.",
						"Deployed lightweight inference service with auto-refreshing dashboard widgets.",
					],
				},
			],
			"skills": [
				"Python",
				"TypeScript",
				"React",
				"FastAPI",
				"PostgreSQL",
				"Redis",
				"Docker",
				"Kubernetes",
				"LangChain",
				"OpenAI API",
			],
			"embedded_links": links,
		}

	prompt = build_prompt(raw_text)
	content = call_openai(prompt, model=model, base_url=base_url)
	try:
		parsed = _coerce_json(content)
	except Exception:
		# Optionally write raw content for debugging when DEBUG is set
		if os.getenv("DEBUG_JSON", "").strip():
			Path("llm_raw.txt").write_text(content or "", encoding="utf-8")
		raise RuntimeError("LLM returned non-JSON content. Try again or adjust the prompt.")
	parsed["embedded_links"] = links
	return parsed


def build_arg_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Label resume using an LLM against the extracted PDF text.")
	parser.add_argument("pdf_path", nargs="?", help="Path to the PDF file. If omitted, use the only PDF in CWD.")
	default_model = os.getenv("MODEL_NAME", "gpt-4o-mini")
	parser.add_argument("--model", default=default_model, help="LLM model name (can also set MODEL_NAME in .env).")
	# Default to cloud (no base URL). Set OPENAI_BASE_URL or pass --base-url for local/other providers.
	default_base = os.getenv("OPENAI_BASE_URL") or ""
	parser.add_argument(
		"--base-url",
		default=default_base,
		help=(
			"Custom base URL for OpenAI-compatible endpoints. "
			"Leave empty to use OpenAI cloud. Examples: Ollama http://localhost:11434/v1, LM Studio http://localhost:1234/v1, Groq https://api.groq.com/openai/v1"
		),
	)
	parser.add_argument("--output-json", default="labeled_resume.json", help="Path for LLM-structured JSON output.")
	parser.add_argument("--dry-run", action="store_true", help="Do not call the LLM; output a stub JSON using extracted text headers.")
	return parser


def main(argv: Optional[List[str]] = None) -> int:
	parser = build_arg_parser()
	args = parser.parse_args(argv)
	
	pdf_path = resolve_pdf_path(args.pdf_path)
	result = label_with_llm(pdf_path=pdf_path, model=args.model, dry_run=bool(args.dry_run), base_url=args.base_url or None)
	out_path = Path(args.output_json).expanduser().resolve()
	out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
	print(f"LLM-labeled JSON written to {out_path}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
