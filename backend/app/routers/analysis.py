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
import os
from typing import Dict

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.models.analysis import MoveAnalysis

from app.core.database import SessionLocal, get_db
from app.crud.analysis import create_move_analysis_record
from app.crud.history import create_game_history_record
from app.schemas.analysis import (
    AnalysisCallbackPayload,
    AnalysisStartRequest,
    AnalysisStatusResponse,
)
from app.utils.history import parse_pgn

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# URL of the Stockfish microservice (Docker service name or localhost).
STOCKFISH_SERVICE_URL = f"{os.getenv('STOCKFISH_URL')}/analyze"
STOCKFISH_TIMEOUT = 300  # generous timeout for deep analysis

# ---------------------------------------------------------------------------
# In-memory store (placeholder — swap for Supabase persistence later)
# Composite key: (user_id, game_id) represented as "user_id:game_id" string
# ---------------------------------------------------------------------------

# Maps composite_key "user_id:game_id" --> { "status": "pending"|"done"|"error", "result": ... } dict
_analysis_store: Dict[str, dict] = {}

# Event listeners for SSE notifications
# Maps composite_key "user_id:game_id" --> list of asyncio.Queue objects
_event_listeners: Dict[str, list] = {}

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


@router.post("/start", status_code=status.HTTP_202_ACCEPTED)
async def start_analysis(
    request: AnalysisStartRequest,
    db: Session = Depends(get_db),
):
    """
    Kick off Stockfish analysis for a game.

    This request is from FE: src/api/analysis.jsx → startAnalysis().

    1. Mark the game as "pending" in the in-memory store using composite key (user_id, game_id).
    2. Fire-and-forget an async task that:
       a. Forwards the request to the Stockfish service.
       b. On success, stores the result, marks status as "done", and writes to the database.
       c. On failure, marks status as "error".
    3. Return HTTP 202 immediately so the frontend is not blocked.

    Frontend should subscribe to /api/analysis/subscribe/{user_id}/{game_id} to receive
    a real-time notification when analysis completes.
    """
    game_id = request.game_id
    user_id = request.user_id
    composite_key = f"{user_id}:{game_id}"

    print(f"Received analysis request from user_id={user_id} game_id={game_id}")
    
    # Prevent duplicate submissions — if already pending, just return 202.
    if composite_key in _analysis_store and _analysis_store[composite_key]["status"] == "pending":
        return {"message": "Analysis already in progress", "game_id": game_id}

    # Mark as pending.
    _analysis_store[composite_key] = {"status": "pending", "result": None, "error": None}

    # Launch the Stockfish call in the background so we return immediately.

    task = asyncio.create_task(_run_analysis(request))
    logger.info(f"[TASK CREATED] game_id={game_id}, task_id={id(task)}")
    task.add_done_callback(lambda t: logger.error(t.exception()) if t.exception() else None)

    return {"message": "Analysis started", "game_id": game_id}


@router.post("/callback", status_code=status.HTTP_200_OK)
async def analysis_callback(payload: AnalysisCallbackPayload):
    """
    Receive a completed AnalysisResponse from the Stockfish service.

    This endpoint exists so Stockfish can push results back if configured
    to do so (webhook-style).  In the current implementation the backend
    calls Stockfish synchronously in the background task instead, but we
    keep this endpoint for flexibility.

    Note: This endpoint is deprecated in favor of the background task handling.
    Payload must include user_id via query parameter or in the body.
    """
    # For now, if this is called directly, we can't store it since we need user_id.
    # In the background task, we handle storage directly.
    
    logger.warning(
        "Direct callback endpoint was called for game_id=%s. "
        "Prefer background task handling.", payload.game_id
    )
    
    return {"message": "Analysis callback received", "game_id": payload.game_id}


@router.get("/status/{user_id}/{game_id:path}", response_model=AnalysisStatusResponse)
async def analysis_status(
    user_id: int,
    game_id: str,
    db: Session = Depends(get_db),
):
    count = db.query(MoveAnalysis).filter(MoveAnalysis.game_id == game_id).count()
    if count == 0:
        return AnalysisStatusResponse(game_id=game_id, status="pending", error=None)
    return AnalysisStatusResponse(game_id=game_id, status="done", error=None)

@router.post("/status/batch")
async def batch_analysis_status(
    game_ids: list[str],
    db: Session = Depends(get_db),
):
    results = {}
    for game_id in game_ids:
        count = db.query(MoveAnalysis).filter(MoveAnalysis.game_id == game_id).count()
        results[game_id] = "done" if count > 0 else "pending"
    return results

@router.get("/result/{user_id}/{game_id}")
async def analysis_result(user_id: int, game_id: str):
    """
    Return the full analysis result for a completed game.

    Path params:
        user_id  — user who submitted the analysis
        game_id  — the game being analyzed

    Returns HTTP 404 if no analysis exists, HTTP 202 if still pending.
    """
    composite_key = f"{user_id}:{game_id}"
    entry = _analysis_store.get(composite_key)
    if entry is None:
        raise HTTPException(status_code=404, detail="No analysis found for this game.")

    if entry["status"] == "pending":
        # Not an error — just not ready yet.
        return {"status": "pending", "game_id": game_id}

    if entry["status"] == "error":
        raise HTTPException(status_code=500, detail=entry.get("error", "Analysis failed."))

    return entry["result"]


