from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.test_route import router as test_router
from app.routes.auth import router as auth_router
from app.routes.project import router as project_router
from app.routes.task import router as task_router
from app.routes.chat import router as chat_router
from app.core.database import engine, Base

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins==["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test_router)
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(project_router)
app.include_router(task_router)
app.include_router(chat_router)

@app.get("/")
def home():
    return {
        "message": "Backend running"
    }
