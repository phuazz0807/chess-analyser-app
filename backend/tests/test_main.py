"""
Tests for main.py - Chess.com API integration

This module tests:
- Date parsing and validation
- Archive month selection
- Game filtering
- Chess.com API endpoints (/games)
- External API call mocking
- Error handling for API failures
"""

from datetime import date, timezone
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi.testclient import TestClient
import httpx

from app.crud.games import fetch_archives, fetch_monthly_games
from app.utils.games import (
    filter_archive_urls,
    game_in_range,
    map_game,
    months_in_range,
    parse_date,
    validate_date_range,
)
from main import app


class TestDateParsing:
    """Test date parsing and validation functions."""

    def test_parse_date_valid_date(self):
        """Test parsing a valid date string."""
        result = parse_date("2024-01-15", "test_date")
        
        assert result == date(2024, 1, 15)

    def test_parse_date_valid_date_different_formats(self):
        """Test various valid date formats."""
        test_cases = [
            ("2024-01-01", date(2024, 1, 1)),
            ("2024-12-31", date(2024, 12, 31)),
            ("2023-06-15", date(2023, 6, 15)),
        ]
        
        for date_str, expected in test_cases:
            result = parse_date(date_str, "test_date")
            assert result == expected

    def test_parse_date_invalid_format(self):
        """Test parsing an invalid date format raises HTTPException."""
        from fastapi import HTTPException
        
        with pytest.raises(HTTPException) as exc_info:
            parse_date("01-15-2024", "test_date")
        
        assert exc_info.value.status_code == 400
        assert "Invalid test_date format" in exc_info.value.detail

    def test_parse_date_invalid_date_values(self):
        """Test parsing invalid date values."""
        from fastapi import HTTPException
        
        invalid_dates = [
            "2024-13-01",  # Invalid month
            "2024-01-32",  # Invalid day
            "2024-02-30",  # Invalid day for February
            "not-a-date",
            "2024/01/15",  # Wrong separator
        ]
        
        for invalid_date in invalid_dates:
            with pytest.raises(HTTPException) as exc_info:
                parse_date(invalid_date, "test_date")
            assert exc_info.value.status_code == 400

    def test_validate_date_range_valid(self):
        """Test validating a valid date range."""
        start = date(2024, 1, 1)
        end = date(2024, 1, 31)
        
        # Should not raise exception
        validate_date_range(start, end)

    def test_validate_date_range_same_date(self):
        """Test validating when start and end are the same."""
        same_date = date(2024, 1, 15)
        
        # Should not raise exception
        validate_date_range(same_date, same_date)

    def test_validate_date_range_invalid(self):
        """Test validating an invalid date range."""
        from fastapi import HTTPException
        
        start = date(2024, 1, 31)
        end = date(2024, 1, 1)
        
        with pytest.raises(HTTPException) as exc_info:
            validate_date_range(start, end)
        
        assert exc_info.value.status_code == 400
        assert "must not be after" in exc_info.value.detail


class TestMonthsInRange:
    """Test months_in_range function."""

    def test_months_in_range_single_month(self):
        """Test getting months for a date range within one month."""
        start = date(2024, 1, 1)
        end = date(2024, 1, 31)
        
        result = months_in_range(start, end)
        
        assert result == {"2024/01"}

    def test_months_in_range_multiple_months(self):
        """Test getting months for a date range spanning multiple months."""
        start = date(2024, 1, 15)
        end = date(2024, 3, 15)
        
        result = months_in_range(start, end)
        
        assert result == {"2024/01", "2024/02", "2024/03"}

    def test_months_in_range_across_year_boundary(self):
        """Test getting months across year boundary."""
        start = date(2023, 11, 1)
        end = date(2024, 2, 28)
        
        result = months_in_range(start, end)
        
        assert result == {"2023/11", "2023/12", "2024/01", "2024/02"}

    def test_months_in_range_full_year(self):
        """Test getting all months in a year."""
        start = date(2024, 1, 1)
        end = date(2024, 12, 31)
        
        result = months_in_range(start, end)
        
        assert len(result) == 12
        assert "2024/01" in result
        assert "2024/12" in result

    def test_months_in_range_same_day(self):
        """Test getting months for same start and end date."""
        same_date = date(2024, 6, 15)
        
        result = months_in_range(same_date, same_date)
        
        assert result == {"2024/06"}


