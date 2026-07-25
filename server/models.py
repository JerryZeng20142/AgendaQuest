from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import uuid


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    onboarding_completed = Column(Boolean, default=False)
    onboarding_settings = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    records = relationship("Record", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="user", cascade="all, delete-orphan")
    agent_runs = relationship("AgentRun", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Record(Base):
    __tablename__ = "records"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    raw_content = Column(Text, nullable=True)
    retained_summary = Column(Text, nullable=True)
    evidence_state = Column(String, default="full")
    source = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    persisted_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String, default="queued")
    analysis = Column(JSON, default=dict)
    analysis_history = Column(JSON, default=list)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    
    user = relationship("User", back_populates="records")
    attachments = relationship("Attachment", back_populates="record", cascade="all, delete-orphan")


class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id = Column(String, ForeignKey("records.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    media_type = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    record = relationship("Record", back_populates="attachments")


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    record_id = Column(String, ForeignKey("records.id"), nullable=False)
    title = Column(String, nullable=False)
    next_action = Column(String, nullable=False)
    due_at = Column(DateTime, nullable=True)
    priority = Column(String, default="normal")
    status = Column(String, default="pending")
    steps = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, nullable=True)
    completion_summary = Column(Text, nullable=True)
    postpone_count = Column(Integer, default=0)
    revision = Column(Integer, default=0)
    
    user = relationship("User", back_populates="tasks")
    agent_runs = relationship("AgentRun", back_populates="task", cascade="all, delete-orphan")


class Memory(Base):
    __tablename__ = "memories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    source_record_ids = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String, default="active")
    
    user = relationship("User", back_populates="memories")


class AgentRun(Base):
    __tablename__ = "agent_runs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    risk = Column(String, default="low")
    status = Column(String, default="queued")
    actions = Column(JSON, default=list)
    logs = Column(JSON, default=list)
    permission_scope = Column(String, default="current-task")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    result_summary = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)
    
    user = relationship("User", back_populates="agent_runs")
    task = relationship("Task", back_populates="agent_runs")


class UserSettings(Base):
    __tablename__ = "user_settings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    reminder_settings = Column(JSON, default=lambda: {
        "mode": "global",
        "channels": ["in-app"],
        "cooldownMinutes": 0,
        "dueWarningHours": 24,
        "desktopNotificationsEnabled": False
    })
    weekly_schedule = Column(JSON, default=lambda: {
        "enabled": False,
        "weekday": "monday",
        "time": "09:00",
        "timezone": "UTC",
        "channels": ["in-app"]
    })
    api_settings = Column(JSON, default=lambda: {
        "endpoint": "",
        "model": "",
        "apiKeyConfigured": False
    })
    retention_policy = Column(JSON, default=lambda: {
        "mode": "keep-full",
        "updatedAt": datetime.utcnow().isoformat()
    })
    
    user = relationship("User", back_populates="settings")
