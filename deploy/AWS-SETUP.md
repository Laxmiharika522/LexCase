# LexCase AWS Academy Setup Guide

Provision all resources in the **AWS Console**. This guide follows a rubric-compliant, production-style layout optimized for the Academy sandbox (~$50 credit).

## Architecture

| Component | AWS Service | Why |
|-----------|-------------|-----|
| **Backend** | EC2 (t3.micro) + Docker | Matches P31 EC2 requirement; clean, reproducible deploy |
| **Frontend** | S3 + CloudFront | Separates UI from API; HTTPS on `*.cloudfront.net` (no domain purchase) |
| **Database** | RDS PostgreSQL | Matches P31 RDS requirement |
| **Documents** | S3 (private bucket) | Matches P31 S3 requirement; SSE encryption |
| **Auth & roles** | IAM (infra) + app JWT (admin / lawyer / client) | Matches P31 IAM + firm role-based access |

```
                    ┌─────────────────────────────────────┐
  Browser ────────► │  CloudFront (HTTPS)                 │
                    │    /        → S3 (React build)      │
                    │    /api/*   → EC2:8001 (Docker API) │
                    └─────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              EC2 t3.micro         RDS PostgreSQL      S3 (documents)
              Docker backend        (private subnet)    (IAM role access)
```

**Estimated demo cost:** ~$8–15 for several days (well within $50 sandbox credit).

---

## Prerequisites

- AWS Academy Learner Lab access
- Git clone: `https://github.com/Laxmiharika522/LexCase`
- EC2 key pair (.pem) for SSH
- Docker Desktop knowledge (local test optional)

---

## Step 1 — S3 Buckets (two buckets)

### 1a. Documents bucket (private)

1. **S3** → **Create bucket**
2. Name: `lexcase-docs-yourinitials` (globally unique)
3. Region: e.g. `us-east-1` (use the same region for all resources)
4. **Block all public access:** ON
5. **Default encryption:** SSE-S3 (or SSE-KMS for stronger compliance story)
6. Create bucket

### 1b. Frontend bucket (private — CloudFront will access it)

1. **Create bucket**
2. Name: `lexcase-frontend-yourinitials`
3. **Block all public access:** ON
4. Create bucket (no public policy needed — CloudFront OAC handles access)

---

## Step 2 — RDS PostgreSQL

1. **RDS** → **Create database**
2. Engine: **PostgreSQL 15**
3. Template: **Free tier** or Dev/Test
4. Instance: **db.t3.micro**, Single-AZ
5. Storage: 20 GB gp2, encryption enabled
6. DB identifier: `lexcase-db`
7. Master username: `lexcase`
8. Master password: *(save this)*
9. Database name: `lexcase`
10. **Public access:** No
11. VPC security group: create `lexcase-rds-sg`
12. Create database (~5–10 min)
13. Copy the **Endpoint** (e.g. `lexcase-db.xxxx.us-east-1.rds.amazonaws.com`)

---

## Step 3 — IAM Role for EC2

1. **IAM** → **Roles** → **Create role**
2. Trusted entity: **EC2**
3. Attach inline policy (replace bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::lexcase-docs-yourinitials",
        "arn:aws:s3:::lexcase-docs-yourinitials/*"
      ]
    }
  ]
}
```

4. Role name: `lexcase-ec2-role`

> EC2 uses this role for document storage. **User login roles** (admin / lawyer / client) are handled by the app's JWT system.

---

## Step 4 — Security Groups

### `lexcase-rds-sg` (RDS)
| Type | Port | Source |
|------|------|--------|
| PostgreSQL | 5432 | `lexcase-ec2-sg` |

### `lexcase-ec2-sg` (EC2)
| Type | Port | Source |
|------|------|--------|
| SSH | 22 | My IP |
| Custom TCP | 8001 | `0.0.0.0/0` (CloudFront → EC2 origin) |

---

## Step 5 — Launch EC2 (backend)

1. **EC2** → **Launch instance**
2. Name: `lexcase-backend`
3. AMI: **Amazon Linux 2023**
4. Instance type: **t3.micro**
5. Key pair: your `.pem`
6. Security group: `lexcase-ec2-sg`
7. IAM instance profile: `lexcase-ec2-role`
8. Storage: 20 GB
9. Launch → copy **Public IPv4**
10. *(Recommended)* **Elastic IPs** → Allocate → Associate to this instance (stable IP for CloudFront origin)

---

## Step 6 — Deploy backend on EC2 (Docker)

SSH in:

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

Install Docker:

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
# Log out and back in so docker group applies
exit
```

SSH back in, clone the repo:

```bash
git clone https://github.com/Laxmiharika522/LexCase.git
cd LexCase
```

Configure environment (edit with your real values):

```bash
cp deploy/env.production.example backend/.env
nano backend/.env
```

Required values in `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://lexcase:PASSWORD@RDS_ENDPOINT:5432/lexcase
STORAGE_BACKEND=s3
S3_BUCKET_NAME=lexcase-docs-yourinitials
AWS_REGION=us-east-1
JWT_SECRET=<64-char-random-hex>
ENVIRONMENT=production
# Set CORS_ORIGINS + FRONTEND_URL after CloudFront is created (Step 8)
```

Build and start the backend container:

```bash
docker compose -f deploy/docker-compose.ec2.yml up -d --build
```

Seed the database:

```bash
docker compose -f deploy/docker-compose.ec2.yml exec backend python seed.py
```

Verify API:

```bash
curl http://localhost:8001/api/
# Expected: {"app":"LexCase","status":"ok","storage":"s3"}
```

---

