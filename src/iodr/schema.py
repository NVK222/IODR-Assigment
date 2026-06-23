from datetime import datetime
from typing import Annotated
from pydantic import BaseModel, Field


class TransactionRequest(BaseModel):
    user_id: str
    amount: Annotated[float, Field(gt=0, description="Amount should be greater than 0")]


class Transaction(TransactionRequest):
    transaction_id: str
    created_at: datetime


class User(BaseModel):
    user_id: str
    transactions: list[Transaction]
    total_amount: float
    number_of_transactions: int
