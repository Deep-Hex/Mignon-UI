import asyncio
import os
import sys
from contextlib import asynccontextmanager, suppress

import anyio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Import router submodules
from app.api.routers import characters, lore, messages, rag, rooms, settings, stickers, worlds

# Database initializer and seeder
from app.core.database import SessionLocal, init_db

# RAG incremental indexer
from app.services.rag.rag_indexer import sync_rag_index
from app.services.seeder import sync_database_with_seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Safely manage application startup and shutdown operations, including background RAG threads."""
    # ── Startup ──
    init_db()
    os.makedirs("./static", exist_ok=True)
    sync_database_with_seed()

    def run_rag_sync():
        db = SessionLocal()
        try:
            result = sync_rag_index(db)
            print(f"[RAG] Startup background sync complete: {result}")
        except Exception as e:
            print(f"[RAG] Warning: background index sync failed — {e}. RAG will be unavailable this session.")
        finally:
            db.close()

    # Spin up RAG indexing as a tracked background thread task using AnyIO
    rag_task = asyncio.create_task(anyio.to_thread.run_sync(run_rag_sync))

    yield

    # ── Shutdown ──
    if not rag_task.done():
        print("[System] API shutting down. Safely cancelling background RAG index task...")
        rag_task.cancel()
        with suppress(asyncio.CancelledError, Exception):
            await rag_task
        print("[RAG] Background sync task finalized.")

    # Gracefully finalize shared HTTPX connection pool
    try:
        from app.services.llm_client import close_httpx_client
        await close_httpx_client()
    except Exception as exc:
        print(f"[System] Warning: Failed to close HTTP pool: {exc}")


app = FastAPI(
    title="AR Sandbox Roleplay API",
    description="Super modularized, decoupled high-performance API serving the Private Roleplay Sandbox.",
    version="1.0.0-beta",
    lifespan=lifespan,
)

# CORS middleware for local frontend loads
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Endpoints using Sub-Routers
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(characters.router, prefix="/api/characters", tags=["Characters"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["Rooms"])
app.include_router(lore.router, prefix="/api/lore", tags=["Lore"])
app.include_router(worlds.router, prefix="/api/worlds", tags=["Worlds"])
app.include_router(messages.router, tags=["Messages"])
app.include_router(rag.router, prefix="/api/rag", tags=["RAG"])
app.include_router(stickers.router, prefix="/api/stickers", tags=["Stickers"])

# Resolve static directory relative to bundle path for PyInstaller
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    base_dir = sys._MEIPASS
else:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
static_dir = os.path.join(base_dir, "static")

# Mount static asset client-side browser files
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