## Step 7 — Build and upload frontend to S3

On your **local machine** (or EC2 if Node is installed):

```bash
cd frontend
yarn install
```

Create `frontend/.env.production` — use your EC2 IP for now; update to CloudFront URL in Step 8:

```env
REACT_APP_BACKEND_URL=http://YOUR_EC2_PUBLIC_IP:8001
```

Build:

```bash
yarn build
```

Upload `build/` contents to the frontend S3 bucket:

1. **S3** → `lexcase-frontend-yourinitials` → **Upload**
2. Upload **all files inside** `frontend/build/` (including `index.html` and `static/`)
3. Ensure `index.html` is at the bucket root

---

## Step 8 — CloudFront distribution

1. **CloudFront** → **Create distribution**

### Origin 1 — Frontend (S3)
- Origin domain: `lexcase-frontend-yourinitials.s3.us-east-1.amazonaws.com`
- Origin access: **Origin access control (OAC)** → create new OAC
- After creating, copy the **bucket policy** CloudFront provides → paste into S3 bucket permissions

### Origin 2 — Backend (EC2)
- Origin domain: `YOUR_EC2_PUBLIC_IP` (or Elastic IP)
- Protocol: **HTTP only**, port **8001**
- Name: `lexcase-api`

### Default cache behavior
- Origin: **S3 frontend**
- Viewer protocol policy: **Redirect HTTP to HTTPS**
- Cache policy: **CachingOptimized**

### Additional behavior — API
- Path pattern: `/api/*`
- Origin: **EC2 backend**
- Viewer protocol policy: **Redirect HTTP to HTTPS**
- Cache policy: **CachingDisabled**
- Origin request policy: **AllViewer** (forwards cookies/headers — required for JWT auth)

### SPA routing (React)
- Create custom error response:
  - HTTP error code: **403**
  - Response page: `/index.html`
  - HTTP response code: **200**
- Repeat for **404** → `/index.html` → **200**

4. Create distribution → note the domain: `https://dxxxxxxxx.cloudfront.net`

### Update backend CORS + rebuild frontend

On EC2, update `backend/.env`:

```env
CORS_ORIGINS=https://dxxxxxxxx.cloudfront.net
FRONTEND_URL=https://dxxxxxxxx.cloudfront.net
```

Restart backend:

```bash
docker compose -f deploy/docker-compose.ec2.yml restart backend
```

Rebuild frontend locally with the CloudFront URL:

```env
REACT_APP_BACKEND_URL=https://dxxxxxxxx.cloudfront.net
```

```bash
yarn build
```

Re-upload `build/` to the frontend S3 bucket, then **CloudFront** → **Invalidations** → `/*`

### Access the app

Open `https://dxxxxxxxx.cloudfront.net` — login: `admin@lexcase.com` / `Admin@123`

---

## Step 9 — Lambda deadline reminders (optional)

1. **Lambda** → Create function → Python 3.11
2. Package `backend/lambda/reminder_handler.py` + `asyncpg`
3. Environment: `DATABASE_URL=postgresql://lexcase:PASSWORD@RDS_ENDPOINT:5432/lexcase`
4. VPC: attach to same VPC/subnets as RDS; security group allowing outbound to RDS 5432
5. **EventBridge** → Rule → `rate(1 day)` → target Lambda

---

## Step 10 — Teardown (protect sandbox credits)

Delete in this order:

1. CloudFront distribution (disable first, wait, then delete)
2. Empty + delete both S3 buckets
3. Terminate EC2 instance
4. Release Elastic IP
5. Delete RDS instance (skip final snapshot to avoid storage charges)
6. Delete Lambda + EventBridge rule
7. Delete security groups, IAM role

---

## P31 Rubric Mapping

| P31 requirement | How this architecture satisfies it |
|-----------------|-------------------------------------|
| **S3** — secure document storage | Private `lexcase-docs-*` bucket, SSE encryption, IAM role access |
| **EC2** — host application | t3.micro running FastAPI in Docker |
| **RDS** — manage case data | PostgreSQL with structured schema + audit logs |
| **IAM** — role-based access | EC2 instance role for S3; JWT roles for admin / lawyer / client |
| Centralize documents | All uploads → S3; metadata in RDS |
| Automate workflow | Tasks/deadlines + optional EventBridge/Lambda reminders |
| Case history | `audit_logs` table + `/api/cases/{id}/history` |
| Client portal | React SPA on CloudFront |
| Legal research | CourtListener API at `/api/research/search` |
| Data security | RDS encryption, private S3, HTTPS via CloudFront, security groups |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login fails / cookies not set | Ensure `CORS_ORIGINS` and `FRONTEND_URL` match CloudFront URL exactly; `ENVIRONMENT=production` |
| API 502 from CloudFront | Check EC2 security group allows port 8001; verify `curl http://EC2_IP:8001/api/` |
| CORS errors | Backend `.env` must include `https://` CloudFront domain; restart Docker container |
| React routes 404 | Add CloudFront custom error responses (403/404 → `index.html`) |
| RDS connection refused | Confirm RDS SG allows 5432 from EC2 SG; check `DATABASE_URL` |
| S3 upload fails | Verify IAM role is attached to EC2 and bucket name matches `.env` |

---

## Quick reference — files in this repo

| File | Purpose |
|------|---------|
| `deploy/docker-compose.ec2.yml` | Backend-only Docker Compose for EC2 |
| `deploy/env.production.example` | Production `.env` template |
| `deploy/AWS-SETUP.md` | This guide |
| `backend/lambda/reminder_handler.py` | Optional deadline reminder Lambda |