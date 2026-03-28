"""
Chess Analyser Backend - FastAPI service that fetches and filters Chess.com games.

Run locally:
    uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.analysis import router as analysis_router
from app.routers.auth import router as auth_router
from app.routers.games import router as games_router
from app.routers.user import router as user_router

app = FastAPI(title="Chess Analyser", version="1.0.0")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(analysis_router)
app.include_router(games_router)