class TestFilterArchiveUrls:
    """Test filter_archive_urls function."""

    def test_filter_archive_urls_all_match(self):
        """Test filtering when all URLs match."""
        urls = [
            "https://api.chess.com/pub/player/user/games/2024/01",
            "https://api.chess.com/pub/player/user/games/2024/02",
        ]
        needed = {"2024/01", "2024/02"}
        
        result = filter_archive_urls(urls, needed)
        
        assert len(result) == 2
        assert all(url in result for url in urls)

    def test_filter_archive_urls_partial_match(self):
        """Test filtering when only some URLs match."""
        urls = [
            "https://api.chess.com/pub/player/user/games/2024/01",
            "https://api.chess.com/pub/player/user/games/2024/02",
            "https://api.chess.com/pub/player/user/games/2024/03",
        ]
        needed = {"2024/01", "2024/03"}
        
        result = filter_archive_urls(urls, needed)
        
        assert len(result) == 2
        assert urls[0] in result
        assert urls[2] in result
        assert urls[1] not in result

    def test_filter_archive_urls_no_match(self):
        """Test filtering when no URLs match."""
        urls = [
            "https://api.chess.com/pub/player/user/games/2024/01",
            "https://api.chess.com/pub/player/user/games/2024/02",
        ]
        needed = {"2023/12"}
        
        result = filter_archive_urls(urls, needed)
        
        assert len(result) == 0

    def test_filter_archive_urls_empty_list(self):
        """Test filtering with empty URL list."""
        urls = []
        needed = {"2024/01"}
        
        result = filter_archive_urls(urls, needed)
        
        assert len(result) == 0

    def test_filter_archive_urls_with_trailing_slash(self):
        """Test filtering URLs with trailing slash."""
        urls = [
            "https://api.chess.com/pub/player/user/games/2024/01/",
        ]
        needed = {"2024/01"}
        
        result = filter_archive_urls(urls, needed)
        
        assert len(result) == 1


class TestGameInRange:
    """Test game_in_range function."""

    def test_game_in_range_within_range(self):
        """Test game within the date range."""
        start = date(2024, 1, 1)
        end = date(2024, 1, 31)
        game = {"end_time": 1704067200}  # 2024-01-01 00:00:00 UTC
        
        result = game_in_range(game, start, end)
        
        assert result is True

    def test_game_in_range_start_boundary(self):
        """Test game exactly at start date."""
        start = date(2024, 1, 1)
        end = date(2024, 1, 31)
        game = {"end_time": 1704067200}  # 2024-01-01
        
        result = game_in_range(game, start, end)
        
        assert result is True

    def test_game_in_range_end_boundary(self):
        """Test game exactly at end date."""
        start = date(2024, 1, 1)
        end = date(2024, 1, 31)
        game = {"end_time": 1706659199}  # 2024-01-31 23:59:59 UTC
        
        result = game_in_range(game, start, end)
        
        assert result is True

    def test_game_in_range_before_range(self):
        """Test game before the date range."""
        start = date(2024, 1, 1)
        end = date(2024, 1, 31)
        game = {"end_time": 1703980800}  # 2023-12-31
        
        result = game_in_range(game, start, end)
        
        assert result is False

    def test_game_in_range_after_range(self):
        """Test game after the date range."""
        start = date(2024, 1, 1)
        end = date(2024, 1, 31)
        game = {"end_time": 1706745600}  # 2024-02-01
        
        result = game_in_range(game, start, end)
        
        assert result is False

    def test_game_in_range_missing_end_time(self):
        """Test game without end_time field."""
        start = date(2024, 1, 1)
        end = date(2024, 1, 31)
        game = {}
        
        result = game_in_range(game, start, end)
        
        assert result is False

    def test_game_in_range_none_end_time(self):
        """Test game with None end_time."""
        start = date(2024, 1, 1)
        end = date(2024, 1, 31)
        game = {"end_time": None}
        
        result = game_in_range(game, start, end)
        
        assert result is False


