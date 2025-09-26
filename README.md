# ResumeParser

Two ways to generate labeled JSON:

1) Rule-based (spaCy + regex)
   - Script: `label_resume.py`
   - Usage: `python3 label_resume.py <file.pdf>`
   - Outputs: `labeled_resume.json`, `cleaned_resume.txt`

2) LLM-based labeling
   - Script: `llm_label_resume.py`
   - Install deps: `pip install -r requirements.txt`
   - Set key: `export OPENAI_API_KEY=...`
   - Dry run (no API call):
     `python3 llm_label_resume.py <file.pdf> --dry-run`
   - Real call:
     `python3 llm_label_resume.py <file.pdf> --model gpt-4o-mini`
   - Output: `labeled_resume.json`

Notes:
- LLM flow also includes `embedded_links` from PDF annotations for traceability.
- You can keep both approaches and compare outputs.
