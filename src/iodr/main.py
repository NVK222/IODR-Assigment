from contextlib import asynccontextmanager
from typing import Annotated
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from iodr.db import db, seed_db
from iodr.schema import TransactionRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_db()
    yield


app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://iodr-assigment.vercel.app",
    "https://iodr-assigment-nvk222s-projects.vercel.app",
    "https://iodr-assigment-git-main-nvk222s-projects.vercel.app",
    "https://iodr-assigment-1xsci24zv-nvk222s-projects.vercel.app/",
]

app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_headers=["*"], allow_methods=["*"]
)


@app.get("/health")
async def check_health():
    return {"status": "ok"}


@app.post("/transaction")
async def create_or_get_transaction(
    tx: TransactionRequest, idempotency_key: Annotated[str, Header()]
):
    if not idempotency_key or idempotency_key.strip() == "":
        raise HTTPException(400, "Idemptoency key cannot be empty")
    return await db.create_or_get_transaction(tx, idempotency_key)


@app.get("/summary/{user_id}")
async def get_user_summary(user_id: str):
    return await db.get_user_summary(user_id)


@app.get("/ranking")
async def get_ranking(top: int = 5):
    if top <= 0:
        raise HTTPException(400, "Top can only be an integer greater than 0.")
    return await db.get_ranking(top)
