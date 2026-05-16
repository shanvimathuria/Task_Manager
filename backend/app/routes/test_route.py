from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db

router = APIRouter(
    prefix="/test",
    tags=["Test"]
)

@router.get("/")
def test_api():
    return {
        "message": "API working"
    }

@router.get("/db")
def test_db(db: Session = Depends(get_db)):

    result = db.execute(
        text("SELECT NOW();")
    )

    current_time = result.fetchone()

    return {
        "database": "connected",
        "server_time": str(current_time[0])
    }