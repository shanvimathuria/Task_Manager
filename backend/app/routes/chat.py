from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.deps import get_current_user
from app.core.database import get_db
from app.models.chat import Conversation, Message, DirectConversation, DirectMessage
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.chat import (
    ConversationCreate, ConversationOut, MessageCreate, MessageOut, MessageUpdate,
    DirectConversationCreate, DirectConversationOut, DirectConversationDetailOut, 
    DirectMessageCreate, DirectMessageOut, DirectMessageUpdate
)
from uuid import UUID
from datetime import datetime

router = APIRouter(prefix="/api/chat", tags=["Chat"])


def ensure_project_member(db: Session, project_id: UUID, user_id: UUID):
    membership = db.query(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this project")
    return membership


# ========================
# TEAM CHAT ENDPOINTS
# ========================

@router.post('/create-conversation', response_model=ConversationOut)
def create_conversation(payload: ConversationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        project_uuid = UUID(payload.project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid project id')

    project = db.query(Project).filter(Project.id == project_uuid).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')

    ensure_project_member(db, project_uuid, current_user.id)

    convo = db.query(Conversation).filter(Conversation.project_id == project_uuid).first()
    if convo:
        dto = ConversationOut.from_orm(convo)
        dto.project = {
            "id": str(project.id),
            "title": project.title
        }
        return dto

    convo = Conversation(project_id=project_uuid)
    db.add(convo)
    db.commit()
    db.refresh(convo)
    
    dto = ConversationOut.from_orm(convo)
    dto.project = {
        "id": str(project.id),
        "title": project.title
    }
    return dto


@router.get('/conversations', response_model=list[ConversationOut])
def get_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all team conversations the user is part of (from projects they belong to)"""
    # Get all projects user is member of
    user_projects = db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()
    project_ids = [pm.project_id for pm in user_projects]
    
    if not project_ids:
        return []
    
    # Get conversations for these projects
    conversations = db.query(Conversation).filter(Conversation.project_id.in_(project_ids)).all()
    
    out = []
    for convo in conversations:
        project = db.query(Project).filter(Project.id == convo.project_id).first()
        dto = ConversationOut.from_orm(convo)
        if project:
            dto.project = {
                "id": str(project.id),
                "title": project.title
            }
        out.append(dto)
    
    return out


@router.get('/projects', response_model=list[dict])
def get_user_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all projects the user is member of (for creating new team chats)"""
    user_projects = db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()
    
    out = []
    for pm in user_projects:
        project = db.query(Project).filter(Project.id == pm.project_id).first()
        if project:
            out.append({
                "id": str(project.id),
                "title": project.title
            })
    
    return out


@router.get('/project/{project_id}', response_model=ConversationOut)
def get_project_conversation(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid project id')

    project = db.query(Project).filter(Project.id == project_uuid).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')

    ensure_project_member(db, project_uuid, current_user.id)

    convo = db.query(Conversation).filter(Conversation.project_id == project_uuid).first()
    if not convo:
        # create lazily
        convo = Conversation(project_id=project_uuid)
        db.add(convo)
        db.commit()
        db.refresh(convo)

    dto = ConversationOut.from_orm(convo)
    dto.project = {
        "id": str(project.id),
        "title": project.title
    }
    return dto


@router.get('/messages/{conversation_id}', response_model=list[MessageOut])
def get_messages(conversation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        convo_uuid = UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid conversation id')

    convo = db.query(Conversation).filter(Conversation.id == convo_uuid).first()
    if not convo:
        raise HTTPException(status_code=404, detail='Conversation not found')

    ensure_project_member(db, convo.project_id, current_user.id)

    messages = db.query(Message).filter(Message.conversation_id == convo_uuid).order_by(Message.created_at.asc()).all()
    # attach sender_name
    out = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        dto = MessageOut.from_orm(m)
        dto.sender_name = getattr(sender, 'name', None) or getattr(sender, 'email', None)
        out.append(dto)
    return out


@router.post('/send-message', response_model=MessageOut)
def send_message(payload: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        convo_uuid = UUID(payload.conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid conversation id')

    convo = db.query(Conversation).filter(Conversation.id == convo_uuid).first()
    if not convo:
        raise HTTPException(status_code=404, detail='Conversation not found')

    ensure_project_member(db, convo.project_id, current_user.id)

    msg = Message(conversation_id=convo_uuid, sender_id=current_user.id, message=payload.message)
    db.add(msg)
    db.commit()
    db.refresh(msg)

    sender = db.query(User).filter(User.id == msg.sender_id).first()
    dto = MessageOut.from_orm(msg)
    dto.sender_name = getattr(sender, 'name', None) or getattr(sender, 'email', None)
    return dto


@router.put('/edit-message/{id}', response_model=MessageOut)
def edit_message(id: str, payload: MessageUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        msg_uuid = UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid message id')

    msg = db.query(Message).filter(Message.id == msg_uuid).first()
    if not msg:
        raise HTTPException(status_code=404, detail='Message not found')

    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail='Cannot edit messages you did not send')

    msg.message = payload.message
    msg.is_edited = datetime.utcnow()
    db.add(msg)
    db.commit()
    db.refresh(msg)

    sender = db.query(User).filter(User.id == msg.sender_id).first()
    dto = MessageOut.from_orm(msg)
    dto.sender_name = getattr(sender, 'name', None) or getattr(sender, 'email', None)
    return dto


@router.delete('/delete-message/{id}')
def delete_message(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        msg_uuid = UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid message id')

    msg = db.query(Message).filter(Message.id == msg_uuid).first()
    if not msg:
        raise HTTPException(status_code=404, detail='Message not found')

    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail='Cannot delete messages you did not send')

    db.delete(msg)
    db.commit()
    return {"detail": "Message deleted"}


# ========================
# PERSONAL/DIRECT CHAT ENDPOINTS
# ========================

@router.post('/create-direct-chat', response_model=DirectConversationOut)
def create_direct_chat(payload: DirectConversationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        user_id_2 = UUID(payload.user_id_2)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid user id')

    # Check that user exists
    target_user = db.query(User).filter(User.id == user_id_2).first()
    if not target_user:
        raise HTTPException(status_code=404, detail='User not found')

    # Prevent self-chat
    if user_id_2 == current_user.id:
        raise HTTPException(status_code=400, detail='Cannot create chat with yourself')

    # Check if conversation already exists (in either order)
    existing = db.query(DirectConversation).filter(
        or_(
            (DirectConversation.user_id_1 == current_user.id) & (DirectConversation.user_id_2 == user_id_2),
            (DirectConversation.user_id_1 == user_id_2) & (DirectConversation.user_id_2 == current_user.id)
        )
    ).first()

    if existing:
        return existing

    # Create new conversation
    convo = DirectConversation(user_id_1=current_user.id, user_id_2=user_id_2)
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


@router.get('/direct', response_model=list[DirectConversationDetailOut])
def get_direct_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all direct conversations for the current user (most recent first)"""
    conversations = db.query(DirectConversation).filter(
        or_(
            DirectConversation.user_id_1 == current_user.id,
            DirectConversation.user_id_2 == current_user.id
        )
    ).order_by(DirectConversation.updated_at.desc()).all()

    out = []
    for convo in conversations:
        dto = DirectConversationDetailOut.from_orm(convo)
        # Determine the "other user"
        other_user_id = convo.user_id_2 if convo.user_id_1 == current_user.id else convo.user_id_1
        other_user = db.query(User).filter(User.id == other_user_id).first()
        if other_user:
            dto.other_user = {
                "id": str(other_user.id),
                "name": other_user.name,
                "email": other_user.email,
                "avatar": other_user.avatar
            }
        out.append(dto)
    return out


@router.get('/dm-users', response_model=list[dict])
def get_dm_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all users who share at least one project with the current user (for DM list)"""
    # Get all projects the current user is a member of
    user_projects = db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()
    project_ids = [pm.project_id for pm in user_projects]
    
    if not project_ids:
        return []
    
    # Get all users who are members of these projects (excluding current user)
    other_members = db.query(ProjectMember).filter(
        ProjectMember.project_id.in_(project_ids),
        ProjectMember.user_id != current_user.id
    ).all()
    
    # Get unique user IDs
    user_ids = set(pm.user_id for pm in other_members)
    
    # Fetch user details
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    
    # Return user info
    out = []
    for user in users:
        out.append({
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "avatar": user.avatar
        })
    
    return out


@router.get('/direct/{conversation_id}', response_model=list[DirectMessageOut])
def get_direct_messages(conversation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all messages in a direct conversation"""
    try:
        convo_uuid = UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid conversation id')

    convo = db.query(DirectConversation).filter(DirectConversation.id == convo_uuid).first()
    if not convo:
        raise HTTPException(status_code=404, detail='Conversation not found')

    # Verify user is part of this conversation
    if convo.user_id_1 != current_user.id and convo.user_id_2 != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Not part of this conversation')

    messages = db.query(DirectMessage).filter(DirectMessage.conversation_id == convo_uuid).order_by(DirectMessage.created_at.asc()).all()
    
    out = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        dto = DirectMessageOut.from_orm(m)
        dto.sender_name = getattr(sender, 'name', None) or getattr(sender, 'email', None)
        out.append(dto)
    return out


@router.post('/send-direct-message', response_model=DirectMessageOut)
def send_direct_message(payload: DirectMessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Send a message in a direct conversation"""
    try:
        convo_uuid = UUID(payload.conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid conversation id')

    convo = db.query(DirectConversation).filter(DirectConversation.id == convo_uuid).first()
    if not convo:
        raise HTTPException(status_code=404, detail='Conversation not found')

    # Verify user is part of this conversation
    if convo.user_id_1 != current_user.id and convo.user_id_2 != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Not part of this conversation')

    msg = DirectMessage(conversation_id=convo_uuid, sender_id=current_user.id, message=payload.message)
    db.add(msg)
    
    # Update conversation's updated_at timestamp
    convo.updated_at = datetime.utcnow()
    db.add(convo)
    
    db.commit()
    db.refresh(msg)

    sender = db.query(User).filter(User.id == msg.sender_id).first()
    dto = DirectMessageOut.from_orm(msg)
    dto.sender_name = getattr(sender, 'name', None) or getattr(sender, 'email', None)
    return dto


@router.put('/edit-direct-message/{id}', response_model=DirectMessageOut)
def edit_direct_message(id: str, payload: DirectMessageUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Edit a direct message"""
    try:
        msg_uuid = UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid message id')

    msg = db.query(DirectMessage).filter(DirectMessage.id == msg_uuid).first()
    if not msg:
        raise HTTPException(status_code=404, detail='Message not found')

    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail='Cannot edit messages you did not send')

    msg.message = payload.message
    msg.is_edited = datetime.utcnow()
    db.add(msg)
    db.commit()
    db.refresh(msg)

    sender = db.query(User).filter(User.id == msg.sender_id).first()
    dto = DirectMessageOut.from_orm(msg)
    dto.sender_name = getattr(sender, 'name', None) or getattr(sender, 'email', None)
    return dto


@router.delete('/delete-direct-message/{id}')
def delete_direct_message(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a direct message"""
    try:
        msg_uuid = UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid message id')

    msg = db.query(DirectMessage).filter(DirectMessage.id == msg_uuid).first()
    if not msg:
        raise HTTPException(status_code=404, detail='Message not found')

    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail='Cannot delete messages you did not send')

    db.delete(msg)
    db.commit()
    return {"detail": "Message deleted"}
