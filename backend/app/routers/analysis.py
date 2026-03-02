"""
Analysis router — triggers Stockfish analysis and receives callbacks.

Flow:
    1. Frontend POSTs to /api/analysis/start with game_id, pgn, depth
    2. Backend forwards the request to the Stockfish microservice asynchronously
    3. Stockfish analyses the PGN and POSTs the AnalysisResponse to /api/analysis/callback
    4. Backend stores the result and makes it queryable by the frontend

Endpoints:
    POST /api/analysis/start     — kick off analysis (called by frontend)
    POST /api/analysis/callback  — receive completed analysis (called by Stockfish)
    GET  /api/analysis/status/{game_id} — check whether analysis is done (polled by frontend)
    GET  /api/analysis/result/{game_id} — retrieve stored analysis result
"""

from __future__ import annotations

import asyncio
import logging
from typing import Dict

import httpx
from fastapi import APIRouter, HTTPException, status
from app.models.analysis import (
    AnalysisCallbackPayload,
    AnalysisStartRequest,
    AnalysisStatusResponse,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# URL of the Stockfish microservice (Docker service name or localhost).
STOCKFISH_SERVICE_URL = "http://localhost:8001/analyze"
STOCKFISH_TIMEOUT = 300  # generous timeout for deep analysis

# ---------------------------------------------------------------------------
# In-memory store  (placeholder — swap for Supabase persistence later)
# ---------------------------------------------------------------------------

# Maps game_id → { "status": "pending"|"done"|"error", "result": ... }
_analysis_store: Dict[str, dict] = {}

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


@router.post("/start", status_code=status.HTTP_202_ACCEPTED)
async def start_analysis(request: AnalysisStartRequest):
    """
    Kick off Stockfish analysis for a game.

    1. Mark the game as "pending" in the in-memory store.
    2. Fire-and-forget an async task that:
       a. Forwards the request to the Stockfish service.
       b. On success, stores the result and marks status as "done".
       c. On failure, marks status as "error".
    3. Return HTTP 202 immediately so the frontend is not blocked.

    The frontend should poll GET /api/analysis/status/{game_id} to know
    when analysis is complete.
    """
    game_id = request.game_id

    # Prevent duplicate submissions — if already pending, just return 202.
    if game_id in _analysis_store and _analysis_store[game_id]["status"] == "pending":
        return {"message": "Analysis already in progress", "game_id": game_id}

    # Mark as pending.
    _analysis_store[game_id] = {"status": "pending", "result": None, "error": None}

    # Launch the Stockfish call in the background so we return immediately.
    asyncio.create_task(_run_analysis(request))

    return {"message": "Analysis started", "game_id": game_id}


@router.post("/callback", status_code=status.HTTP_200_OK)
async def analysis_callback(payload: AnalysisCallbackPayload):
    """
    Receive a completed AnalysisResponse from the Stockfish service.

    This endpoint exists so Stockfish can push results back if configured
    to do so (webhook-style).  In the current implementation the backend
    calls Stockfish synchronously in the background task instead, but we
    keep this endpoint for flexibility.

    Validates the payload and stores it.
    """
    game_id = payload.game_id
    _analysis_store[game_id] = {
        "status": "done",
        "result": payload.model_dump(),
        "error": None,
    }
    logger.info("Callback received for game_id=%s  moves=%d", game_id, len(payload.results))

    # TODO: persist to Supabase here.

    return {"message": "Analysis stored", "game_id": game_id}


@router.get("/status/{game_id}", response_model=AnalysisStatusResponse)
async def analysis_status(game_id: str):
    """
    Poll endpoint — returns the current analysis status for a game.

    Statuses:
        pending — analysis is still running
        done    — results are available at /api/analysis/result/{game_id}
        error   — analysis failed; error message included
    """
    entry = _analysis_store.get(game_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="No analysis found for this game.")

    return AnalysisStatusResponse(
        game_id=game_id,
        status=entry["status"],
        error=entry.get("error"),
    )


@router.get("/result/{game_id}")
async def analysis_result(game_id: str):
    """
    Return the full analysis result for a completed game.

    Returns HTTP 404 if no analysis exists, HTTP 202 if still pending.
    """
    entry = _analysis_store.get(game_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="No analysis found for this game.")

    if entry["status"] == "pending":
        # Not an error — just not ready yet.
        return {"status": "pending", "game_id": game_id}

    if entry["status"] == "error":
        raise HTTPException(status_code=500, detail=entry.get("error", "Analysis failed."))

    return entry["result"]


# ---------------------------------------------------------------------------
# Background task — calls Stockfish service
# ---------------------------------------------------------------------------

async def _run_analysis(request: AnalysisStartRequest) -> None:
    """
    Async background task that forwards the analysis request to the
    Stockfish microservice and stores the result.

    On success → status="done", result=<AnalysisResponse dict>
    On failure → status="error", error=<message>
    """
    game_id = request.game_id
    try:
        async with httpx.AsyncClient(timeout=STOCKFISH_TIMEOUT) as client:
            resp = await client.post(
                STOCKFISH_SERVICE_URL,
                json=request.model_dump(),
            )

        if resp.status_code != 200:
            error_detail = resp.text[:500]
            logger.error(
                "Stockfish returned %d for game_id=%s: %s",
                resp.status_code, game_id, error_detail,
            )
            _analysis_store[game_id] = {
                "status": "error",
                "result": None,
                "error": f"Stockfish error (HTTP {resp.status_code}): {error_detail}",
            }
            return

        # Validate the response payload.
        data = resp.json()
        callback_payload = AnalysisCallbackPayload(**data)

        _analysis_store[game_id] = {
            "status": "done",
            "result": callback_payload.model_dump(),
            "error": None,
        }
        logger.info(
            "Analysis complete for game_id=%s  moves=%d",
            game_id, len(callback_payload.results),
        )

        # TODO: persist to Supabase here.

    except Exception as exc:
        logger.exception("Background analysis failed for game_id=%s", game_id)
        _analysis_store[game_id] = {
            "status": "error",
            "result": None,
            "error": str(exc),
        }