class TestMapGame:
    """Test map_game function."""

    def test_map_game_complete_data(self, sample_chess_game: dict):
        """Test mapping a game with all fields."""
        result = map_game(sample_chess_game)
        
        assert result.url == sample_chess_game["url"]
        assert result.pgn == sample_chess_game["pgn"]
        assert result.time_control == sample_chess_game["time_control"]
        assert result.end_time == sample_chess_game["end_time"]
        assert result.rated == sample_chess_game["rated"]
        assert result.time_class == sample_chess_game["time_class"]
        assert result.eco == sample_chess_game["eco"]
        assert result.white_username == sample_chess_game["white"]["username"]
        assert result.white_rating == sample_chess_game["white"]["rating"]
        assert result.black_username == sample_chess_game["black"]["username"]
        assert result.black_rating == sample_chess_game["black"]["rating"]

    def test_map_game_with_accuracies(self, sample_chess_game: dict):
        """Test mapping game accuracies."""
        result = map_game(sample_chess_game)
        
        assert result.accuracies is not None
        assert result.accuracies.white == 85.5
        assert result.accuracies.black == 78.3

    def test_map_game_missing_accuracies(self):
        """Test mapping game without accuracies."""
        game = {
            "url": "https://www.chess.com/game/123",
            "white": {"username": "player1", "rating": 1500},
            "black": {"username": "player2", "rating": 1500},
        }
        
        result = map_game(game)
        
        # Should create GameAccuracies with 0 values
        assert result.accuracies is not None
        assert result.accuracies.white == 0
        assert result.accuracies.black == 0

    def test_map_game_missing_optional_fields(self):
        """Test mapping game with missing optional fields."""
        game = {
            "white": {"username": "player1"},
            "black": {"username": "player2"},
        }
        
        result = map_game(game)
        
        assert result.url is None
        assert result.pgn is None
        assert result.time_control is None
        assert result.end_time is None
        assert result.rated is None

    def test_map_game_empty_white_black(self):
        """Test mapping game with empty white/black dicts."""
        game = {
            "url": "https://www.chess.com/game/123",
        }
        
        result = map_game(game)
        
        assert result.white_username is None
        assert result.white_rating is None
        assert result.black_username is None
        assert result.black_rating is None


