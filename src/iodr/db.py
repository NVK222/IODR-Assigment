import asyncio
from datetime import datetime, timezone
import uuid
from iodr.schema import Transaction, TransactionRequest, User


class InMemoryDB:
    def __init__(self) -> None:
        self._transactions: list[Transaction] = []
        self._idempotency_keys: dict[
            str, Transaction
        ] = {}  # For api idempotency, map from idempotency_key -> Transaction
        self._users: list[User] = []
        self._key_users: dict[str, User] = {}  # For a map from user_id -> User
        self._lock = asyncio.Lock()

    async def create_or_get_transaction(
        self, details: TransactionRequest, idempotency_key: str
    ) -> Transaction:
        async with self._lock:
            if idempotency_key in self._idempotency_keys.keys():
                # If the key already exists just return the associated transaction
                return self._idempotency_keys[idempotency_key]

            new_transaction = Transaction(
                transaction_id=str(uuid.uuid4()),
                user_id=details.user_id,
                amount=details.amount,
                created_at=datetime.now(timezone.utc),
            )

            self._transactions.append(new_transaction)
            self._idempotency_keys[idempotency_key] = new_transaction

            if details.user_id not in self._key_users.keys():
                new_user = User(
                    user_id=details.user_id,
                    transactions=[new_transaction],
                    total_amount=details.amount,
                    number_of_transactions=1,
                )
                self._users.append(new_user)
                self._key_users[details.user_id] = new_user
            else:
                existing_user = self._key_users[details.user_id]
                existing_user.transactions.append(new_transaction)
                existing_user.total_amount += details.amount
                existing_user.number_of_transactions += 1

            return new_transaction

    async def get_user_summary(
        self, user_id: str
    ) -> tuple[list[Transaction], float, int]:
        """
        Returns a summary of transactions for a user.

        Args:
            user_id : str = user_id of the user whose summary is required.

        Returns:
            A tuple containing:
                A list of all the transactions made by the user in descending order.
                The total amount of money spent by the user.
                The total number of transactions made by the user.
        """
        async with self._lock:
            user = self._key_users[user_id]
            transactions = sorted(
                user.transactions, key=lambda tx: tx.created_at, reverse=True
            )
            return transactions, user.total_amount, user.number_of_transactions

    async def get_ranking(self, top: int = 5) -> list[User]:
        """
        Gets the ranking of all the users based on the total amount of money they have spent and the total number of transactions they have made.

        Args:
            top : int = The number of top users to be returned

        Returns:
            A list of top ranking users.
        """
        async with self._lock:
            users = sorted(
                self._users,
                key=lambda user: (user.total_amount, user.number_of_transactions),
                reverse=True,
            )

            top_users = users[:top]

            return top_users


db = InMemoryDB()


async def seed_db():
    transactions = [
        {"user_id": "alice", "amount": 100.0, "key": "seed_1"},
        {"user_id": "bob", "amount": 200.0, "key": "seed_2"},
        {"user_id": "jake", "amount": 1000.0, "key": "seed_3"},
        {"user_id": "rose", "amount": 500.0, "key": "seed_4"},
        {"user_id": "harold", "amount": 20.0, "key": "seed_5"},
        {"user_id": "alice", "amount": 1000.0, "key": "seed_6"},
        {"user_id": "bob", "amount": 2000.0, "key": "seed_7"},
        {"user_id": "caroline", "amount": 250.0, "key": "seed_8"},
        {"user_id": "harold", "amount": 20.0, "key": "seed_9"},
        {"user_id": "michael", "amount": 750.0, "key": "seed_10"},
    ]

    for tx in transactions:
        await db.create_or_get_transaction(
            TransactionRequest(user_id=tx.get("user_id"), amount=tx.get("amount")),
            tx.get("key"),
        )

    print("Database seeded.")
