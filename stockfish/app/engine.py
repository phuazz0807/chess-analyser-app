"""
Stockfish engine wrapper.

Encapsulates:
    • engine lifecycle (init / shutdown)
    • evaluation of a position for the best move
    • evaluation after a specific (played) move
    • centipawn normalization (mate → cp, perspective flip)

Uses the *python-stockfish* library — never talks raw UCI.
"""

from __future__ import annotations

import logging
from typing import Dict, Tuple

from stockfish import Stockfish, StockfishException

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Default engine parameters — can be overridden via environment later.
DEFAULT_STOCKFISH_PATH = "/usr/games/stockfish"
DEFAULT_THREADS = 2
DEFAULT_HASH_MB = 128

# Large centipawn value used when converting mate scores so that
# mates always compare as "better / worse" than any centipawn eval.
_MATE_CP_BASE = 100000
_MATE_CP_PER_MOVE = 1000


# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------

def normalize_eval(eval_dict: Dict[str, object], white_to_move: bool) -> int:
    """
    Convert a Stockfish evaluation dict to a single centipawn integer
    from **White's perspective**.

    Stockfish evaluates from the *side-to-move's* perspective, so when it is
    Black's turn the raw value must be inverted.

    Mate handling
    -------------
    ``{"type": "mate", "value": N}``

    * **N > 0** → the side to move can force mate in N moves.
    * **N < 0** → the side to move is being mated in |N| moves.

    We map this to a centipawn-equivalent so that forced mates sort clearly
    above/below any positional evaluation:

        sign(N) x (100 000 - |N| x 1 000)

    Then flip if Black to move.

    Parameters
    ----------
    eval_dict : dict
        ``{"type": "cp"|"mate", "value": int}``
    white_to_move : bool
        Derived from the FEN active-colour field.

    Returns
    -------
    int
        Centipawn evaluation from White's perspective.
    """
    eval_type: str = eval_dict["type"]
    raw_value: int = eval_dict["value"]

    if eval_type == "cp":
        cp = raw_value
    elif eval_type == "mate":
        # sign preserves "who is winning"; magnitude shrinks as mate gets
        # further away so that Mate-in-1 > Mate-in-5 in absolute terms.
        sign = 1 if raw_value > 0 else -1
        cp = sign * (_MATE_CP_BASE - abs(raw_value) * _MATE_CP_PER_MOVE)
    else:
        raise ValueError(f"Unknown eval type: {eval_type}")

    # Perspective normalization — flip when it was Black to move, because
    # Stockfish reported from Black's point of view.
    if not white_to_move:
        cp = -cp

    return cp


def is_mate_eval(eval_dict: Dict[str, object]) -> bool:
    """Return True if the evaluation is a forced mate."""
    return eval_dict["type"] == "mate"


# ---------------------------------------------------------------------------
# Engine wrapper
# ---------------------------------------------------------------------------

class StockfishEngine:
    """
    Thin wrapper around the *python-stockfish* ``Stockfish`` instance.

    Designed to be **reused across requests** (do NOT create per-move).
    The depth is set per-request via :meth:`set_depth`.
    """

    def __init__(
        self,
        path: str = DEFAULT_STOCKFISH_PATH,
        threads: int = DEFAULT_THREADS,
        hash_mb: int = DEFAULT_HASH_MB,
    ) -> None:
        logger.info(
            "Initializing Stockfish engine  path=%s  threads=%d  hash=%dMB",
            path, threads, hash_mb,
        )
        try:
            self._sf = Stockfish(
                path=path,
                depth=18,  # default; overridden per-request
                parameters={
                    "Threads": threads,
                    "Hash": hash_mb,
                },
            )
        except Exception as exc:
            logger.error("Failed to initialize Stockfish: %s", exc)
            raise RuntimeError(f"Stockfish engine init failed: {exc}") from exc

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def set_depth(self, depth: int) -> None:
        """Set analysis depth for subsequent evaluations."""
        self._sf.set_depth(depth)

    def evaluate_best(self, fen: str) -> Tuple[str, Dict[str, object]]:
        """
        Return ``(best_move_uci, eval_dict)`` for the given position.

        Steps:
            1. Set the position to *fen*.
            2. Ask for the best move.
            3. Ask for the evaluation (this is the eval **of** the best move
               because the engine just computed it).

        Returns
        -------
        tuple[str, dict]
            ``("e2e4", {"type": "cp", "value": 34})``
        """
        self._sf.set_fen_position(fen)
        best_move: str = self._sf.get_best_move()
        best_eval: Dict[str, object] = self._sf.get_evaluation()
        return best_move, best_eval

    def evaluate_played(self, fen: str, played_move: str) -> Dict[str, object]:
        """
        Return the evaluation **after** *played_move* is applied to *fen*.

        This tells us how good the position is once the player's actual move
        has been made, so we can compare it against the best-move eval to
        compute centipawn loss.
        """
        self._sf.set_fen_position(fen)
        self._sf.make_moves_from_current_position([played_move])
        return self._sf.get_evaluation()

    def shutdown(self) -> None:
        """Gracefully stop the engine process."""
        try:
            del self._sf
            logger.info("Stockfish engine shut down.")
        except Exception:
            pass

    # Allow use as a context manager for tests / scripts.
    def __enter__(self) -> "StockfishEngine":
        return self

    def __exit__(self, *_: object) -> None:
        self.shutdown()
