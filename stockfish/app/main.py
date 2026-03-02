"""
Stockfish Analysis Microservice — FastAPI entry point.

Endpoints:
    POST /analyze   Accepts a PGN + depth, returns per‑move analysis.
    GET  /health    Liveness / readiness probe.

The Stockfish engine is initialised once at startup and reused for every
request.  It is shut down cleanly when the application exits.

Usage (local):
    uvicorn app.main:app --host 0.0.0.0 --port 8001

Usage (Docker):
    docker build -t stockfish-service .
    docker run -p 8001:8001 stockfish-service

Example curl:
    curl -X POST http://localhost:8001/analyze \
         -H "Content-Type: application/json" \
         -d '{
               "game_id": "abc-123",
               "pgn": "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6",
               "analysis_depth": 18
             }'
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException

from app.analyzer import analyze_game
from app.engine import StockfishEngine
from app.schemas import AnalysisRequest, AnalysisResponse

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Engine singleton — created at startup, destroyed at shutdown.
# ---------------------------------------------------------------------------
_engine: StockfishEngine | None = None


def get_engine() -> StockfishEngine:
    """Return the shared engine instance; raise 503 if unavailable."""
    if _engine is None:
        raise HTTPException(
            status_code=503,
            detail="Stockfish engine is not available.",
        )
    return _engine


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialise the Stockfish engine on startup; tear it down on shutdown."""
    global _engine

    sf_path = os.getenv("STOCKFISH_PATH", "/usr/games/stockfish")
    sf_threads = int(os.getenv("STOCKFISH_THREADS", "2"))
    sf_hash = int(os.getenv("STOCKFISH_HASH", "128"))

    try:
        _engine = StockfishEngine(
            path=sf_path,
            threads=sf_threads,
            hash_mb=sf_hash,
        )
        logger.info("Stockfish engine ready.")
    except RuntimeError as exc:
        logger.error("Engine failed to start: %s", exc)
        # Let the app start but /analyze will return 503.
        _engine = None

    yield  # ← app is running

    if _engine is not None:
        _engine.shutdown()
        _engine = None
    logger.info("Stockfish engine stopped.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Stockfish Analysis Service",
    version="1.0.0",
    description="Analyses chess PGN and returns per‑move evaluations.",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict:
    """Liveness / readiness check."""
    engine_ok = _engine is not None
    return {"status": "ok" if engine_ok else "degraded", "engine": engine_ok}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest) -> AnalysisResponse:
    """
    Analyse a PGN game and return structured per‑move metrics.

    Returns HTTP 400 for invalid input (bad PGN, no moves, depth out of range).
    Returns HTTP 503 if the engine is unavailable.

    Example request body::

        {
          "game_id": "abc-123",
          "pgn": "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6",
          "analysis_depth": 18
        }

    Example (truncated) response::

        {
          "game_id": "abc-123",
          "analysis_depth": 18,
          "results": [
            {
              "move_number": 1,
              "fen_before": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
              "played_move": "e2e4",
              "played_eval": 34,
              "best_move": "e2e4",
              "best_eval": 34,
              "centipawn_loss": 0,
              "classification": "best"
            }
          ]
        }
    """
    engine = get_engine()

    try:
        results = analyze_game(
            engine=engine,
            pgn_string=request.pgn,
            depth=request.analysis_depth,
        )
    except ValueError as exc:
        # PGN parsing / validation errors → 400
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        # Engine‑level errors → 500
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return AnalysisResponse(
        game_id=request.game_id,
        analysis_depth=request.analysis_depth,
        results=results,
    )
