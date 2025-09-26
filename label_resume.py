from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Sequence
from urllib.parse import urlparse, urlunparse

import spacy
from spacy.language import Language

from extract import SECTION_TITLES, extract_text_and_links, resolve_pdf_path

SECTION_CANONICAL = {
	"summary": "Summary",
	"professional summary": "Summary",
	"objective": "Summary",
	"experience": "Work Experience",
	"work experience": "Work Experience",
	"professional experience": "Work Experience",
	"education": "Education",
	"project experience": "Projects",
	"projects": "Projects",
	"technical skills": "Skills",
	"skills": "Skills",
	"skills & interests": "Skills",
	"skills and interests": "Skills",
	"leadership": "Leadership",
	"leadership experience": "Leadership",
	"research": "Research",
	"research experience": "Research",
	"certifications": "Certifications",
	"awards": "Awards",
	"publications": "Publications",
	"activities": "Activities",
	"volunteer": "Volunteer",
	"volunteer experience": "Volunteer",
	"interests": "Interests",
	"achievements": "Achievements",
	"honors": "Honors",
	"languages": "Languages",
}

EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE_RE = re.compile(r"(\+?\d[\d\s().-]{7,}\d)")
URL_RE = re.compile(
	r"(https?://[^\s<>]+|www\.[^\s<>]+|\b[a-zA-Z0-9.-]+\.(?:com|org|net|edu|io|ai)\b)"
)

MONTH_ALIASES = {
	"jan": 1,
	"january": 1,
	"feb": 2,
	"february": 2,
	"mar": 3,
	"march": 3,
	"apr": 4,
	"april": 4,
	"may": 5,
	"jun": 6,
	"june": 6,
	"jul": 7,
	"july": 7,
	"aug": 8,
	"august": 8,
	"sep": 9,
	"sept": 9,
	"september": 9,
	"oct": 10,
	"october": 10,
	"nov": 11,
	"november": 11,
	"dec": 12,
	"december": 12,
}

MONTH_PATTERN = r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
MONTH_PATTERN_GROUP = rf"(?:{MONTH_PATTERN})"
DATE_RANGE_PATTERN = rf"({MONTH_PATTERN_GROUP}\s*\d{{4}})\s*[\-–—]\s*(Present|{MONTH_PATTERN_GROUP}\s*\d{{4}})"
HEADER_LINE_RE = re.compile(DATE_RANGE_PATTERN, re.IGNORECASE)
COMPOUND_SKILL_SEQUENCES = [
	(("Spring", "Boot"), "Spring Boot"),
	(("REST", "APIs"), "REST APIs"),
	(("Machine", "Learning"), "Machine Learning"),
]


def normalize_dashes(text: str) -> str:
	return text.replace("–", "-").replace("—", "-")


def ensure_space_before_months(text: str) -> str:
	def _insert(match: re.Match[str]) -> str:
		return f"{match.group(1)} {match.group(2)}"

	pattern = re.compile(rf"(\S)\b({MONTH_PATTERN})", re.IGNORECASE)
	return pattern.sub(_insert, text)


def parse_date_token(token: str) -> str | None:
	token = normalize_dashes(token.strip())
	if not token:
		return None
	if token.lower() == "present":
		return None
	match = re.match(rf"({MONTH_PATTERN})\s*(\d{{4}})", token, re.IGNORECASE)
	if not match:
		return None
	month_name = match.group(1).lower()
	year = int(match.group(2))
	month = MONTH_ALIASES.get(month_name)
	if not month:
		return None
	return f"{year:04d}-{month:02d}"


def parse_date_range(text: str) -> tuple[str | None, str | None]:
	text = normalize_dashes(text)
	match = re.search(DATE_RANGE_PATTERN, text, re.IGNORECASE)
	if not match:
		return None, None
	start_token = match.group(1)
	end_token = match.group(2)
	start_date = parse_date_token(start_token)
	end_date = None if end_token.lower() == "present" else parse_date_token(end_token)
	return start_date, end_date


def canonicalize_http_url(url: str) -> str:
	url = url.strip()
	if not url or url.lower().startswith(("mailto:", "tel:")):
		return url
	parsed = urlparse(url)
	if not parsed.scheme:
		parsed = urlparse(f"https://{url}")
	scheme = parsed.scheme.lower() if parsed.scheme else "https"
	netloc = parsed.netloc.lower()
	path = parsed.path or ""
	path = path.rstrip("/")
	canonical = urlunparse((scheme, netloc, path, "", "", ""))
	return canonical


