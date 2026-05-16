from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ConversationCreate(BaseModel):
    project_id: str


class ConversationOut(BaseModel):
    id: str
    project_id: str
    created_at: datetime
    project: Optional[dict] = None  # Will contain project info

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


# Direct Chat Schemas
class DirectConversationCreate(BaseModel):
    user_id_2: str


class DirectConversationOut(BaseModel):
    id: str
    user_id_1: str
    user_id_2: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class DirectConversationDetailOut(BaseModel):
    id: str
    user_id_1: str
    user_id_2: str
    created_at: datetime
    updated_at: datetime
    other_user: Optional[dict] = None  # Will contain other_user info

    class Config:
        orm_mode = True


class DirectMessageCreate(BaseModel):
    conversation_id: str
    message: str


class DirectMessageOut(BaseModel):
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


class DirectMessageUpdate(BaseModel):
    message: str

