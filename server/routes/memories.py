from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from database import get_db
from models import User, Memory
from schemas import MemoryItem, UpdateMemoryRequest
from auth import get_current_user

router = APIRouter()


def memory_to_response(memory: Memory) -> MemoryItem:
    return MemoryItem(
        id=memory.id,
        content=memory.content,
        sourceRecordIds=memory.source_record_ids or [],
        createdAt=memory.created_at.isoformat() + "Z",
        updatedAt=memory.updated_at.isoformat() + "Z",
        status=memory.status
    )


@router.put("/{memory_id}", response_model=MemoryItem)
async def update_memory(
    memory_id: str,
    update_data: UpdateMemoryRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Memory).where(Memory.id == memory_id, Memory.user_id == user.id))
    memory = result.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    memory.content = update_data.content
    memory.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(memory)
    
    return memory_to_response(memory)


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    memory_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Memory).where(Memory.id == memory_id, Memory.user_id == user.id))
    memory = result.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    await db.delete(memory)
    await db.commit()