def unique_preserve_order(items: Iterable[str]) -> list[str]:
	seen: set[str] = set()
	ordered: list[str] = []
	for item in items:
		if item in seen:
			continue
		seen.add(item)
		ordered.append(item)
	return ordered


def merge_contact_links(
	text_urls: Sequence[str], embedded_payload: Sequence[dict[str, str | int]]
) -> tuple[list[dict[str, str | int]], list[str]]:
	combined: dict[str, dict[str, str | int]] = {}
	order: list[str] = []
	embedded_domains: set[str] = set()

	for entry in embedded_payload:
		if entry.get("type") != "url":
			continue
		url = str(entry.get("url", ""))
		canonical = canonicalize_http_url(url)
		if not canonical:
			continue
		payload = combined.setdefault(canonical, {"url": canonical})
		source = payload.get("source")
		if source == "text":
			payload["source"] = "text+annotation"
		elif not source:
			payload["source"] = "annotation"
		if entry.get("label"):
			payload.setdefault("label", str(entry["label"]))
		if entry.get("page") is not None:
			payload["page"] = entry["page"]
		if canonical not in order:
			order.append(canonical)
		domain = urlparse(canonical).netloc
		if domain:
			embedded_domains.add(domain)

	for url in text_urls:
		canonical = canonicalize_http_url(url)
		if not canonical or canonical.startswith(("mailto:", "tel:")):
			continue
		domain = urlparse(canonical).netloc
		payload = combined.get(canonical)
		if payload:
			if payload.get("source") == "annotation":
				payload["source"] = "text+annotation"
			payload.setdefault("label", url)
			continue
		if domain and domain in embedded_domains:
			continue
		combined[canonical] = {"url": canonical, "source": "text", "label": url}
		order.append(canonical)

	links: list[dict[str, str | int]] = []
	url_list: list[str] = []
	for canonical in unique_preserve_order(order):
		payload = combined[canonical]
		label = payload.get("label") or canonical
		payload["label"] = label
		links.append(payload)
		url_list.append(canonical)

	return links, url_list


def split_company_location(text: str) -> tuple[str | None, str | None]:
	if " - " in text:
		left, right = [part.strip() for part in text.split(" - ", 1)]
		return left or None, right or None
	if "," in text:
		left, right = [part.strip() for part in text.split(",", 1)]
		return left or None, right or None
	if text.strip().lower().endswith(" remote"):
		return text.replace("Remote", "").strip(" ,"), "Remote"
	return text.strip() or None, None


def _clean_line(line: str) -> str:
	line = normalize_dashes(line.strip())
	line = ensure_space_before_months(line)
	return re.sub(r"\s{2,}", " ", line).strip()


def parse_experience_section(text: str) -> list[ExperienceEntry]:
	def _finalize_entry(header_line: str | None, body_lines: list[str]) -> ExperienceEntry | None:
		if not header_line:
			return None
		start_date, end_date = parse_date_range(header_line)
		title = HEADER_LINE_RE.sub("", header_line).strip(" -") or None
		company_line: str | None = None
		achievements: list[str] = []
		for raw in body_lines:
			clean = raw.lstrip()
			is_bullet = clean.startswith("•") or clean.startswith("-")
			if is_bullet:
				clean = clean.lstrip("•- \t")
			if company_line is None and not is_bullet:
				company_line = clean
				continue
			achievements.append(clean)
		organization, location = split_company_location(company_line) if company_line else (None, None)
		achievements = [re.sub(r"\s{2,}", " ", line).strip() for line in achievements if line.strip()]
		return ExperienceEntry(
			title=title,
			organization=organization,
			location=location,
			start_date=start_date,
			end_date=end_date,
			achievements=achievements,
			raw="\n".join([header_line, *body_lines]),
		)

	entries: list[ExperienceEntry] = []
	lines = [ln for ln in (_clean_line(line) for line in text.splitlines()) if ln]
	if not lines:
		return entries

	current_header: str | None = None
	current_body: list[str] = []
	for line in lines:
		stripped = line.lstrip()
		looks_like_header = HEADER_LINE_RE.search(stripped) is not None and not stripped.startswith("•")
		if looks_like_header:
			if current_header or current_body:
				entry = _finalize_entry(current_header, current_body)
				if entry:
					entries.append(entry)
			current_header = stripped
			current_body = []
		elif current_header is None:
			current_header = stripped
		else:
			current_body.append(line)

	final_entry = _finalize_entry(current_header, current_body)
	if final_entry:
		entries.append(final_entry)

	return entries


