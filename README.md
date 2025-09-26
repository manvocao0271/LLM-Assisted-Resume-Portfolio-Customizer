# ResumeParser

Two ways to generate labeled JSON:

1) Rule-based (spaCy + regex)
   - Script: `label_resume.py`
   - Usage: `python3 label_resume.py <file.pdf>`
   - Outputs: `labeled_resume.json`, `cleaned_resume.txt`

2) LLM-based labeling (primary)
   - Script: `llm_label_resume.py`
   - Install deps: `pip install -r requirements.txt`
   - Option A: OpenAI cloud
     - Requires a paid API key from OpenAI (no permanent free key). Get one at https://platform.openai.com/
     - Export key: `export OPENAI_API_KEY=sk-...`
     - Run: `python3 llm_label_resume.py <file.pdf> --model gpt-4o-mini`
   - Option B: Local/OpenAI-compatible (free)
     - Use a local server like Ollama or LM Studio that exposes an OpenAI-compatible API.
     - Set base URL via `--base-url` or `OPENAI_BASE_URL`.
       Examples:
       - Ollama (OpenAI-compatible proxy): `--base-url http://localhost:11434/v1`
       - LM Studio: `--base-url http://localhost:1234/v1`
     - Provide any model name your server supports via `--model`.
   - Dry run (no API call): `python3 llm_label_resume.py <file.pdf> --dry-run`
   - Optional extracted text output: add `--output-text extracted_text.txt`
   - Output: `labeled_resume.json`

Notes:
- LLM flow also includes `embedded_links` from PDF annotations for traceability.
- You can keep both approaches and compare outputs.
