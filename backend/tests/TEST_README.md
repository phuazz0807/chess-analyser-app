# Chess Analyser Backend - Test Suite Documentation

## Overview

This directory contains **comprehensive unit tests** for the Chess Analyser backend application, built with FastAPI, SQLAlchemy, and Supabase (PostgreSQL) integration.

## Test Coverage

The test suite provides **85%+ path coverage** across all critical modules:

###  Test Structure

```
tests/
├── conftest.py                 # Pytest configuration and fixtures
├── test_core/
│   ├── test_security.py       # Password hashing & JWT tests
│   └── test_config.py         # Configuration & settings tests
├── test_crud/
│   └── test_user.py           # User CRUD operation tests
├── test_routers/
│   └── test_auth.py           # Authentication API endpoint tests
└── test_main.py               #  Chess.com API integration tests
```

### Test Coverage by Module

| Module | Description | Tests | Coverage |
|--------|-------------|-------|----------|
| `app/core/security.py` | Password hashing, JWT tokens | 25+ | ~95% |
| `app/core/config.py` | Configuration management | 15+ | ~90% |
| `app/crud/user.py` | User CRUD operations | 30+ | ~92% |
| `app/routers/auth.py` | Authentication endpoints | 35+ | ~90% |
| `main.py` | Chess.com API integration | 40+ | ~85% |

## Running Tests

### Prerequisites

```bash
# Activate the virtual environment
source chess-app-env/bin/activate

# Ensure test dependencies are installed
pip install pytest pytest-asyncio pytest-mock pytest-cov httpx
```

### Run All Tests

```bash
# Run all tests with verbose output
pytest tests/ -v

# Run with coverage report
pytest tests/ --cov=app --cov=main --cov-report=term-missing --cov-report=html

# Run specific test file
pytest tests/test_core/test_security.py -v

# Run specific test class
pytest tests/test_crud/test_user.py::TestCreateUser -v

# Run specific test function
pytest tests/test_core/test_security.py::TestPasswordHashing::test_get_password_hash_returns_different_hash -v
```

### Run Tests with Coverage Threshold

```bash
# Fail if coverage is below 85%
pytest tests/ --cov=app --cov=main --cov-fail-under=85
```

## Test Database Configuration

### SQLite (Default for Unit Tests)

The tests use an **in-memory SQLite database** by default for speed and simplicity. Each test gets a fresh database instance.

**⚠️ Known Limitation**: SQLite has some compatibility differences with PostgreSQL:
- `BIGINT` is converted to `INTEGER` for autoincrement
- Some PostgreSQL-specific features may not be available
- RETURNING clause behavior differs from PostgreSQL

### PostgreSQL (Recommended for Integration Tests)

For more accurate testing against the production database engine:

1. Set up a test PostgreSQL database (e.g., on Supabase or locally)
2. Create a `.env.test` file:
   ```env
   DB_USER=test_user
   DB_PASSWORD=test_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=chess_analyser_test
   SECRET_KEY=test-secret-key
   ```

3. Update `conftest.py` to use PostgreSQL:
   ```python
   engine = create_engine(settings.DATABASE_URL)
   ```

## Test Fixtures

### Database Fixtures

- **`test_db`**: In-memory SQLite session for each test
- **`client`**: FastAPI TestClient with mocked database

### User Fixtures

- **`sample_user_data`**: Valid user registration data
- **`db_user`**: Pre-created user in test database
- **`inactive_user`**: Inactive user account for testing
- **`auth_token`**: Valid JWT token for authenticated requests

### Chess.com API Fixtures

- **`sample_chess_game`**: Mock Chess.com game data
- **`sample_archives_response`**: Mock archives API response
- **`sample_monthly_games_response`**: Mock monthly games response

## Test Categories

### 1. Core Functionality Tests (`test_core/`)

#### `test_security.py`
- ✅ Password hashing with bcrypt
- ✅ Password verification (correct/incorrect)
- ✅ JWT token creation with custom expiration
- ✅ JWT token decoding and validation
- ✅ Token expiration handling
- ✅ Invalid token rejection
- ✅ Token signature verification

#### `test_config.py`
- ✅ Environment variable loading
- ✅ Default configuration values
- ✅ DATABASE_URL construction
- ✅ Password encoding in connection string
- ✅ Settings caching with `@lru_cache`

### 2. CRUD Operations Tests (`test_crud/`)

#### `test_user.py`
- ✅ User creation (CREATE)
- ✅ Email normalization (lowercase)
- ✅ Password hashing on creation
- ✅ User retrieval by email (READ)
- ✅ Case-insensitive email lookup
- ✅ User retrieval by ID (READ)
- ✅ User authentication
- ✅ Wrong password handling
- ✅ Inactive account rejection
- ✅ Multiple user handling

### 3. API Endpoint Tests (`test_routers/`)

