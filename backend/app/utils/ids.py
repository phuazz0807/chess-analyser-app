import re

def extract_game_id(game_url: str) -> str:
    match = re.search(r"/game/live/(\d+)", game_url)
    if not match:
        raise ValueError(f"Invalid Chess.com game URL: {game_url}")
    return match.group(1)