def parse_education_section(text: str) -> list[EducationEntry]:
	entries: list[EducationEntry] = []
	lines = [ln for ln in (_clean_line(line) for line in text.splitlines()) if ln]
	if not lines:
		return entries

	blocks: list[list[str]] = []
	current: list[str] = []
	for line in lines:
		if HEADER_LINE_RE.search(line) and current:
			blocks.append(current)
			current = [line]
		else:
			current.append(line)
	if current:
		blocks.append(current)

	for block in blocks:
		header = block[0]
		start_date, end_date = parse_date_range(header)
		institution_raw = HEADER_LINE_RE.sub("", header).strip(" -")
		institution, location = split_company_location(institution_raw) if institution_raw else (None, None)
		degree = None
		notes: list[str] = []
		for line in block[1:]:
			if degree is None:
				degree = line
			else:
				notes.append(line)
		entries.append(
			EducationEntry(
				institution=institution,
				degree=degree,
				location=location,
				start_date=start_date,
				end_date=end_date,
				notes=notes,
				raw="\n".join(block),
			)
		)

	return entries


@dataclass
class Section:
	title: str
	content: str


@dataclass
class SectionPayload:
	raw: str
	entries: list[str]


@dataclass
class ExperienceEntry:
	title: str | None
	organization: str | None
	location: str | None
	start_date: str | None
	end_date: str | None
	achievements: list[str]
	raw: str


@dataclass
class EducationEntry:
	institution: str | None
	degree: str | None
	location: str | None
	start_date: str | None
	end_date: str | None
	notes: list[str]
	raw: str


def load_spacy_model() -> Language:
	try:
		return spacy.load("en_core_web_sm")
	except OSError as error:
		raise SystemExit(
			"SpaCy model 'en_core_web_sm' is required. Install it with `python -m spacy download en_core_web_sm`."
		) from error


def normalize_heading(text: str) -> str:
	return re.sub(r"[^a-zA-Z& ]+", "", text).strip().lower()


def canonical_title(normalized: str, fallback: str) -> str:
	return SECTION_CANONICAL.get(normalized, fallback if fallback else "Untitled Section")


def split_sections(raw_text: str) -> list[Section]:
	sections: list[Section] = []
	current_title = "Header"
	current_lines: list[str] = []

	def flush() -> None:
		if not current_lines:
			return
		sections.append(Section(title=current_title, content="\n".join(current_lines).strip()))

	for raw_line in raw_text.splitlines():
		stripped = raw_line.strip()
		normalized = normalize_heading(stripped)

		if normalized in SECTION_TITLES:
			flush()
			current_title = canonical_title(normalized, stripped)
			current_lines = []
			continue

		if not stripped and not current_lines:
			# Skip leading blank lines
			continue

		current_lines.append(raw_line)

	flush()

	return sections


def extract_name(header_text: str, nlp: Language) -> str | None:
	if not header_text.strip():
		return None

	doc = nlp(header_text)
	for ent in doc.ents:
		if ent.label_ == "PERSON":
			return ent.text.strip()

	# fallback: assume first non-empty line is the name
	for line in header_text.splitlines():
		candidate = line.strip()
		if candidate:
			return candidate
	return None


def extract_emails(text: str) -> list[str]:
	return sorted({match.group(0) for match in EMAIL_RE.finditer(text)})


def extract_phones(text: str) -> list[str]:
	normalized_text = text.replace("–", "-").replace("—", "-")
	phones = []
	for match in PHONE_RE.finditer(normalized_text):
		candidate = match.group(0)
		digits_only = re.sub(r"\D", "", candidate)
		if len(digits_only) < 10 or len(digits_only) > 15:
			continue
		phones.append(candidate.strip())
	return sorted(set(phones))


def extract_urls(text: str, emails: Sequence[str]) -> list[str]:
	urls = {match.group(0).strip() for match in URL_RE.finditer(text)}
	email_domains = {
		email.split("@", 1)[1].lower()
		for email in emails
		if "@" in email
	}
	filtered: set[str] = set()
	for url in urls:
		normalized = url.lower()
		domain = re.sub(r"^https?://", "", normalized)
		if domain.startswith("www."):
			domain = domain[4:]
		if domain in email_domains:
			continue
		filtered.add(url)
	return sorted(filtered)


