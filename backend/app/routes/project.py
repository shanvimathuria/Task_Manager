from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from typing import List
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectMemberResponse, ProjectMemberCreate
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/projects", tags=["Projects"])

def get_project_for_user(project_id: UUID, current_user: User, db: Session):
    project = (
        db.query(Project)
        .options(selectinload(Project.members))
        .filter(Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.created_by != current_user.id and not any(member.user_id == current_user.id for member in project.members):
        raise HTTPException(status_code=403, detail="Not authorized to access this project")
    
    return project


def get_project_owner(project: Project, current_user: User):
    if project.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can manage members")


def serialize_member(member: ProjectMember, db: Session) -> ProjectMemberResponse:
    response = ProjectMemberResponse.model_validate(member)
    target_user = db.query(User).filter(User.id == member.user_id).first()
    response.name = target_user.name if target_user else "Unknown"
    response.avatar = target_user.avatar if target_user and target_user.avatar else "U"
    return response


def serialize_project(project: Project, db: Session) -> ProjectResponse:
    response = ProjectResponse.model_validate(project)
    response.members = [serialize_member(member, db) for member in (project.members or [])]
    return response


def accessible_projects_query(db: Session, current_user: User):
    return (
        db.query(Project)
        .options(selectinload(Project.members))
        .filter(
            (Project.created_by == current_user.id)
            | (Project.members.any(ProjectMember.user_id == current_user.id))
        )
    )

@router.post("/create", response_model=ProjectResponse)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_project = Project(
        title=project_in.title,
        description=project_in.description,
        due_date=project_in.due_date,
        created_by=current_user.id,
        is_favorite=project_in.is_favorite,
        last_opened=datetime.utcnow()
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == db_project.id,
        ProjectMember.user_id == current_user.id,
    ).first()
    if not existing_member:
        try:
            db.add(ProjectMember(project_id=db_project.id, user_id=current_user.id, role="admin"))
            db.commit()
        except IntegrityError:
            db.rollback()

    db.refresh(db_project)

    return db_project

@router.get("/recent", response_model=List[ProjectResponse])
def get_recent_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    projects = (
        accessible_projects_query(db, current_user)
        .order_by(Project.last_opened.desc().nullslast(), Project.updated_at.desc())
        .limit(10)
        .all()
    )
    return [serialize_project(project, db) for project in projects]

@router.get("/favorites", response_model=List[ProjectResponse])
def get_favorite_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    projects = (
        accessible_projects_query(db, current_user)
        .filter(Project.is_favorite.is_(True))
        .order_by(Project.updated_at.desc())
        .all()
    )
    return [serialize_project(project, db) for project in projects]

@router.get("", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    projects = accessible_projects_query(db, current_user).order_by(Project.updated_at.desc()).all()
    return [serialize_project(project, db) for project in projects]

@router.get("/{id}", response_model=ProjectResponse)
def get_project(id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = get_project_for_user(id, current_user, db)
    project.last_opened = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return serialize_project(project, db)

@router.put("/{id}", response_model=ProjectResponse)
def update_project(id: UUID, project_in: ProjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = get_project_for_user(id, current_user, db)
    
    if project_in.title is not None:
        project.title = project_in.title
    if project_in.description is not None:
        project.description = project_in.description
    if project_in.due_date is not None:
        project.due_date = project_in.due_date

    db.commit()
    db.refresh(project)
    return serialize_project(project, db)

@router.delete("/{id}")
def delete_project(id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = get_project_for_user(id, current_user, db)
    if project.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete the project")
    
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}

@router.put("/{id}/favorite", response_model=ProjectResponse)
def toggle_favorite(id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = get_project_for_user(id, current_user, db)
    project.is_favorite = not project.is_favorite
    db.commit()
    db.refresh(project)
    return serialize_project(project, db)

@router.post("/{id}/add-member", response_model=ProjectMemberResponse)
def add_member(id: UUID, member_in: ProjectMemberCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = get_project_for_user(id, current_user, db)
    get_project_owner(project, current_user)

    target_user = db.query(User).filter(User.id == member_in.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User to add not found")

    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == id,
        ProjectMember.user_id == member_in.user_id
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a member")

    new_member = ProjectMember(
        project_id=id,
        user_id=member_in.user_id,
        role=member_in.role
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    # Map attributes for response
    response_data = ProjectMemberResponse.model_validate(new_member)
    response_data.name = target_user.name
    response_data.avatar = target_user.avatar
    return response_data

@router.delete("/{id}/remove-member/{userId}")
def remove_member(id: UUID, userId: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = get_project_for_user(id, current_user, db)

    if project.created_by == userId:
        raise HTTPException(status_code=400, detail="Cannot remove the owner from the project")

    if current_user.id != project.created_by and current_user.id != userId:
        raise HTTPException(status_code=403, detail="Not authorized to remove this member")

    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == id,
        ProjectMember.user_id == userId
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()
    return {"message": "Member removed successfully"}

@router.get("/{id}/members", response_model=List[ProjectMemberResponse])
def get_members(id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = get_project_for_user(id, current_user, db)
    
    members = db.query(ProjectMember).filter(ProjectMember.project_id == id).all()
    return [serialize_member(member, db) for member in members]
