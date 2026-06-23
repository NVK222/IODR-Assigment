from datetime import datetime
from pydantic import BaseModel


class Transaction(BaseModel):
    transaction_id: str
    user_id: str
    amount: float
    created_at: datetime


class TransactionRequest(BaseModel):
    user_id: str
    amount: float


class User(BaseModel):
    user_id: str
    transactions: list[Transaction]
    total_amount: float
    number_of_transactions: int
