from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_, select
from typing import List
from uuid import UUID
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectMember, Task
from app.schemas.task import (
    TaskAssignUpdate,
    TaskCreate,
    TaskPriorityUpdate,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
)

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


def accessible_projects_query(db: Session, current_user: User):
    return (
        db.query(Project.id)
        .filter(
            (Project.created_by == current_user.id)
            | (Project.members.any(ProjectMember.user_id == current_user.id))
        )
    )


def get_task_for_user(task_id: UUID, current_user: User, db: Session):
    task = (
        db.query(Task)
        .options(selectinload(Task.project))
        .filter(Task.id == task_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project_access = db.query(Project).filter(Project.id == task.project_id).filter(
        (Project.created_by == current_user.id)
        | (Project.members.any(ProjectMember.user_id == current_user.id))
    ).first()

    if task.created_by != current_user.id and task.assigned_to != current_user.id and not project_access:
        raise HTTPException(status_code=403, detail="Not authorized to access this task")

    return task


def serialize_task(task: Task, db: Session) -> TaskResponse:
    response = TaskResponse.model_validate(task)
    response.project_title = task.project.title if task.project else None
    assignee = db.query(User).filter(User.id == task.assigned_to).first() if task.assigned_to else None
    creator = db.query(User).filter(User.id == task.created_by).first() if task.created_by else None
    response.assigned_name = assignee.name if assignee else None
    response.creator_name = creator.name if creator else None
    return response


def accessible_tasks_query(db: Session, current_user: User):
    project_ids = select(Project.id).where(
        (Project.created_by == current_user.id)
        | (Project.members.any(ProjectMember.user_id == current_user.id))
    )
    return (
        db.query(Task)
        .options(selectinload(Task.project))
        .filter(
            or_(
                Task.created_by == current_user.id,
                Task.assigned_to == current_user.id,
                Task.project_id.in_(project_ids),
            )
        )
    )


def ensure_project_access(project_id: UUID, current_user: User, db: Session):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.created_by != current_user.id and not db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id,
    ).first():
        raise HTTPException(status_code=403, detail="Not authorized for this project")
    return project


@router.post("/create", response_model=TaskResponse)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_project_access(task_in.project_id, current_user, db)

    db_task = Task(
        title=task_in.title,
        description=task_in.description,
        priority=task_in.priority,
        status=task_in.status,
        due_date=task_in.due_date,
        assigned_to=task_in.assigned_to,
        created_by=current_user.id,
        project_id=task_in.project_id,
        completed_at=datetime.utcnow() if task_in.status == "Done" else None,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return serialize_task(db_task, db)


@router.get("", response_model=List[TaskResponse])
def get_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tasks = accessible_tasks_query(db, current_user).order_by(Task.updated_at.desc()).all()
    return [serialize_task(task, db) for task in tasks]


@router.get("/my-tasks", response_model=List[TaskResponse])
def get_my_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tasks = (
        accessible_tasks_query(db, current_user)
        .filter(Task.assigned_to == current_user.id)
        .order_by(Task.due_date.asc().nullslast(), Task.updated_at.desc())
        .all()
    )
    return [serialize_task(task, db) for task in tasks]


@router.get("/project/{projectId}", response_model=List[TaskResponse])
def get_project_tasks(projectId: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_project_access(projectId, current_user, db)
    tasks = db.query(Task).options(selectinload(Task.project)).filter(Task.project_id == projectId).order_by(Task.updated_at.desc()).all()
    return [serialize_task(task, db) for task in tasks]


@router.get("/overdue", response_model=List[TaskResponse])
def get_overdue_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    tasks = accessible_tasks_query(db, current_user).filter(Task.due_date.isnot(None), Task.due_date < now, Task.status != "Done").all()
    return [serialize_task(task, db) for task in tasks]


@router.get("/today", response_model=List[TaskResponse])
def get_today_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    tasks = accessible_tasks_query(db, current_user).filter(
        Task.due_date.isnot(None),
        Task.due_date >= datetime.combine(today, datetime.min.time()),
        Task.due_date < datetime.combine(today + timedelta(days=1), datetime.min.time()),
    ).all()
    return [serialize_task(task, db) for task in tasks]


@router.get("/upcoming", response_model=List[TaskResponse])
def get_upcoming_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    upcoming_end = now + timedelta(days=7)
    tasks = accessible_tasks_query(db, current_user).filter(
        Task.due_date.isnot(None),
        Task.due_date >= now,
        Task.due_date <= upcoming_end,
        Task.status != "Done",
    ).order_by(Task.due_date.asc()).all()
    return [serialize_task(task, db) for task in tasks]


@router.get("/{id}", response_model=TaskResponse)
def get_task(id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = get_task_for_user(id, current_user, db)
    return serialize_task(task, db)


@router.put("/{id}", response_model=TaskResponse)
def update_task(id: UUID, task_in: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = get_task_for_user(id, current_user, db)

    if task_in.project_id is not None:
        ensure_project_access(task_in.project_id, current_user, db)
        task.project_id = task_in.project_id
    if task_in.title is not None:
        task.title = task_in.title
    if task_in.description is not None:
        task.description = task_in.description
    if task_in.priority is not None:
        task.priority = task_in.priority
    if task_in.status is not None:
        task.status = task_in.status
        task.completed_at = datetime.utcnow() if task_in.status == "Done" else None
    if task_in.due_date is not None:
        task.due_date = task_in.due_date
    if task_in.assigned_to is not None:
        task.assigned_to = task_in.assigned_to

    db.commit()
    db.refresh(task)
    return serialize_task(task, db)


@router.delete("/{id}")
def delete_task(id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = get_task_for_user(id, current_user, db)
    if task.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can delete a task")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}


@router.put("/{id}/status", response_model=TaskResponse)
def update_task_status(id: UUID, status_in: TaskStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = get_task_for_user(id, current_user, db)
    task.status = status_in.status
    task.completed_at = datetime.utcnow() if status_in.status == "Done" else None
    db.commit()
    db.refresh(task)
    return serialize_task(task, db)


@router.put("/{id}/assign", response_model=TaskResponse)
def assign_task(id: UUID, assign_in: TaskAssignUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = get_task_for_user(id, current_user, db)
    if assign_in.assigned_to is not None:
        ensure_project_access(task.project_id, current_user, db)
        task.assigned_to = assign_in.assigned_to
    else:
        task.assigned_to = None
    db.commit()
    db.refresh(task)
    return serialize_task(task, db)


@router.put("/{id}/priority", response_model=TaskResponse)
def update_task_priority(id: UUID, priority_in: TaskPriorityUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = get_task_for_user(id, current_user, db)
    task.priority = priority_in.priority
    db.commit()
    db.refresh(task)
    return serialize_task(task, db)