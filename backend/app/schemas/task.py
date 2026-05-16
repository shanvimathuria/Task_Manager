from pydantic import BaseModel, Field
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime

TaskStatus = Literal["To Do", "In Progress", "In Review", "Done"]
TaskPriority = Literal["Low", "Medium", "High", "Urgent"]


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = "Medium"
    status: TaskStatus = "To Do"
    due_date: Optional[datetime] = None
    assigned_to: Optional[UUID] = None
    project_id: UUID


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[UUID] = None
    project_id: Optional[UUID] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskAssignUpdate(BaseModel):
    assigned_to: Optional[UUID] = None


class TaskPriorityUpdate(BaseModel):
    priority: TaskPriority


class TaskResponse(TaskBase):
    id: UUID
    created_by: UUID
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    project_title: Optional[str] = None
    assigned_name: Optional[str] = None
    creator_name: Optional[str] = None

    class Config:
        from_attributes = True