# ResumeParser

Single-file CLI that converts a resume PDF into structured JSON with the help of any OpenAI-compatible LLM.

## Requirements

- Python 3.10+
- `pip install -r requirements.txt`

## Setup

1. Copy the sample environment file and set your credentials:
   ```zsh
   cp .env.example .env
   # edit .env to add your API key / defaults
   ```
2. Optionally, override defaults via CLI flags (`--model`, `--base-url`).

## Usage

Groq (recommended free tier):
```zsh
python3 llm_label_resume.py "resume.pdf"
```
- `.env` should include:
  - `OPENAI_API_KEY=your_groq_key`
  - `OPENAI_BASE_URL=https://api.groq.com/openai/v1`
  - `MODEL_NAME=llama-3.1-8b-instant`

OpenAI cloud (paid):
```zsh
export OPENAI_API_KEY=sk-your-openai-key
python3 llm_label_resume.py "resume.pdf" --model gpt-4o-mini
```

Any OpenAI-compatible server (LM Studio, Ollama, etc.):
```zsh
python3 llm_label_resume.py "resume.pdf" \
  --base-url http://localhost:11434/v1 \
  --model mistral:7b-instruct
```

Dry run (no API call):
```zsh
python3 llm_label_resume.py "resume.pdf" --dry-run
```

### CLI options
```zsh
python3 llm_label_resume.py --help
```
Key flags:
- `--model` – override default model (otherwise falls back to `MODEL_NAME` or `gpt-4o-mini`)
- `--base-url` – custom endpoint, blank uses OpenAI cloud
- `--output-json` – change output filename (default `labeled_resume.json`)
- `--dry-run` – skip network call, emit stub payload for testing

### Environment variables
- `OPENAI_API_KEY` (required)
- `OPENAI_BASE_URL` (optional)
- `MODEL_NAME` (optional default model)
- `FORCE_JSON` – set to `0` if your provider rejects `response_format`
- `DEBUG_JSON` – set to any value to dump raw responses to `llm_raw.txt` when JSON parsing fails

## Output

`labeled_resume.json` contains:
- `name`
- `contact` (emails, phones, urls)
- `summary`
- `education`, `experience`, `projects`, `skills`
- `embedded_links` from PDF annotations (for traceability)

You can tailor the schema by editing the `SYSTEM_PROMPT` in `llm_label_resume.py`.

## Tips

- PDFs and generated artifacts (`labeled_resume.json`, `llm_raw.txt`) are git-ignored by default.
- Run `--dry-run` during development to avoid spending tokens.
- The script automatically loads `.env`, so keep that file out of version control.
