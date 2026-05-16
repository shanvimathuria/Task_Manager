from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_current_user
from app.core.database import get_db
from app.models.chat import Conversation, Message
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.chat import ConversationCreate, ConversationOut, MessageCreate, MessageOut, MessageUpdate
from uuid import UUID
from datetime import datetime

router = APIRouter(prefix="/api/chat", tags=["Chat"])


def ensure_project_member(db: Session, project_id: UUID, user_id: UUID):
    membership = db.query(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this project")
    return membership


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
        return convo

    convo = Conversation(project_id=project_uuid)
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


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

    return convo


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
