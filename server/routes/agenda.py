from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from database import get_db
from models import User, Record, Task, Memory, AgentRun, UserSettings
from schemas import AgendaSnapshot, AgendaRecord, AgendaTask, MemoryItem, AgentRun as AgentRunSchema
from schemas import ReminderSettings, WeeklySchedule, ApiSettings, RetentionPolicy, Capability, SyncStatus, WeeklyReport
from auth import get_current_user
from routes.records import record_to_response
from routes.tasks import task_to_response
from routes.memories import memory_to_response
from routes.agent import agent_run_to_response

router = APIRouter()


@router.get("/snapshot", response_model=AgendaSnapshot)
async def get_snapshot(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get all records
    records_result = await db.execute(select(Record).where(Record.user_id == user.id))
    records = records_result.scalars().all()
    
    record_responses = []
    for record in records:
        att_result = await db.execute(select(Record).where(Record.id == record.id))
        record_responses.append(record_to_response(record, []))
    
    # Get all tasks
    tasks_result = await db.execute(select(Task).where(Task.user_id == user.id))
    tasks = tasks_result.scalars().all()
    task_responses = [task_to_response(task) for task in tasks]
    
    # Get all memories
    memories_result = await db.execute(select(Memory).where(Memory.user_id == user.id))
    memories = memories_result.scalars().all()
    memory_responses = [memory_to_response(memory) for memory in memories]
    
    # Get all agent runs
    runs_result = await db.execute(select(AgentRun).where(AgentRun.user_id == user.id))
    runs = runs_result.scalars().all()
    run_responses = [agent_run_to_response(run) for run in runs]
    
    # Get or create settings
    settings_result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    settings = settings_result.scalar_one_or_none()
    
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    now = datetime.utcnow().isoformat() + "Z"
    
    # Default capabilities
    capabilities = [
        Capability(
            id="memory",
            name="Memory",
            state="available",
            detail="Memory system is active",
            updatedAt=now
        ),
        Capability(
            id="agent",
            name="Agent",
            state="available",
            detail="Agent system is active",
            updatedAt=now
        ),
        Capability(
            id="screen-analysis",
            name="Screen Analysis",
            state="unavailable",
            detail="Screen analysis is not configured",
            updatedAt=now
        )
    ]
    
    # Default sync status
    sync_status = SyncStatus(
        state="synced",
        detail="All data is synchronized",
        lastSyncedAt=now
    )
    
    # Default weekly report
    weekly_report = WeeklyReport(
        weekOf=now,
        completedTaskIds=[],
        postponedTasks=[],
        unconvertedRecordIds=[],
        referenceRecordIds=[],
        recommendations=[]
    )
    
    return AgendaSnapshot(
        records=record_responses,
        tasks=task_responses,
        agentRuns=run_responses,
        memories=memory_responses,
        reminderSettings=ReminderSettings(**settings.reminder_settings),
        weeklySchedule=WeeklySchedule(**settings.weekly_schedule),
        apiSettings=ApiSettings(**settings.api_settings),
        retentionPolicy=RetentionPolicy(**settings.retention_policy),
        capabilities=capabilities,
        syncStatus=sync_status,
        weeklyReport=weekly_report
    )


@router.get("/status", response_model=SyncStatus)
async def get_sync_status(
    user: User = Depends(get_current_user)
):
    now = datetime.utcnow().isoformat() + "Z"
    return SyncStatus(
        state="synced",
        detail="All data is synchronized",
        lastSyncedAt=now
    )
