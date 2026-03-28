import chess.pgn
from io import StringIO
from datetime import datetime, timezone
from typing import Optional

from app.schemas.history import GameHistoryRecord


def _parse_chesscom_time_control(tc: Optional[str]) -> Optional[str]:
    """
    Convert Chess.com time control format to increment format.
    Examples:
        "300" -> "5+0"
        "180+2" -> "3+2"
    """
    if not tc:
        return None

    if "+" in tc:
        base, inc = tc.split("+")
        return f"{int(base)//60}+{inc}"

    return f"{int(tc)//60}+0"


def parse_pgn(pgn: str, user_id: int) -> GameHistoryRecord:
    """
    Parse a PGN string into a GameHistoryRecord.
    """

    game = chess.pgn.read_game(StringIO(pgn))
    headers = game.headers

    link = headers.get("Link")
    time_control = _parse_chesscom_time_control(headers.get("TimeControl"))

    white_username = headers.get("White")
    black_username = headers.get("Black")

    white_rating = headers.get("WhiteElo")
    black_rating = headers.get("BlackElo")

    game_id = None
    if link:
        game_id = link.rstrip("/").split("/")[-1]

    return GameHistoryRecord(
        game_id=game_id or "unknown",
        user_id=user_id,
        game_url=link,
        time_control=time_control,
        white_username=white_username,
        black_username=black_username,
        white_rating=int(white_rating) if white_rating else None,
        black_rating=int(black_rating) if black_rating else None,
        white_accuracy=None,
        black_accuracy=None,
        white_ACPL=None,
        black_ACPL=None,
        analysis_status="pending",
        created_at=datetime.now(timezone.utc),
    )