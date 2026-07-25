from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import List
import uuid
import os
from database import get_db
from models import Record, Attachment, User
from schemas import AgendaRecord, CreateRecordRequest, RecordAnalysis, RecordAttachment, AttachmentDownload
from auth import get_current_user

router = APIRouter()


def record_to_response(record: Record, attachments: List[Attachment] = None) -> AgendaRecord:
    attachment_list = []
    if attachments:
        attachment_list = [
            RecordAttachment(
                id=att.id,
                name=att.name,
                mediaType=att.media_type,
                size=att.size,
                createdAt=att.created_at.isoformat() + "Z"
            ) for att in attachments
        ]
    
    # Ensure analysis has required fields
    analysis_data = record.analysis or {}
    analysis = RecordAnalysis(
        runId=analysis_data.get("runId"),
        requestedAt=analysis_data.get("requestedAt", record.created_at.isoformat() + "Z"),
        completedAt=analysis_data.get("completedAt"),
        status=analysis_data.get("status", "queued"),
        kind=analysis_data.get("kind"),
        confidence=analysis_data.get("confidence"),
        title=analysis_data.get("title"),
        nextAction=analysis_data.get("nextAction"),
        suggestedDueAt=analysis_data.get("suggestedDueAt"),
        topics=analysis_data.get("topics", []),
        suggestedSteps=analysis_data.get("suggestedSteps", []),
        uncertaintyNote=analysis_data.get("uncertaintyNote"),
        failureReason=analysis_data.get("failureReason")
    )
    
    analysis_history = []
    if record.analysis_history:
        for hist in record.analysis_history:
            analysis_history.append(RecordAnalysis(
                runId=hist.get("runId"),
                requestedAt=hist.get("requestedAt", record.created_at.isoformat() + "Z"),
                completedAt=hist.get("completedAt"),
                status=hist.get("status", "queued"),
                kind=hist.get("kind"),
                confidence=hist.get("confidence"),
                title=hist.get("title"),
                nextAction=hist.get("nextAction"),
                suggestedDueAt=hist.get("suggestedDueAt"),
                topics=hist.get("topics", []),
                suggestedSteps=hist.get("suggestedSteps", []),
                uncertaintyNote=hist.get("uncertaintyNote"),
                failureReason=hist.get("failureReason")
            ))
    
    return AgendaRecord(
        id=record.id,
        rawContent=record.raw_content,
        retainedSummary=record.retained_summary,
        evidenceState=record.evidence_state,
        source=record.source,
        createdAt=record.created_at.isoformat() + "Z",
        persistedAt=record.persisted_at.isoformat() + "Z",
        updatedAt=record.updated_at.isoformat() + "Z",
        status=record.status,
        analysis=analysis,
        analysisHistory=analysis_history,
        attachments=attachment_list,
        taskId=record.task_id
    )


@router.post("", response_model=AgendaRecord, status_code=status.HTTP_201_CREATED)
async def create_record(
    record_data: CreateRecordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    record = Record(
        user_id=user.id,
        raw_content=record_data.rawContent,
        source=record_data.source,
        evidence_state="full",
        status="queued",
        created_at=now,
        persisted_at=now,
        updated_at=now,
        analysis={
            "requestedAt": now.isoformat() + "Z",
            "status": "queued",
            "topics": [],
            "suggestedSteps": []
        },
        analysis_history=[]
    )
    
    db.add(record)
    await db.commit()
    await db.refresh(record)
    
    return record_to_response(record, [])


@router.post("/{record_id}/attachments", response_model=List[RecordAttachment])
async def upload_attachments(
    record_id: str,
    attachments: List[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify record ownership
    result = await db.execute(select(Record).where(Record.id == record_id, Record.user_id == user.id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Create uploads directory
    os.makedirs("uploads", exist_ok=True)
    
    saved_attachments = []
    for file in attachments:
        attachment_id = str(uuid.uuid4())
        file_path = f"uploads/{attachment_id}_{file.filename}"
        
        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        attachment = Attachment(
            id=attachment_id,
            record_id=record_id,
            name=file.filename,
            media_type=file.content_type or "application/octet-stream",
            size=len(content),
            file_path=file_path
        )
        
        db.add(attachment)
        saved_attachments.append(attachment)
    
    await db.commit()
    
    return [
        RecordAttachment(
            id=att.id,
            name=att.name,
            mediaType=att.media_type,
            size=att.size,
            createdAt=att.created_at.isoformat() + "Z"
        ) for att in saved_attachments
    ]


@router.post("/{record_id}/analysis", response_model=AgendaRecord)
async def request_analysis(
    record_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Record).where(Record.id == record_id, Record.user_id == user.id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    now = datetime.utcnow()
    
    # Update analysis status
    if record.analysis:
        record.analysis["status"] = "queued"
        record.analysis["requestedAt"] = now.isoformat() + "Z"
    
    # Add to history
    if record.analysis_history is None:
        record.analysis_history = []
    record.analysis_history.append({
        "requestedAt": now.isoformat() + "Z",
        "status": "queued",
        "topics": [],
        "suggestedSteps": []
    })
    
    record.updated_at = now
    await db.commit()
    await db.refresh(record)
    
    # Get attachments
    att_result = await db.execute(select(Attachment).where(Attachment.record_id == record_id))
    attachments = att_result.scalars().all()
    
    return record_to_response(record, attachments)


@router.post("/{record_id}/attachments/{attachment_id}/download", response_model=AttachmentDownload)
async def get_attachment_download(
    record_id: str,
    attachment_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.record_id == record_id
        )
    )
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Verify record ownership
    rec_result = await db.execute(select(Record).where(Record.id == record_id, Record.user_id == user.id))
    if not rec_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Record not found")
    
    # In production, this would be a signed URL
    # For now, return a placeholder
    now = datetime.utcnow()
    expires_at = (now.replace(hour=23, minute=59, second=59)).isoformat() + "Z"
    
    return AttachmentDownload(
        url=f"/uploads/{attachment.file_path.split('/')[-1]}",
        expiresAt=expires_at
    )


@router.post("/{record_id}/archive", status_code=status.HTTP_204_NO_CONTENT)
async def archive_record(
    record_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Record).where(Record.id == record_id, Record.user_id == user.id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    record.status = "archived"
    record.updated_at = datetime.utcnow()
    await db.commit()


@router.post("/{record_id}/restore", status_code=status.HTTP_204_NO_CONTENT)
async def restore_record(
    record_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Record).where(Record.id == record_id, Record.user_id == user.id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    record.status = "queued"
    record.updated_at = datetime.utcnow()
    await db.commit()


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    record_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Record).where(Record.id == record_id, Record.user_id == user.id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    await db.delete(record)
    await db.commit()
