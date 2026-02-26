#!/bin/bash

# Chess Analyser Backend - Test Runner Script
# This script provides convenient commands for running tests

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Chess Analyser Backend - Test Runner             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if virtual environment is activated
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo -e "${YELLOW}⚠️  Virtual environment not activated!${NC}"
    echo -e "${YELLOW}   Run: source chess-app-env/bin/activate${NC}"
    echo ""
fi

# Function to run tests
run_tests() {
    local test_args="$@"
    echo -e "${GREEN}Running tests: $test_args${NC}"
    pytest $test_args
}

# Show menu
echo "Select test suite to run:"
echo ""
echo "  1) All tests (comprehensive)"
echo "  2) Core tests only (security, config)"
echo "  3) Main API tests (Chess.com integration)"
echo "  4) CRUD tests (user operations)"
echo "  5) Router tests (authentication endpoints)"
echo "  6) All tests with coverage report"
echo "  7) Coverage report (HTML)"
echo "  8) Quick validation tests"
echo "  9) Custom pytest command"
echo "  0) Exit"
echo ""
read -p "Enter choice [0-9]: " choice

case $choice in
    1)
        run_tests "tests/ -v"
        ;;
    2)
        run_tests "tests/test_core/ -v"
        ;;
    3)
        run_tests "tests/test_main.py -v"
        ;;
    4)
        run_tests "tests/test_crud/ -v"
        ;;
    5)
        run_tests "tests/test_routers/ -v"
        ;;
    6)
        run_tests "tests/ --cov=app --cov=main --cov-report=term-missing"
        ;;
    7)
        echo -e "${GREEN}Generating HTML coverage report...${NC}"
        pytest tests/ --cov=app --cov=main --cov-report=html
        echo -e "${GREEN}✓ Report generated in: htmlcov/index.html${NC}"
        ;;
    8)
        echo -e "${GREEN}Running quick validation tests...${NC}"
        run_tests "tests/test_core/test_security.py::TestPasswordHashing -v"
        ;;
    9)
        read -p "Enter custom pytest command: " custom_cmd
        run_tests "$custom_cmd"
        ;;
    0)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${YELLOW}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Test run complete!${NC}"
echo ""
echo "View detailed documentation: tests/TEST_README.md"
echo "View HTML coverage: htmlcov/index.html"
echo ""