def summarize_embedded_links(
	links: Sequence[dict[str, str | int]]
) -> tuple[list[str], list[str], list[str], list[dict[str, str | int]]]:
	emails: list[str] = []
	urls: list[str] = []
	phones: list[str] = []
	payload: list[dict[str, str | int]] = []
	seen: set[str] = set()

	for link in links:
		url = str(link.get("url", "")).strip()
		if not url or url in seen:
			continue
		seen.add(url)
		lowered = url.lower()
		entry: dict[str, str | int] = {
			"url": url,
			"source": "annotation",
		}
		if "label" in link and link["label"]:
			entry["label"] = str(link["label"])
		if "page" in link:
			entry["page"] = link["page"]

		if lowered.startswith("mailto:"):
			email = url[7:].strip()
			if email:
				emails.append(email)
				entry["type"] = "email"
				entry["value"] = email
		elif lowered.startswith("tel:"):
			phone_raw = url[4:].strip()
			candidates = extract_phones(phone_raw)
			phone = candidates[0] if candidates else phone_raw
			if phone:
				phones.append(phone)
				entry["type"] = "phone"
				entry["value"] = phone
		else:
			urls.append(url)
			entry["type"] = "url"

		payload.append(entry)

	return emails, urls, phones, payload


def split_entries(text: str) -> list[str]:
	entries: list[str] = []
	buffer: list[str] = []

	def flush() -> None:
		if not buffer:
			return
		entries.append(" ".join(buffer).strip())
		buffer.clear()

	for line in text.splitlines():
		stripped = line.strip()
		if not stripped:
			flush()
			continue

		if HEADER_LINE_RE.search(stripped):
			flush()
			entries.append(stripped)
			continue

		if stripped.startswith("•"):
			flush()
			buffer.append(stripped.lstrip("•-\t "))
		else:
			buffer.append(stripped)

	flush()
	return [entry for entry in entries if entry]


def parse_skills(skills_sections: Sequence[str]) -> list[str]:
	def combine_compounds(tokens: list[str]) -> list[str]:
		result: list[str] = []
		i = 0
		while i < len(tokens):
			matched = False
			for sequence, combined in COMPOUND_SKILL_SEQUENCES:
				seq_len = len(sequence)
				window = tokens[i : i + seq_len]
				if len(window) == seq_len and all(
					window[idx].lower() == sequence[idx].lower()
					for idx in range(seq_len)
				):
					result.append(combined)
					i += seq_len
					matched = True
					break
			if not matched:
				result.append(tokens[i])
				i += 1
		return result

	items: list[str] = []
	for section in skills_sections:
		normalized = section.replace("•", "\n")
		fragments = re.split(r"[,;\n]", normalized)
		for fragment in fragments:
			candidate = fragment.strip()
			if ":" in candidate:
				prefix, rest = candidate.split(":", 1)
				if len(prefix) <= 30 and rest.strip():
					candidate = rest.strip()
			candidate = candidate.strip("-\t ")
			candidate = re.sub(r"\s{2,}", " ", candidate)
			if candidate:
				items.append(candidate)

	items = combine_compounds(items)
	return unique_preserve_order(items)


def build_payloads(sections: Iterable[str]) -> list[SectionPayload]:
	return [SectionPayload(raw=section, entries=split_entries(section)) for section in sections]