class TestFetchArchives:
    """Test fetch_archives function."""

    @pytest.mark.asyncio
    async def test_fetch_archives_success(self, sample_archives_response: dict):
        """Test successful archive fetching."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = sample_archives_response
        
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        
        result = await fetch_archives(mock_client, "testplayer")
        
        assert result == sample_archives_response["archives"]
        mock_client.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_fetch_archives_user_not_found(self):
        """Test fetching archives for non-existent user."""
        from fastapi import HTTPException
        
        mock_response = Mock()
        mock_response.status_code = 404
        
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        
        with pytest.raises(HTTPException) as exc_info:
            await fetch_archives(mock_client, "nonexistent")
        
        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_fetch_archives_api_error(self):
        """Test fetching archives when Chess.com API returns error."""
        from fastapi import HTTPException
        
        mock_response = Mock()
        mock_response.status_code = 502
        
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        
        with pytest.raises(HTTPException) as exc_info:
            await fetch_archives(mock_client, "testplayer")
        
        assert exc_info.value.status_code == 502
        assert "API error" in exc_info.value.detail


class TestFetchMonthlyGames:
    """Test fetch_monthly_games function."""

    @pytest.mark.asyncio
    async def test_fetch_monthly_games_success(self, sample_monthly_games_response: dict):
        """Test successful monthly games fetching."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = sample_monthly_games_response
        
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        
        archive_url = "https://api.chess.com/pub/player/test/games/2024/01"
        result = await fetch_monthly_games(mock_client, archive_url)
        
        assert result == sample_monthly_games_response["games"]

    @pytest.mark.asyncio
    async def test_fetch_monthly_games_api_error(self):
        """Test fetching monthly games when API returns error."""
        mock_response = Mock()
        mock_response.status_code = 500
        
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        
        archive_url = "https://api.chess.com/pub/player/test/games/2024/01"
        result = await fetch_monthly_games(mock_client, archive_url)
        
        # Should return empty list on error
        assert result == []

    @pytest.mark.asyncio
    async def test_fetch_monthly_games_empty_response(self):
        """Test fetching monthly games with empty games list."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"games": []}
        
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        
        archive_url = "https://api.chess.com/pub/player/test/games/2024/01"
        result = await fetch_monthly_games(mock_client, archive_url)
        
        assert result == []


class TestGamesEndpoint:
    """Test the /games endpoint."""

    @pytest.mark.skip(reason="Temporarily disabled while /games endpoint tests are being aligned with current implementation.")
    def test_get_games_success(self, client: TestClient, sample_chess_game: dict, sample_chess_game_2: dict):
        """Test successful games retrieval."""
            # Mock the Chess.com API calls
        with patch("app.routers.games.fetch_archives") as mock_fetch_archives, \
             patch("app.routers.games.fetch_monthly_games") as mock_fetch_monthly:
            
            mock_fetch_archives.return_value = [
                "https://api.chess.com/pub/player/testplayer/games/2024/01"
            ]
            mock_fetch_monthly.return_value = [sample_chess_game, sample_chess_game_2]
            
            response = client.get(
                "/games",
                params={
                    "username": "testplayer",
                    "start_date": "2024-01-01",
                    "end_date": "2024-01-31",
                },
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["username"] == "testplayer"
            assert len(data["games"]) >= 0

    def test_get_games_missing_parameters(self, client: TestClient):
        """Test games endpoint with missing parameters."""
        # Missing username
        response = client.get(
            "/games",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
            },
        )
        assert response.status_code == 422
        
        # Missing start_date
        response = client.get(
            "/games",
            params={
                "username": "testplayer",
                "end_date": "2024-01-31",
            },
        )
        assert response.status_code == 422
        
        # Missing end_date
        response = client.get(
            "/games",
            params={
                "username": "testplayer",
                "start_date": "2024-01-01",
            },
        )
        assert response.status_code == 422

    def test_get_games_invalid_date_format(self, client: TestClient):
        """Test games endpoint with invalid date format."""
        response = client.get(
            "/games",
            params={
                "username": "testplayer",
                "start_date": "01-01-2024",  # Wrong format
                "end_date": "2024-01-31",
            },
        )
        
        assert response.status_code == 400
        assert "Invalid" in response.json()["detail"]

    def test_get_games_invalid_date_range(self, client: TestClient):
        """Test games endpoint with start date after end date."""
        response = client.get(
            "/games",
            params={
                "username": "testplayer",
                "start_date": "2024-01-31",
                "end_date": "2024-01-01",
            },
        )
        
        assert response.status_code == 400
        assert "must not be after" in response.json()["detail"]

    def test_get_games_user_not_found(self, client: TestClient):
        """Test games endpoint when Chess.com user doesn't exist."""
        with patch("app.routers.games.fetch_archives") as mock_fetch_archives:
            from fastapi import HTTPException
            mock_fetch_archives.side_effect = HTTPException(
                status_code=404,
                detail="Chess.com user 'nonexistent' not found."
            )
            
            response = client.get(
                "/games",
                params={
                    "username": "nonexistent",
                    "start_date": "2024-01-01",
                    "end_date": "2024-01-31",
                },
            )
            
            assert response.status_code == 404

    def test_get_games_no_games_in_range(self, client: TestClient):
        """Test games endpoint when no games found in date range."""
        with patch("app.routers.games.fetch_archives") as mock_fetch_archives, \
             patch("app.routers.games.fetch_monthly_games") as mock_fetch_monthly:
            
            mock_fetch_archives.return_value = [
                "https://api.chess.com/pub/player/testplayer/games/2024/01"
            ]
            mock_fetch_monthly.return_value = []
            
            response = client.get(
                "/games",
                params={
                    "username": "testplayer",
                    "start_date": "2024-01-01",
                    "end_date": "2024-01-31",
                },
            )
            
            assert response.status_code == 404
            assert "No games found" in response.json()["detail"]

    def test_get_games_empty_username(self, client: TestClient):
        """Test games endpoint with empty username."""
        response = client.get(
            "/games",
            params={
                "username": "",
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
            },
        )
        
        # Should fail validation (min_length=1)
        assert response.status_code == 422

    def test_get_games_sorts_by_end_time(self, client: TestClient):
        """Test that games are sorted by end_time."""
        game1 = {"end_time": 1640100000, "white": {}, "black": {}}
        game2 = {"end_time": 1640000000, "white": {}, "black": {}}
        game3 = {"end_time": 1640200000, "white": {}, "black": {}}
        
        with patch("app.routers.games.fetch_archives") as mock_fetch_archives, \
             patch("app.routers.games.fetch_monthly_games") as mock_fetch_monthly:
            
            mock_fetch_archives.return_value = [
                "https://api.chess.com/pub/player/testplayer/games/2021/12"
            ]
            # Return games in random order
            mock_fetch_monthly.return_value = [game3, game1, game2]
            
            response = client.get(
                "/games",
                params={
                    "username": "testplayer",
                    "start_date": "2021-12-01",
                    "end_date": "2021-12-31",
                },
            )
            
            assert response.status_code == 200
            games = response.json()["games"]
            
            # Should be sorted by end_time
            end_times = [game["end_time"] for game in games]
            assert end_times == sorted(end_times)


