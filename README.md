<div align="center">
  <img src="https://via.placeholder.com/150/0f172a/ffffff?text=LexCase" alt="LexCase Logo" width="100"/>
  <h1>LexCase</h1>
  <p><strong>A Modern, Secure Legal Case Management Platform</strong></p>
  <p>
    Built for law firms to manage cases, interact securely with clients, and streamline day-to-day operations.
    Cloud-ready for AWS deployment (P31 coursework).
  </p>
</div>

<br/>

## Key Features

LexCase is built around a secure, role-based architecture providing specialized portals for every stakeholder in the legal process:

### Admin Portal
- Firm oversight dashboard with case metrics and analytics
- User management for lawyers and paralegals
- Case assignment and firm-wide document oversight

### Lawyer Portal
- Case and task management with deadline tracking
- Secure client messaging
- Invoice generation and billing

### Client Portal
- Real-time case status tracking
- Secure document uploads to case files
- Messaging, appointments, and invoice visibility

### Cloud & Compliance (AWS-Ready)
- **S3** document storage with local fallback for development
- **PostgreSQL (RDS)** for structured case data
- **Audit logs** and case history timeline
- **Legal research** integration via CourtListener API
- **Lambda + EventBridge** deadline reminder handler (optional)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, SQLAlchemy (async), JWT + bcrypt |
| Frontend | React, Tailwind CSS, Shadcn/UI (Radix) |
| Database | PostgreSQL 15 |
| Document Storage | Local disk (dev) / Amazon S3 (production) |
| Cloud (AWS) | EC2, RDS, S3, IAM, Lambda, EventBridge |

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- Or: Python 3.11+, Node.js 18+, PostgreSQL 15+

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/Laxmiharika522/LexCase.git
cd LexCase
docker compose up --build -d
docker compose exec backend python seed.py
```

**Access the app:**
- Frontend: http://localhost:3000
- API docs: http://localhost:8001/docs
- PostgreSQL (host): `localhost:5433` (mapped to avoid port conflicts)

Containers hot-reload on source changes.

> **Note:** If port `5432` is already in use on your machine, PostgreSQL is exposed on **5433**. The backend connects internally via Docker networking — no config change needed.

### Test Accounts (Seed Data)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@lexcase.com` | `Admin@123` |
| Lawyer | `rahul@lexcase.com` | `Lawyer@123` |
| Client | `contact@rameshtraders.com` | `Client@123` |

See `credentials.txt` (if included) or run `seed.py` for the full list of demo accounts.

---

### Option 2: Manual Local Setup

#### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate

pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

cp .env.example .env
# Set DATABASE_URL to your PostgreSQL instance

python seed.py
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### Frontend

```bash
cd frontend
yarn install
cp .env.example .env
# REACT_APP_BACKEND_URL=http://localhost:8001

yarn start
```

---

## Environment Variables

### Backend (`backend/.env.example`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `STORAGE_BACKEND` | `local` (dev) or `s3` (AWS) |
| `S3_BUCKET_NAME` | S3 bucket name (production) |
| `AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `JWT_SECRET` | 64-char random hex secret |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### Frontend (`frontend/.env.example`)

| Variable | Description |
|----------|-------------|
| `REACT_APP_BACKEND_URL` | Backend API URL |

---

## AWS Deployment (P31 Coursework)

Full step-by-step guide: **[deploy/AWS-SETUP.md](deploy/AWS-SETUP.md)**

Architecture (AWS Academy sandbox, ~$50 credit):

| Component | Service |
|-----------|---------|
| Backend | EC2 (t3.micro) + Docker |
| Frontend | S3 + CloudFront (HTTPS, no domain needed) |
| Database | RDS PostgreSQL |
| Documents | S3 (private bucket) |
| Auth | IAM (infra) + JWT (admin / lawyer / client) |

```
Browser → CloudFront (/ → S3 React, /api/* → EC2 Docker API) → RDS + S3
```

**Deploy files:**
- `deploy/AWS-SETUP.md` — Console setup guide
- `deploy/docker-compose.ec2.yml` — Backend-only Docker Compose for EC2
- `deploy/env.production.example` — Production `.env` template
- `backend/lambda/reminder_handler.py` — Optional deadline reminder Lambda

**Teardown all AWS resources after your demo** to protect your sandbox credits.

---

## Project Structure

```
LexCase/
├── backend/
│   ├── server.py          # FastAPI application
│   ├── models.py          # PostgreSQL ORM models
│   ├── db_adapter.py      # Database access layer
│   ├── storage.py         # Local / S3 document storage
│   ├── audit.py           # Case history audit logging
│   ├── seed.py            # Demo data seeder
│   └── lambda/            # AWS Lambda handlers
├── frontend/              # React SPA
├── deploy/                # AWS deployment configs
└── docker-compose.yml     # Local dev (PostgreSQL + backend + frontend)
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is developed as part of an academic coursework (P31 — Cloud-Based Legal Case Management).