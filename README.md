# Campus Bites

A small online food ordering project built with FastAPI, SQLAlchemy, SQLite, and plain HTML, CSS, and JavaScript.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Open the app at `http://127.0.0.1:8000` and the API docs at `http://127.0.0.1:8000/docs`.
The sample restaurants and menus are added the first time the app starts.

## API routes

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health` | Check that the API is running |
| GET | `/restaurants` | List restaurants; optional `search` and `cuisine` filters |
| GET | `/restaurants/{id}` | Get restaurant details |
| GET | `/restaurants/{id}/menu` | List available menu items |
| POST | `/orders` | Place an order |
| GET | `/orders` | List recent orders |
| GET | `/orders/{id}` | Get an order and its items |
| PATCH | `/orders/{id}/status` | Move an order through its status |
| DELETE | `/orders/{id}` | Cancel a pending order |

SQLite is used by default. Set `DATABASE_URL` to use another SQLAlchemy database URL.
