# Smart IT Service Request and Support Ticket System
### WSiT – World Systems for Information Technology | Phase 2

A full-stack web application for submitting, tracking, and managing IT service requests.
Built with React (Vite) on the frontend and FastAPI (Python) on the backend, persisted in SQLite via SQLAlchemy.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 18, Vite 5, React Router 6, Axios |
| Backend | FastAPI, Uvicorn (ASGI) |
| ORM | SQLAlchemy 2.0 |
| Validation | Pydantic 2.7 |
| Authentication | JWT (python-jose) |
| Password Hashing | bcrypt (passlib) |
| Database | SQLite (`wsit_support.db`) |

---

## Prerequisites

- **Python** 3.11+ — [python.org](https://www.python.org)
- **Node.js** 18+ and **npm** — [nodejs.org](https://nodejs.org)

---

## Running the Backend

```bash
# 1. Navigate to the backend directory
cd smart-it-support-system/backend

# 2. Create and activate a virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy the environment file
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux

# 5. Start the development server
uvicorn main:app --reload --port 8000
```

The API is available at **http://localhost:8000**  
Interactive docs (Swagger UI): **http://localhost:8000/docs**

> On first startup the database tables are created automatically and the default admin account is seeded.

### Backend Environment Variables (`backend/.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `SECRET_KEY` | dev key | JWT signing secret — **change this in production** |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token lifetime (24 hours) |
| `DATABASE_URL` | `sqlite:///./wsit_support.db` | SQLAlchemy database URL |

---

## Running the Frontend

```bash
# 1. Navigate to the frontend directory
cd smart-it-support-system/frontend

# 2. Copy the environment file
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux

# 3. Install dependencies
npm install

# 4. Start the Vite dev server
npm run dev
```

The application is available at **http://localhost:5173**

### Frontend Environment Variables (`frontend/.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:8000` | Backend API base URL |

---

## Default Admin Credentials

| Field | Value |
| :--- | :--- |
| Email | `admin@wsit.com` |
| Password | `admin123` |

---

## API Endpoint Summary

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/customers/register` | No | — | Register a new customer account |
| `POST` | `/auth/login` | No | — | Login — returns JWT + user info |
| `POST` | `/tickets` | Yes | Customer | Submit a new service request ticket |
| `GET` | `/tickets/my` | Yes | Customer | List own tickets (supports `?status=`, `?priority=`, `?search=`) |
| `GET` | `/tickets` | Yes | Admin | List all tickets (supports `?status=`, `?priority=`, `?search=`) |
| `GET` | `/tickets/{id}` | Yes | Owner / Admin | Retrieve a single ticket |
| `PUT` | `/tickets/{id}/status` | Yes | Admin | Update ticket status |
| `PUT` | `/tickets/{id}/assign` | Yes | Admin | Assign a technician |
| `GET` | `/` | No | — | Health check |

### Authentication

Pass the JWT returned by `/auth/login` as a Bearer token on all protected requests:

```
Authorization: Bearer <token>
```

---

## Ticket Search & Filter

Both `/tickets` and `/tickets/my` accept optional query parameters:

| Parameter | Example | Description |
| :--- | :--- | :--- |
| `status` | `?status=open` | Filter by ticket status |
| `priority` | `?priority=high` | Filter by priority level |
| `search` | `?search=cctv` | Full-text search on title, description, location |

Parameters can be combined: `GET /tickets?status=open&priority=high&search=floor`

---

## Service Types

`CCTV` | `Networking` | `Maintenance` | `Smart Home` | `Access Control` | `Tech Support`

## Ticket Priorities

`low` | `medium` | `high` | `critical`

## Ticket Statuses

`open` → `in_progress` → `resolved` → `closed`

---

## Running with Docker

```bash
# Build and start both services
docker-compose up --build

# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
```

> **Note:** When running with Docker, the frontend is built with `VITE_API_URL=http://localhost:8000`.
> To change the backend URL, pass `--build-arg VITE_API_URL=<url>` to the frontend build.

---

## Project Structure

```
smart-it-support-system/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env                    ← local config (not committed)
│   ├── .env.example
│   └── app/
│       ├── core/
│       │   └── config.py       ← env var loading
│       ├── database/database.py
│       ├── models/models.py
│       ├── schemas/schemas.py
│       ├── routes/auth.py
│       ├── routes/tickets.py
│       ├── services/auth_service.py
│       └── services/ticket_service.py
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .env                    ← local config (not committed)
│   ├── .env.example
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── api/client.js
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── StatusBadge.jsx
│       └── pages/
│           ├── LoginPage.jsx
│           ├── CustomerDashboard.jsx
│           ├── AdminDashboard.jsx
│           └── TicketDetails.jsx
├── docs/
│   ├── SAD_V1.md
│   └── SAD_V2.md
├── docker-compose.yml
└── README.md
```

---

## Architecture

This system follows a **Layered REST API Architecture** documented using the **4+1 Architectural Model**.
See [`docs/SAD_V2.md`](docs/SAD_V2.md) for the full Software Architecture Document including PlantUML diagrams for all architectural views.
