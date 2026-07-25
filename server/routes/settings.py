from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from database import get_db
from models import User, UserSettings
from schemas import (
    ReminderSettings, WeeklySchedule, ApiSettings, RetentionPolicy,
    SaveApiSettingsRequest, DiscoverApiModelsRequest, ApiModelOption,
    UpdateRetentionPolicyRequest
)
from auth import get_current_user

router = APIRouter()


async def get_or_create_settings(user: User, db: AsyncSession) -> UserSettings:
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    return settings


@router.put("/reminders", response_model=ReminderSettings)
async def update_reminder_settings(
    reminder_data: ReminderSettings,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    settings = await get_or_create_settings(user, db)
    settings.reminder_settings = reminder_data.model_dump()
    await db.commit()
    await db.refresh(settings)
    
    return ReminderSettings(**settings.reminder_settings)


@router.put("/weekly-report", response_model=WeeklySchedule)
async def update_weekly_schedule(
    weekly_data: WeeklySchedule,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    settings = await get_or_create_settings(user, db)
    settings.weekly_schedule = weekly_data.model_dump()
    await db.commit()
    await db.refresh(settings)
    
    return WeeklySchedule(**settings.weekly_schedule)


@router.put("/ai", response_model=ApiSettings)
async def save_api_settings(
    api_data: SaveApiSettingsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    settings = await get_or_create_settings(user, db)
    settings.api_settings = {
        "endpoint": api_data.endpoint,
        "model": api_data.model,
        "apiKeyConfigured": bool(api_data.apiKey)
    }
    await db.commit()
    await db.refresh(settings)
    
    return ApiSettings(**settings.api_settings)


@router.post("/ai/models", response_model=list[ApiModelOption])
async def discover_api_models(
    discover_data: DiscoverApiModelsRequest,
    user: User = Depends(get_current_user)
):
    # Mock response - in production, this would call the actual API
    return [
        ApiModelOption(id="gpt-4", label="GPT-4"),
        ApiModelOption(id="gpt-3.5-turbo", label="GPT-3.5 Turbo"),
        ApiModelOption(id="claude-3-opus", label="Claude 3 Opus"),
    ]


@router.put("/retention", response_model=RetentionPolicy)
async def update_retention_policy(
    retention_data: UpdateRetentionPolicyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    settings = await get_or_create_settings(user, db)
    settings.retention_policy = {
        "mode": retention_data.mode,
        "deleteAfterDays": retention_data.deleteAfterDays,
        "updatedAt": datetime.utcnow().isoformat() + "Z"
    }
    await db.commit()
    await db.refresh(settings)
    
    return RetentionPolicy(**settings.retention_policy)