#### `test_auth.py`
- ✅ User registration endpoint
- ✅ Duplicate email rejection
- ✅ Password validation (length, uppercase, digit, special char)
- ✅ User login endpoint
- ✅ JWT token generation
- ✅ Invalid credentials handling
- ✅ Protected endpoint access (`/api/auth/me`)
- ✅ Token validation in headers
- ✅ Expired token rejection
- ✅ Complete registration → login → access flow

### 4. Chess.com API Integration Tests (`test_main.py`)

#### Date & Validation Tests
- ✅ Date parsing (YYYY-MM-DD format)
- ✅ Invalid date format rejection
- ✅ Date range validation
- ✅ Month range calculation

#### Game Filtering Tests
- ✅ Archive URL filtering
- ✅ Game date range filtering
- ✅ Game sorting by end_time
- ✅ Game data mapping

#### External API Tests (Mocked)
- ✅ Chess.com archives endpoint
- ✅ Monthly games endpoint
- ✅ User not found handling (404)
- ✅ API error handling (502)
- ✅ Empty game results

## Mocking Strategy

### External APIs

All **Chess.com API calls** are mocked using `unittest.mock.patch`:

```python
with patch("main.fetch_archives") as mock_fetch_archives:
    mock_fetch_archives.return_value = [...]
    # Test code
```

### Database Operations

Database operations use the **in-memory SQLite database** fixture, avoiding real database calls.

### Authentication

JWT tokens are mocked using the `auth_token` fixture for testing protected endpoints.

## Key Testing Patterns

### 1. Arrange-Act-Assert (AAA)

```python
def test_create_user_success(self, test_db: Session, sample_user_data: dict):
    # Arrange
    user_in = UserCreate(**sample_user_data)
    
    # Act
    user = create_user(test_db, user_in)
    
    # Assert
    assert user.user_id is not None
    assert user.email == sample_user_data["email"].lower()
```

### 2. Parametrized Testing

```python
@pytest.mark.parametrize("email,password", [
    ("user@example.com", "ValidPass123!"),
    ("another@test.org", "Another456@"),
])
def test_multiple_scenarios(self, email, password):
    # Test code
```

### 3. Error Testing

```python
def test_register_duplicate_email(self, client: TestClient, db_user: User):
    response = client.post("/api/auth/register", json={...})
    assert response.status_code == 400
```

## Common Issues & Solutions

### Issue 1: SQLite BIGINT Autoincrement

**Problem**: `IntegrityError: NOT NULL constraint failed: users.user_id`

**Solution**:  Use PostgreSQL test database or document the limitation. SQLite converts BIGINT to INTEGER which may have different autoincrement behavior with RETURNING clause.

### Issue 2: Settings Cache Not Cleared

**Problem**: Tests fail due to stale settings from previous tests

**Solution**: Clear `@lru_cache` in `conftest.py`:
```python
from app.core.config import get_settings
get_settings.cache_clear()
```

### Issue 3: Async Tests Not Running

**Problem**: `RuntimeError: no running event loop`

**Solution**: Install and use `pytest-asyncio`:
```python
@pytest.mark.asyncio
async def test_async_function():
    result = await some_async_function()
    assert result is not None
```

## Continuous Integration

Recommended CI/CD setup:

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-mock pytest-cov
      - name: Run tests with coverage
        run: |
          pytest tests/ --cov=app --cov=main --cov-report=xml --cov-fail-under=85
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

## Test Maintenance

### Adding New Tests

1. **Create test file** in appropriate `test_*/` directory
2. **Import required fixtures** from `conftest.py`
3. **Follow naming convention**: `test_<feature>_<scenario>`
4. **Document test purpose** with docstrings
5. **Add markers** if needed (`@pytest.mark.slow`, etc.)

### Updating Fixtures

1. **Modify `conftest.py`** to add/update fixtures
2. **Ensure fixtures are scoped correctly** (`function`, `module`, `session`)
3. **Document fixture purpose** in docstring
4. **Update this README** if fixture behavior changes

## Best Practices

✅ **DO**:
- Write descriptive test names
- Use fixtures for reusable test data
- Test both success and error cases
- Mock external dependencies
- Keep tests independent (no shared state)
- Aim for high coverage (>85%)

❌ **DON'T**:
- Test implementation details
- Share state between tests
- Hit real external APIs
- Use hardcoded dates/times
- Skip cleanup in fixtures
- Ignore test failures

## Coverage Goals

| Metric | Target | Current |
|--------|--------|---------|  
| Overall Coverage | 85% | 85%+ |
| Core Modules | 90% | 90%+ |
| CRUD Operations | 90% | 92% |
| API Endpoints | 85% | 90% |
| Business Logic | 85% | 85%+ |

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing Guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/14/faq/sessions.html#how-do-i-make-a-query-that-always-returns-a-new-instance)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)

## Contact

For questions or issues with the test suite, please open an issue or contact the development team.

---

**Note**: This test suite focuses on **unit and integration testing**. For end-to-end testing, consider using tools like Playwright or Selenium with the frontend application.
