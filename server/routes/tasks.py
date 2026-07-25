from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
from database import get_db
from models import Task, Record, User
from schemas import AgendaTask, CreateTaskRequest, UpdateTaskRequest, TaskCommandRequest, PostponeTaskRequest, TaskStep
from auth import get_current_user

router = APIRouter()


def task_to_response(task: Task) -> AgendaTask:
    steps = []
    if task.steps:
        steps = [TaskStep(**step) for step in task.steps]
    
    return AgendaTask(
        id=task.id,
        recordId=task.record_id,
        title=task.title,
        nextAction=task.next_action,
        dueAt=task.due_at.isoformat() + "Z" if task.due_at else None,
        priority=task.priority,
        status=task.status,
        steps=steps,
        createdAt=task.created_at.isoformat() + "Z",
        startedAt=task.started_at.isoformat() + "Z" if task.started_at else None,
        completedAt=task.completed_at.isoformat() + "Z" if task.completed_at else None,
        archivedAt=task.archived_at.isoformat() + "Z" if task.archived_at else None,
        completionSummary=task.completion_summary,
        postponeCount=task.postpone_count,
        revision=task.revision
    )


@router.post("", response_model=AgendaTask, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: CreateTaskRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify record ownership
    result = await db.execute(select(Record).where(Record.id == task_data.recordId, Record.user_id == user.id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Idempotency check using clientRequestId
    if idempotency_key:
        existing = await db.execute(
            select(Task).where(Task.id == idempotency_key, Task.user_id == user.id)
        )
        existing_task = existing.scalar_one_or_none()
        if existing_task:
            return task_to_response(existing_task)

    now = datetime.utcnow()
    
    # Convert steps from strings to objects
    steps = []
    for step_label in task_data.steps:
        steps.append({
            "id": str(uuid.uuid4()),
            "label": step_label,
            "completed": False
        })
    
    task = Task(
        id=str(uuid.uuid4()),
        user_id=user.id,
        record_id=task_data.recordId,
        title=task_data.title,
        next_action=task_data.nextAction,
        due_at=datetime.fromisoformat(task_data.dueAt.replace("Z", "+00:00")) if task_data.dueAt else None,
        priority="normal",
        status="pending",
        steps=steps,
        created_at=now,
        postpone_count=0,
        revision=1,
    )

    if idempotency_key:
        task.id = idempotency_key

    db.add(task)
    
    # Update record with task_id
    record.task_id = task.id
    record.status = "ready"
    record.updated_at = now
    
    await db.commit()
    await db.refresh(task)
    
    return task_to_response(task)


@router.patch("/{task_id}", response_model=AgendaTask)
async def update_task(
    task_id: str,
    update_data: UpdateTaskRequest,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check revision
    if if_match:
        expected_revision = int(if_match.strip('"'))
        if task.revision != expected_revision:
            raise HTTPException(status_code=409, detail="Conflict: task has been modified")
    
    # Update fields
    if update_data.dueAt is not None:
        task.due_at = datetime.fromisoformat(update_data.dueAt.replace("Z", "+00:00")) if update_data.dueAt else None
    
    if update_data.steps:
        task.steps = [step.model_dump() for step in update_data.steps]
    
    task.revision += 1
    await db.commit()
    await db.refresh(task)
    
    return task_to_response(task)


@router.post("/{task_id}/commands/start", response_model=AgendaTask)
async def start_task(
    task_id: str,
    command_data: TaskCommandRequest,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if if_match:
        expected_revision = int(if_match.strip('"'))
        if task.revision != expected_revision:
            raise HTTPException(status_code=409, detail="Conflict: task has been modified")
    
    task.status = "in-progress"
    task.started_at = datetime.utcnow()
    task.revision += 1
    
    await db.commit()
    await db.refresh(task)
    
    return task_to_response(task)


@router.post("/{task_id}/commands/postpone", response_model=AgendaTask)
async def postpone_task(
    task_id: str,
    command_data: PostponeTaskRequest,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if if_match:
        expected_revision = int(if_match.strip('"'))
        if task.revision != expected_revision:
            raise HTTPException(status_code=409, detail="Conflict: task has been modified")
    
    # Postpone by days
    if task.due_at:
        task.due_at = task.due_at + timedelta(days=command_data.days)
    else:
        task.due_at = datetime.utcnow() + timedelta(days=command_data.days)
    
    task.postpone_count += 1
    task.revision += 1
    
    await db.commit()
    await db.refresh(task)
    
    return task_to_response(task)


@router.post("/{task_id}/commands/complete", response_model=AgendaTask)
async def complete_task(
    task_id: str,
    command_data: TaskCommandRequest,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if if_match:
        expected_revision = int(if_match.strip('"'))
        if task.revision != expected_revision:
            raise HTTPException(status_code=409, detail="Conflict: task has been modified")
    
    task.status = "completed"
    task.completed_at = datetime.utcnow()
    task.revision += 1
    
    await db.commit()
    await db.refresh(task)
    
    return task_to_response(task)


@router.post("/{task_id}/archive", status_code=status.HTTP_204_NO_CONTENT)
async def archive_task(
    task_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.status = "archived"
    task.archived_at = datetime.utcnow()
    await db.commit()


@router.post("/{task_id}/restore", status_code=status.HTTP_204_NO_CONTENT)
async def restore_task(
    task_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.status = "pending"
    task.archived_at = None
    await db.commit()


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.delete(task)
    await db.commit()
