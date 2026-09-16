# Hugging Face Space (Docker) — Ollama + one model + token gate.
# Build arg OLLAMA_MODEL selects the model per Space:
#   Space-1: OLLAMA_MODEL=qwen2.5:7b   (faster, priority #1)
#   Space-2: OLLAMA_MODEL=qwen3:8b     (stronger Arabic, priority #2)
# HF secrets required: GATE_TOKEN (the Bearer token our backend sends).
FROM ollama/ollama:latest

RUN apt-get update && apt-get install -y --no-install-recommends nodejs curl \
  && rm -rf /var/lib/apt/lists/*

ARG OLLAMA_MODEL=qwen2.5:7b
ENV OLLAMA_MODEL=${OLLAMA_MODEL} \
    OLLAMA_HOST=0.0.0.0:11434 \
    OLLAMA_KEEP_ALIVE=30m \
    OLLAMA_NUM_PARALLEL=1 \
    GATE_PORT=7860

COPY gate.js /app/gate.js
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Ollama native (11434, localhost-only inside the container) + public gate (7860).
EXPOSE 7860

CMD ["/app/entrypoint.sh"]