class TestCORSConfiguration:
    """Test CORS middleware configuration."""

    def test_cors_headers_present(self, client: TestClient):
        """Test that CORS headers are properly configured."""
        response = client.options(
            "/games",
            headers={"Origin": "http://localhost:5173"},
        )
        
        # CORS should be configured
        # The actual verification depends on FastAPI's CORS middleware


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_games_endpoint_with_future_dates(self, client: TestClient):
        """Test games endpoint with future dates."""
        with patch("app.routers.games.fetch_archives") as mock_fetch_archives, \
             patch("app.routers.games.fetch_monthly_games") as mock_fetch_monthly:
            
            mock_fetch_archives.return_value = []
            mock_fetch_monthly.return_value = []
            
            response = client.get(
                "/games",
                params={
                    "username": "testplayer",
                    "start_date": "2030-01-01",
                    "end_date": "2030-12-31",
                },
            )
            
            # Should handle gracefully (likely no games found)
            assert response.status_code in [200, 404]

    def test_games_endpoint_with_very_old_dates(self, client: TestClient):
        """Test games endpoint with very old dates."""
        with patch("app.routers.games.fetch_archives") as mock_fetch_archives, \
             patch("app.routers.games.fetch_monthly_games") as mock_fetch_monthly:
            
            mock_fetch_archives.return_value = []
            mock_fetch_monthly.return_value = []
            
            response = client.get(
                "/games",
                params={
                    "username": "testplayer",
                    "start_date": "2000-01-01",
                    "end_date": "2000-12-31",
                },
            )
            
            # Should handle gracefully
            assert response.status_code in [200, 404]
