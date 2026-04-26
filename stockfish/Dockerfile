# --------------------------------------------------------------------------
# Stockfish Analysis Microservice — Dockerfile
#
# Build:
#   docker build -t stockfish-service .
#
# Run:
#   docker run -p 8001:8001 stockfish-service
#
# Override engine path / tuning via environment:
#   -e STOCKFISH_PATH=/usr/games/stockfish
#   -e STOCKFISH_THREADS=2
#   -e STOCKFISH_HASH=128
# --------------------------------------------------------------------------

FROM python:3.12-slim

# Install the Stockfish binary from the Debian/Ubuntu repos.
RUN apt-get update && \
    apt-get install -y --no-install-recommends stockfish && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /service

# Install Python dependencies first (layer caching).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code.
COPY app/ app/

# Expose the service port.
EXPOSE 8001

# Run with uvicorn.  Workers=1 because Stockfish is single‑instance.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001} --workers 1"]