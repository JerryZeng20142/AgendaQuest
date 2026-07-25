from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import List
import uuid
from database import get_db
from models import User, Task, AgentRun
from schemas import AgentPlan, AgentRun as AgentRunSchema, PrepareAgentRunRequest, AuthorizeAgentRunRequest
from auth import get_current_user

router = APIRouter()


def agent_run_to_response(run: AgentRun) -> AgentRunSchema:
    return AgentRunSchema(
        id=run.id,
        taskId=run.task_id,
        risk=run.risk,
        status=run.status,
        actions=run.actions or [],
        logs=run.logs or [],
        permissionScope=run.permission_scope,
        startedAt=run.started_at.isoformat() + "Z" if run.started_at else None,
        completedAt=run.completed_at.isoformat() + "Z" if run.completed_at else None,
        resultSummary=run.result_summary,
        failureReason=run.failure_reason
    )


@router.post("", response_model=AgentPlan)
async def prepare_agent_run(
    prepare_data: PrepareAgentRunRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify task ownership
    result = await db.execute(select(Task).where(Task.id == prepare_data.taskId, Task.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Create agent plan
    plan_id = str(uuid.uuid4())
    confirmation_id = str(uuid.uuid4())
    expires_at = (datetime.utcnow() + timedelta(hours=1)).isoformat() + "Z"
    
    # Mock actions based on task steps
    actions = []
    if task.steps:
        for step in task.steps:
            actions.append({
                "id": str(uuid.uuid4()),
                "label": step.get("label", "Action")
            })
    else:
        actions.append({
            "id": str(uuid.uuid4()),
            "label": "Execute task"
        })
    
    return AgentPlan(
        id=plan_id,
        confirmationId=confirmation_id,
        taskId=task.id,
        risk="low",
        actions=actions,
        permissionOptions=["current-task", "current-step"],
        expiresAt=expires_at
    )


@router.post("/{plan_id}/authorize", response_model=AgentRunSchema)
async def authorize_agent_run(
    plan_id: str,
    authorize_data: AuthorizeAgentRunRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Create agent run
    now = datetime.utcnow()
    
    run = AgentRun(
        id=str(uuid.uuid4()),
        user_id=user.id,
        task_id=authorize_data.confirmationId,  # This would normally be from the plan
        risk="low",
        status="queued",
        actions=[{"id": aid, "label": "Action", "status": "pending"} for aid in authorize_data.confirmedActionIds],
        logs=[{"at": now.isoformat() + "Z", "message": "Agent run authorized"}],
        permission_scope=authorize_data.permissionScope,
        started_at=now
    )
    
    db.add(run)
    await db.commit()
    await db.refresh(run)
    
    return agent_run_to_response(run)


@router.post("/{run_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_agent_run(
    run_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(AgentRun).where(AgentRun.id == run_id, AgentRun.user_id == user.id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    
    run.status = "cancelled"
    run.completed_at = datetime.utcnow()
    await db.commit()
