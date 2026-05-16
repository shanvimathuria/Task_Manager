from pydantic import BaseModel
from pydantic import Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class ProjectMemberBase(BaseModel):
    user_id: UUID
    role: str = "member"

class ProjectMemberCreate(ProjectMemberBase):
    pass

class ProjectMemberResponse(ProjectMemberBase):
    id: UUID
    project_id: UUID
    joined_at: datetime
    # We could include basic user details if needed, e.g. name, avatar
    name: Optional[str] = None
    avatar: Optional[str] = None

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    is_favorite: bool = False

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None

class ProjectResponse(ProjectBase):
    id: UUID
    created_by: UUID
    is_favorite: bool
    last_opened: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    members: List[ProjectMemberResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True
