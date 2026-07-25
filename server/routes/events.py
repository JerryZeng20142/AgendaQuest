from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import User
from auth import get_current_user
import asyncio
import json

router = APIRouter()


@router.get("/events")
async def subscribe_to_events(
    user: User = Depends(get_current_user)
):
    async def event_generator():
        # Send periodic heartbeat
        while True:
            await asyncio.sleep(30)
            yield {
                "event": "message",
                "data": json.dumps({"scope": "sync", "type": "heartbeat"})
            }
    
    return EventSourceResponse(event_generator())
