# LearnPilot LLM Space — Ollama + token gate (Docker)

One Space carries **ONE model**. Deploy twice (two HF accounts):

| Space | Build arg `OLLAMA_MODEL` | Backend slot |
|---|---|---|
| Space-1 | `qwen2.5:7b` | `CUSTOM_LLM_*` (priority #1) |
| Space-2 | `qwen3:8b` | `CUSTOM_LLM_2_*` (priority #2) |

## HF settings per Space
- SDK: **Docker**
- Hardware: **CPU Basic (free)**
- Secret: `GATE_TOKEN` = long random string (different per Space)
- App port: `7860`
- Build arg: `OLLAMA_MODEL` = the model for this Space

## How it works
`entrypoint.sh` starts Ollama (localhost-only inside the container), pulls the
model **on HF servers** (zero download on your PC), then starts `gate.js` on
`:7860`. The gate is the only public surface and requires
`Authorization: Bearer <GATE_TOKEN>` for everything except `GET /health`.
