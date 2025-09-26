from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Dict, List, Sequence

from PyPDF2 import PdfReader


SECTION_TITLES: set[str] = {
	"summary",
	"professional summary",
	"objective",
	"experience",
	"work experience",
	"professional experience",
	"education",
	"project experience",
	"projects",
	"technical skills",
	"skills",
	"leadership",
	"leadership experience",
	"research",
	"research experience",
	"certifications",
	"awards",
	"publications",
	"activities",
	"volunteer",
	"volunteer experience",
	"interests",
	"achievements",
	"honors",
	"languages",
	"skills & interests",
	"skills and interests",
}


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


def _deduplicate_links(links: Sequence[dict[str, str | int]]) -> list[dict[str, str | int]]:
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
	"""Extract text along with any embedded hyperlink URLs."""

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


def extract_text(pdf_path: Path) -> str:
	"""Pull the full UTF-8 text content from a PDF file."""

	text, _ = extract_text_and_links(pdf_path)
	return text


def _normalize_for_heading(line: str) -> str:
	return re.sub(r"[^a-zA-Z& ]+", "", line).strip().lower()


def _is_section_heading(line: str) -> bool:
	normalized = _normalize_for_heading(line)
	return bool(normalized) and normalized in SECTION_TITLES


def _insert_section_breaks(raw_text: str) -> str:
	lines = raw_text.splitlines()
	grouped: list[str] = []

	for line in lines:
		if _is_section_heading(line) and grouped and grouped[-1] != "":
			grouped.append("")
		grouped.append(line)

	return "\n".join(grouped).rstrip("\n")


def write_output(
	raw_text: str,
	output_path: Path,
	links: Sequence[dict[str, str | int]] | None = None,
) -> None:
	"""Persist the extracted PDF text to a file, adding spacing between major sections and listing links."""

	formatted = _insert_section_breaks(raw_text)
	header_line = "=" * 72

	with output_path.open("w", encoding="utf-8") as stream:
		stream.write(formatted.rstrip("\n") + "\n")
		if links:
			stream.write("\nEmbedded Links\n")
			stream.write(f"{header_line}\n")
			for link in links:
				label = str(link.get("label", "")).strip()
				page = link.get("page")
				url = str(link.get("url"))
				page_fragment = f"[page {page}] " if isinstance(page, int) else ""
				display_label = f"{label} -> " if label else ""
				stream.write(f"{page_fragment}{display_label}{url}\n")


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
		raise ValueError(
			"Multiple PDF files detected. Please specify which PDF to process "
			"with the positional argument."
		)
	return pdfs[0].resolve()


def build_arg_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(
		description="Extract PDF text (preserving line breaks) and save it to a text file.",
	)
	parser.add_argument(
		"pdf_path",
		nargs="?",
		help="Path to the PDF file. If omitted, the script will use the only PDF in the current directory.",
	)
	parser.add_argument(
		"-o",
		"--output",
		dest="output_path",
		help="Where to write the extracted text. Defaults to 'extracted_text.txt' in the current directory.",
	)
	return parser


def main(argv: list[str] | None = None) -> int:
	parser = build_arg_parser()
	args = parser.parse_args(argv)

	try:
		pdf_path = resolve_pdf_path(args.pdf_path)
	except (FileNotFoundError, ValueError) as error:
		parser.error(str(error))

	output_path = Path(args.output_path).expanduser() if args.output_path else Path.cwd() / "extracted_text.txt"

	raw_text, links = extract_text_and_links(pdf_path)
	write_output(raw_text=raw_text, links=links, output_path=output_path)

	print(f"Extraction complete. Output written to {output_path}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