@router.get("/subscribe/{user_id}/{game_id:path}")
async def subscribe_to_analysis(user_id: int, game_id: str):
    """
    Server-Sent Events (SSE) endpoint — subscribe to real-time analysis completion.

    Frontend connects to this endpoint and waits for a message event. When the
    analysis completes successfully or fails, the backend sends a notification.

    Path params:
        user_id  — user ID
        game_id  — game ID

    Response format:
        event: done
        data: {"game_id": "...", "status": "done"}

        or

        event: error
        data: {"game_id": "...", "status": "error", "error": "..."}
    """
    composite_key = f"{user_id}:{game_id}"

    # Check if analysis is already complete
    entry = _analysis_store.get(composite_key)
    if entry and entry["status"] != "pending":
        # Already done or error — send immediately
        yield f"event: {entry['status']}\ndata: {entry}\n\n"
        return

    # Create a queue for this subscriber
    queue = asyncio.Queue()
    if composite_key not in _event_listeners:
        _event_listeners[composite_key] = []
    _event_listeners[composite_key].append(queue)

    try:
        # Wait for a notification
        message = await queue.get()
        yield f"data: {message}\n\n"
    finally:
        # Clean up
        if composite_key in _event_listeners:
            _event_listeners[composite_key].remove(queue)
            if not _event_listeners[composite_key]:
                del _event_listeners[composite_key]


async def _notify_listeners(composite_key: str, status: str, data: dict) -> None:
    """Notify all subscribers for a composite_key that analysis is complete."""
    if composite_key not in _event_listeners:
        return

    notification = {"game_id": composite_key.split(":")[1], "status": status, **data}
    notification_str = str(notification).replace("'", '"')  # JSON-like format

    for queue in _event_listeners[composite_key]:
        try:
            await queue.put(notification_str)
        except Exception as e:
            logger.exception("Failed to notify listener: %s", e)


# ---------------------------------------------------------------------------
# Background task — calls Stockfish service
# ---------------------------------------------------------------------------

async def _run_analysis(request: AnalysisStartRequest) -> None:
    """
    Async background task that forwards the analysis request to the
    Stockfish microservice and stores the result.

    On success:
        → status="done", result=<AnalysisResponse dict>
        → writes game_history and move_analysis records to DB
        → notifies listeners
    On failure:
        → status="error", error=<message>
        → notifies listeners
    """
    game_id = request.game_id
    user_id = request.user_id
    composite_key = f"{user_id}:{game_id}"

    logger.info(f"[RUN_ANALYSIS ENTERED] user_id={user_id}, game_id={game_id}")
    logger.info(f"[REQUEST PAYLOAD] {request.model_dump()}")

    try:
        logger.info(f"Calling Stockfish at: {STOCKFISH_SERVICE_URL}")
        async with httpx.AsyncClient(timeout=STOCKFISH_TIMEOUT) as client:
            resp = await client.post(
                STOCKFISH_SERVICE_URL,
                json=request.model_dump(),
            )

        logger.info(f"Stockfish response status: {resp.status_code}")


        if resp.status_code != 200:
            error_detail = resp.text[:300]

            logger.error(
                "Stockfish error %d for game_id=%s\nResponse: %s",
                resp.status_code, game_id, error_detail,
            )

            _analysis_store[composite_key] = {
                "status": "error",
                "result": None,
                "error": f"Stockfish HTTP {resp.status_code}",
            }

            await _notify_listeners(composite_key, "error", {
                "error": f"Stockfish HTTP {resp.status_code}"
            })
            return

        # Validate the response payload.
        try:
            data = resp.json()
        except Exception:
            logger.error("Invalid JSON from Stockfish: %s", resp.text[:300])
            raise RuntimeError("Stockfish returned non-JSON response")

        callback_payload = AnalysisCallbackPayload(**data)

        _analysis_store[composite_key] = {
            "status": "done",
            "result": callback_payload.model_dump(),
            "error": None,
        }

        logger.info(
            "Analysis complete for game_id=%s moves=%d",
            game_id, len(callback_payload.results),
        )

        print(f"Analysis complete for game_id={game_id}  moves={len(callback_payload.results)}")
        # print move list
        for move in callback_payload.results[:5]:  # print first 5 moves for brevity
            print(f"  Move {move.move_number}: played {move.played_move} eval={move.played_eval} best={move.best_move} eval={move.best_eval} loss={move.centipawn_loss}")
        print(f"... (total moves: {len(callback_payload.results)})")

        # NOW write to database (atomic — only after successful analysis)
        db = SessionLocal()
        try:
            # Parse PGN and create game history record with status="done"
            parsed_pgn = parse_pgn(request.pgn, user_id)
            create_game_history_record(db, user_id, game_id, parsed_pgn, status="done")
            # Force parent row write before child inserts so DB FK checks pass.
            db.flush()
            
            # Create move analysis records
            create_move_analysis_record(db, callback_payload, user_id)
            db.commit()
            logger.info("Stored analysis in database for game_id=%s", game_id)
            print(f"Stored analysis in database for game_id={game_id}")
        except Exception:
            db.rollback()
            logger.exception("Failed to store analysis in database for game_id=%s", game_id)
            raise
        finally:
            db.close()

        # Notify listeners of completion
        await _notify_listeners(composite_key, "done", {})

    except httpx.ConnectError:
        logger.error("Cannot connect to Stockfish service")
        error_msg = "Stockfish service unreachable"

    except httpx.ReadTimeout:
        logger.error("Stockfish request timed out")
        error_msg = "Stockfish timeout"

    except Exception as exc:
        logger.exception("Background analysis failed for game_id=%s", game_id)
        error_msg = str(exc)

    _analysis_store[composite_key] = {
        "status": "error",
        "result": None,
        "error": error_msg,
    }
    # Notify listeners of error
    await _notify_listeners(composite_key, "error", {"error": error_msg})
