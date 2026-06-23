from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from iodr.db import db, seed_db
from iodr.schema import TransactionRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def check_health():
    return {"status": "ok"}


@app.post("/transaction")
async def create_or_get_transaction(tx: TransactionRequest, key: str):
    return await db.create_or_get_transaction(tx, key)


@app.get("/summary/{user_id}")
async def get_user_summary(user_id: str):
    return await db.get_user_summary(user_id)


@app.get("/ranking")
async def get_ranking(top: int = 5):
    if top <= 0:
        raise HTTPException(400, "Top can only be an integer greater than 0.")
    return await db.get_ranking(top)
