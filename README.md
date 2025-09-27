# ResumeParser (single-file CLI)

This project now uses a single CLI that reads a PDF and writes structured JSON labels directly—no intermediate text file required.

CLI: `llm_label_resume.py`

Install deps:

```
pip install -r requirements.txt
```
   - Option A: Groq (recommended free tier)
     - Create an API key in your Groq account
     - Run:
       `export OPENAI_API_KEY=your_groq_api_key`
       `python3 llm_label_resume.py <file.pdf> --base-url https://api.groq.com/openai/v1 --model llama-3.1-8b-instant`
   - Option B: Local/OpenAI-compatible (free) — LM Studio or Ollama
     - Start the server in LM Studio and use: `--base-url http://localhost:1234/v1` and a supported model name
     - Or Ollama: `ollama serve` then `ollama pull mistral:7b-instruct` and run with `--base-url http://localhost:11434/v1 --model mistral:7b-instruct`
   - Option C: OpenAI cloud (paid)
     - Use a local server like Ollama or LM Studio that exposes an OpenAI-compatible API.
     - Or get an API key at https://platform.openai.com/ and run with `--model gpt-4o-mini` (paid)
  - Dry run (no API call): `python3 llm_label_resume.py <file.pdf> --dry-run`
  - Output: `labeled_resume.json`

Notes:
- The JSON includes `embedded_links` from PDF annotations for traceability.