def build_structure(
	sections: list[Section],
	nlp: Language,
	embedded_links: Sequence[dict[str, str | int]],
) -> tuple[dict, str]:
	all_text = "\n\n".join(section.content for section in sections if section.content)

	header_text = next((section.content for section in sections if section.title == "Header"), "")
	name = extract_name(header_text, nlp)

	contact_block = header_text + "\n" + all_text
	embedded_emails, embedded_urls, embedded_phones, embedded_payload = summarize_embedded_links(embedded_links)
	text_emails = extract_emails(contact_block)
	emails = unique_preserve_order([*text_emails, *embedded_emails])
	phones = unique_preserve_order([*extract_phones(contact_block), *embedded_phones])
	text_urls = extract_urls(contact_block, emails)
	contact_links, canonical_urls = merge_contact_links([*text_urls, *embedded_urls], embedded_payload)
	contact_details = {
		"emails": emails,
		"phones": phones,
		"urls": canonical_urls,
		"links": contact_links,
	}

	bucket: dict[str, list[str]] = {}
	ordered_titles: list[str] = []
	for section in sections:
		if section.title == "Header":
			continue
		bucket.setdefault(section.title, []).append(section.content)
		ordered_titles.append(section.title)

	experience_sections = bucket.get("Work Experience", [])
	project_sections = bucket.get("Projects", [])
	education_sections = bucket.get("Education", [])

	experience_payloads = build_payloads(experience_sections)
	experience_structured = [
		entry.__dict__
		for section_text in experience_sections
		for entry in parse_experience_section(section_text)
	]

	project_payloads = build_payloads(project_sections)
	education_payloads = build_payloads(education_sections)
	education_structured = [
		entry.__dict__
		for section_text in education_sections
		for entry in parse_education_section(section_text)
	]

	summary_sections = bucket.get("Summary", [])
	skills_sections = bucket.get("Skills", [])

	additional = {
		title: build_payloads(contents)
		for title, contents in bucket.items()
		if title
		and title
		not in {"Work Experience", "Projects", "Education", "Summary", "Skills"}
	}

	structured = {
		"name": name,
		"contact": contact_details,
		"summary": summary_sections,
		"education": education_structured,
		"education_sections": [payload.__dict__ for payload in education_payloads],
		"experience": experience_structured,
		"experience_sections": [payload.__dict__ for payload in experience_payloads],
		"projects": [payload.__dict__ for payload in project_payloads],
		"skills": parse_skills(skills_sections),
		"additional_sections": {
			title: [payload.__dict__ for payload in payloads]
			for title, payloads in additional.items()
		},
		"sections": [
			{"title": section.title, "content": section.content}
			for section in sections
			if section.title != "Header"
		],
		"section_order": unique_preserve_order(ordered_titles),
		"embedded_links": embedded_payload,
	}

	cleaned_text = build_clean_text(name, contact_details, sections)
	return structured, cleaned_text
def build_clean_text(name: str | None, contact: dict, sections: list[Section]) -> str:
	blocks: list[str] = []

	header_lines: list[str] = []
	if name:
		header_lines.append(name)

	contact_lines: list[str] = []
	if contact.get("emails"):
		contact_lines.append("Email: " + ", ".join(contact["emails"]))
	if contact.get("phones"):
		contact_lines.append("Phone: " + ", ".join(contact["phones"]))
	if contact.get("urls"):
		contact_lines.append("Links: " + " | ".join(contact["urls"]))

	if contact_lines:
		header_lines.append(" | ".join(contact_lines))

	if header_lines:
		blocks.append("\n".join(header_lines))

	for section in sections:
		if section.title == "Header":
			continue
		if not section.content.strip():
			continue
		blocks.append(f"{section.title}\n{section.content.strip()}")

	return "\n\n".join(blocks).strip()


def build_arg_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(
		description=(
			"Extract structured resume information using a spaCy model and the PDF text extractor. "
			"Outputs both cleaned text and JSON labels."
		)
	)
	parser.add_argument(
		"pdf_path",
		nargs="?",
		help="Path to the PDF file. If omitted, the only PDF in the current directory is used.",
	)
	parser.add_argument(
		"--output-json",
		dest="output_json",
		default="labeled_resume.json",
		help="File path for the structured JSON output.",
	)
	parser.add_argument(
		"--output-text",
		dest="output_text",
		default="cleaned_resume.txt",
		help="File path for the cleaned text output.",
	)
	return parser


def main(argv: list[str] | None = None) -> int:
	parser = build_arg_parser()
	args = parser.parse_args(argv)

	pdf_path = resolve_pdf_path(args.pdf_path)
	raw_text, embedded_links = extract_text_and_links(pdf_path)

	nlp = load_spacy_model()
	sections = split_sections(raw_text)

	structure, cleaned_text = build_structure(sections, nlp, embedded_links)

	json_path = Path(args.output_json).expanduser().resolve()
	text_path = Path(args.output_text).expanduser().resolve()

	json_path.write_text(json.dumps(structure, indent=2, ensure_ascii=False), encoding="utf-8")
	text_path.write_text(cleaned_text + "\n", encoding="utf-8")

	print(f"Structured data written to {json_path}")
	print(f"Cleaned text written to {text_path}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
