"""ANT-MICI Antarctic Wilderness Values Dashboard — FastAPI backend."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router

app = FastAPI(title="ANT-MICI Wilderness Dashboard", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"message": "ANT-MICI Antarctic Wilderness Values API v2"}
