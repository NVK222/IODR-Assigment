# Institute of Digital Risk Assignment  
This is the submission for the Institute of Digital Risk internship assignment.  
This uses FastAPI backend with React frontend and an In Memory DB.  
  
# Usage
1. Clone this repository
2. Run `uv sync`.
3. Run `uv run fastapi dev` to start the server.
4. Move to `ui` and run `pnpm install`.
5. Create a `.env` file following the format of `.env.example`.
6. Run `pnpm dev`

# Routes
- #### POST `/transactions` to create a new transaction.  
  Query parameter:
  `
  key: A unique uuid key for api idempotency.
  `  
  Request Body:  
  ```
  user_id : An id for which the transaction will be created. Must be a string.
  amount: The amount spent in the transaction. Must be a decimal greater than 0.
  ```
- #### GET `/summary/:user_id` to get a summary of transactions made by the user.  
  Path parameter:  
  ```
  user_id: The user_id to to generate summary for.
  ```  
- #### GET `/ranking` to get a ranking of all the users, based on their total amount spent and number of transactions made.  
  Query parameter:  
  ```
  top: An integer that determines how many top users will be returned
  ```
  
# How the In Memory DB works
The app implements the In Memory DB inside the `src/iodr/db.py`.  
State is tracked across four variables:
- `self._transactions`: A `list` typed `Transaction` Pydantic records. This stores a list of all the transactions made by all the users.
- `self._idempotency_keys`: A hash `dict` mapping incoming `idempotency_key` string hashes directly to their processed `Transaction` objects. This acts as a high-speed, $O(1)$ lookup layer to catch and intercept cloned API hits instantly.
- `self._users`: A `list` composed of `User` models, which is evaluated to determine real-time rankings.
- `self._key_users`: A secondary hash `dict` indexing `user_id` paths directly to individual `User` objects. This serves as an $O(1)$ pointer index mapping table.

### Data Flow
1. When `create_or_get_transaction` executes, it performs an instant $O(1)$ search against `self._key_users` using the provided account identifier.
2. If the identifier does not match any existing key, a fresh `User` object is created. This reference is added simultaneously to the list (`self._users`) and the map (`self._key_users`).
3. If the user already exists, the database retrieves the object directly from `self._key_users` and appends the new transaction while performing updates to `total_amount` and `number_of_transactions`.

### Mutual Exclusion & Concurrency
A single event loop processing rapid asynchronous operations faces race-condition vulnerabilities. If a new transaction task begins processing while a previous task is yielding control to the event loop, multiple operations could write data concurrently. This can lead to overwriting errors or dirty reads.  

To guarantee complete transaction isolation and integrity, a mutual exclusion control lock (**`asyncio.Lock()`**) is used. 
- Every database function wraps its modifications within an `async with self._lock:` context block.
- While a request is executing inside this block, any incoming concurrent requests must wait until the lock is released. This forces operations into a strict linear queue, preventing data race conditions and keeping all calculations perfectly accurate under heavy traffic.

# How the ranking works
The ranking is determined based on **2** criterias:  
1. **Primary**: The `total_amount` spent by each user.
2. **Secondary**: The number of transactions made by the user.
The users are first sorted in descending order based on the **primary** metric. For tiebreaking, the **secondary** metric is used.

# API Idempotency
To protect the databse from duplicate requests, **API Idempotency** is followed.  
- Whenever the client prepares a transaction, the frontend attaches a distinct **UUID V4** to the header.
- When the backend receives this key, it uses the dict map `self._idempotency_keys` to check if the key already exists.
- If the key already exists, it skips the entire function and returns the associated transaction that already exists.
- If the key is new, we use locks and write a new transaction, which is then added to the `idempotency_keys` map. The new transaction is returned.

# Tradeoffs
- Because of the usage of In Memory DB, this app works correctly on a single event loop. However scaling horizontally is not possible, as this creates issues with data sync.
- Wrapping all of the queries in a lock ensures data integrity, but it produces bottleneck. If a user runs a heavy read operation (if they have a long transaction history), all other queries are blocked until the read finishes.
- Because the idempotency keys are never cleared, they will grow indefinitely and cause an Out of Memory Error.
