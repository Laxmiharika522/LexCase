# LexCase — Single EC2 Docker Deployment

Deploy the full stack on one EC2 instance:

```
Internet → EC2:80 (Nginx)
              ├── /        → React (static build)
              └── /api/*   → FastAPI :8001
                                    └── PostgreSQL (internal)
```

This matches the demo architecture: **React → FastAPI → PostgreSQL**, all in Docker.

---

## 1. Launch EC2

| Setting | Value |
|---------|-------|
| AMI | Amazon Linux 2023 |
| Instance type | t3.micro |
| Storage | 20 GB |
| Security group | SSH 22 (your IP), HTTP 80 (0.0.0.0/0) |

Allocate an **Elastic IP** and associate it — your public IP stays stable across reboots.

---

## 2. Install Docker on EC2

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP

sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
exit
```

SSH back in (docker group must be active).

---

## 3. Clone and configure

```bash
git clone https://github.com/Laxmiharika522/LexCase.git
cd LexCase

cp deploy/env.ec2-full.example .env
nano .env
```

Set these values in `.env`:

```env
EC2_PUBLIC_IP=YOUR_ELASTIC_IP
JWT_SECRET=<run: python3 -c "import secrets; print(secrets.token_hex(32))">
POSTGRES_PASSWORD=<strong-password>
```

---

## 4. Start the stack

```bash
docker compose --project-directory . -f deploy/docker-compose.ec2-full.yml up -d --build
```

First build takes ~5–10 minutes.

Seed the database:

```bash
docker compose --project-directory . -f deploy/docker-compose.ec2-full.yml exec backend python seed.py
```

Verify:

```bash
curl http://localhost/api/
curl http://localhost/health
```

---

## 5. Open the app

Browser: `http://YOUR_EC2_PUBLIC_IP`

Login: `admin@lexcase.com` / `Admin@123`

---

## How the BACKEND_URL bug is fixed

**Before:** `REACT_APP_BACKEND_URL` was missing → API calls went to `undefined/api/...` → 404.

**After:** Production build uses same-origin `/api`. Nginx proxies `/api/*` to the FastAPI container. No env var needed on EC2.

For local dev, if `.env` is missing, it defaults to `http://localhost:8001`.

---

## Auth flow (after fix)

```
Browser  →  POST /api/auth/login
         ←  { access_token, user }

localStorage.setItem("access_token", ...)
Authorization: Bearer <token>  on every request

Browser  →  GET /api/users  (with Bearer header)
         ←  200 + data
```

---

## Useful commands

```bash
# View logs
docker compose --project-directory . -f deploy/docker-compose.ec2-full.yml logs -f

# Restart after .env change
docker compose --project-directory . -f deploy/docker-compose.ec2-full.yml restart backend

# Stop everything
docker compose --project-directory . -f deploy/docker-compose.ec2-full.yml down

# Stop and wipe database (destructive)
docker compose --project-directory . -f deploy/docker-compose.ec2-full.yml down -v
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `undefined/api/...` in browser | Rebuild frontend: `docker compose ... up -d --build frontend` |
| 502 on `/api/*` | `docker compose ... logs backend` — check postgres is healthy |
| 401 on protected routes | Login first; check DevTools → Network → login response has `access_token` |
| Can't reach site | EC2 security group must allow inbound TCP 80 |
| RDS required for P31 | Use `deploy/AWS-SETUP.md` instead (RDS + S3 + CloudFront) |

---

## P31 note

This single-EC2 setup is ideal for **getting the app running**. For full P31 rubric (RDS, S3, CloudFront), follow **[AWS-SETUP.md](AWS-SETUP.md)** after this works.