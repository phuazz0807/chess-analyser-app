"""
PGN analyser — the core orchestration module.

Responsibilities:
    1. Parse a PGN string into a sequence of (fen_before, played_move) pairs.
    2. For each position, ask the engine for the best move + eval, and the
       played‑move eval.
    3. Compute centipawn loss (CPL) and classify each move.
    4. Return a list of ``MoveResult`` objects.
"""

from __future__ import annotations

import io
import logging
from typing import List, Tuple


from app.engine import StockfishEngine, normalize_eval, is_mate_eval
from app.schemas import MoveResult

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

def classify_move(
    cpl: int,
    best_eval_dict: dict,
    played_eval_dict: dict,
    best_eval_cp: int,
    played_eval_cp: int,
) -> str:
    """
    Classify a single move based on centipawn loss and special‑case rules.

    Classification thresholds (CPL → label)
    ----------------------------------------
    0–10   → best
    11–50  → good
    51–100 → inaccuracy
    101–300 → mistake
    300+   → blunder

    Special rules
    -------------
    • If the best move leads to a forced mate but the played move does NOT,
      the player missed a winning mate → **blunder**.
    • If the played eval is *better* than the best eval from the same
      perspective (can happen due to search‑depth horizon effects or multi‑PV
      noise), treat it as **best** — the player found an equal‑or‑better line.
    """
    # --- Special: missed mate ------------------------------------------------
    # If engine's best move gives a forced mate and the played move does not,
    # that is always a blunder regardless of numeric CPL.
    if is_mate_eval(best_eval_dict) and not is_mate_eval(played_eval_dict):
        return "blunder"

    # --- Special: played move improves on engine's best ----------------------
    # This can happen at finite depth; credit the player.
    if played_eval_cp >= best_eval_cp:
        return "best"

    # --- Standard CPL thresholds ---------------------------------------------
    if cpl <= 10:
        return "best"
    if cpl <= 50:
        return "good"
    if cpl <= 100:
        return "inaccuracy"
    if cpl <= 300:
        return "mistake"
    return "blunder"


# ---------------------------------------------------------------------------
# PGN parsing
# ---------------------------------------------------------------------------

def parse_pgn(pgn_string: str) -> List[Tuple[str, str]]:
    """
    Parse a PGN string and return a list of ``(fen_before, played_move_uci)``
    tuples — one per half‑move along the **mainline** only.

    Raises
    ------
    ValueError
        If the PGN is invalid, contains no moves, or an illegal move is
        encountered.
    """
    pgn_io = io.StringIO(pgn_string)
    game = chess.pgn.read_game(pgn_io)

    if game is None:
        raise ValueError("Invalid or empty PGN — could not parse game.")

    board = game.board()
    positions: List[Tuple[str, str]] = []

    mainline = list(game.mainline_moves())
    if not mainline:
        raise ValueError("PGN contains no moves.")

    for move in mainline:
        # Validate legality on the current board state.
        if move not in board.legal_moves:
            raise ValueError(
                f"Illegal move {move.uci()} in position {board.fen()}"
            )

        fen_before = board.fen()
        played_uci = move.uci()
        positions.append((fen_before, played_uci))

        board.push(move)

    return positions


# ---------------------------------------------------------------------------
# Full analysis
# ---------------------------------------------------------------------------

def analyze_game(
    engine: StockfishEngine,
    pgn_string: str,
    depth: int,
) -> List[MoveResult]:
    """
    End‑to‑end analysis of a game.

    Parameters
    ----------
    engine : StockfishEngine
        Reusable engine instance (must already be initialised).
    pgn_string : str
        Full PGN text.
    depth : int
        Search depth (10–25).

    Returns
    -------
    list[MoveResult]
        One entry per half‑move in mainline order.
    """
    # 1. Parse PGN → list of (fen, played_move) ---------------------------------
    positions = parse_pgn(pgn_string)

    # 2. Configure depth for this request ----------------------------------------
    engine.set_depth(depth)

    results: List[MoveResult] = []

    for idx, (fen_before, played_move) in enumerate(positions, start=1):
        # Determine side to move from FEN (field index 1: "w" or "b").
        white_to_move = fen_before.split()[1] == "w"

        # --- A: best‑move evaluation -------------------------------------------
        best_move, best_eval_dict = engine.evaluate_best(fen_before)
        best_eval_cp = normalize_eval(best_eval_dict, white_to_move)

        # --- B: played‑move evaluation -----------------------------------------
        # After making the played move the side to move flips, so the returned
        # eval is from the *opponent's* perspective.  We need to normalize from
        # the **new** side‑to‑move's viewpoint — which is the opposite of
        # white_to_move.
        played_eval_dict = engine.evaluate_played(fen_before, played_move)
        played_eval_cp = normalize_eval(played_eval_dict, not white_to_move)

        # --- CPL ----------------------------------------------------------------
        # Centipawn loss = how many centipawns worse the played move is compared
        # to the best move, from the mover's perspective.
        #
        # Because both evals are already in White‑POV centipawns, we can compare
        # directly.  For a White move, a *lower* eval is worse; for a Black move,
        # a *higher* (less negative) eval is worse.
        #
        # Simplest correct formula: consider the *mover's* gain.
        #   mover_best   = best_eval_cp   (already White POV)
        #   mover_played = played_eval_cp  (already White POV)
        #
        # If White moved: loss = best - played (higher is better for White)
        # If Black moved: loss = played - best (lower is better for Black)
        if white_to_move:
            raw_cpl = best_eval_cp - played_eval_cp
        else:
            raw_cpl = played_eval_cp - best_eval_cp

        cpl = max(0, raw_cpl)  # never negative (horizon effects)

        # --- Classification -----------------------------------------------------
        classification = classify_move(
            cpl, best_eval_dict, played_eval_dict, best_eval_cp, played_eval_cp,
        )

        results.append(
            MoveResult(
                move_number=idx,
                fen_before=fen_before,
                played_move=played_move,
                played_eval=played_eval_cp,
                best_move=best_move,
                best_eval=best_eval_cp,
                centipawn_loss=cpl,
                classification=classification,
            )
        )

        logger.debug(
            "ply=%d  move=%s  best=%s  cpl=%d  class=%s",
            idx, played_move, best_move, cpl, classification,
        )

    return results
