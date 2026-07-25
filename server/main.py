from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
import os

from config import settings
from database import init_db, async_session_maker
from models import User, UserSettings
from auth import get_password_hash, get_current_user
from routes import auth, records, tasks, memories, settings as settings_route, agent, agenda, events


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.email == "demo@agendaquest.com"))
        if not result.scalar_one_or_none():
            user = User(
                email="demo@agendaquest.com",
                password_hash=get_password_hash("demo123"),
                display_name="Demo User",
                onboarding_completed=False,
            )
            db.add(user)
            await db.flush()

            user_settings = UserSettings(user_id=user.id)
            db.add(user_settings)
            await db.commit()

    yield


app = FastAPI(
    title="AgendaQuest API",
    description="Backend API for AgendaQuest task management application",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(agenda.router, prefix="/agenda", tags=["agenda"])
app.include_router(records.router, prefix="/records", tags=["records"])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(memories.router, prefix="/memories", tags=["memories"])
app.include_router(settings_route.router, prefix="/settings", tags=["settings"])
app.include_router(agent.router, prefix="/agent-plans", tags=["agent"])
app.include_router(events.router, prefix="/events", tags=["events"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": "服务器内部错误，请稍后重试。"},
    )


@app.get("/")
async def root():
    return {"message": "AgendaQuest API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
