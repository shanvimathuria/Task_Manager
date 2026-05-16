from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ConversationCreate(BaseModel):
    project_id: str


class ConversationOut(BaseModel):
    id: str
    project_id: str
    created_at: datetime

    class Config:
        orm_mode = True


class MessageCreate(BaseModel):
    conversation_id: str
    message: str


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    message: str
    is_edited: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    sender_name: Optional[str] = None

    class Config:
        orm_mode = True


class MessageUpdate(BaseModel):
    message: str
