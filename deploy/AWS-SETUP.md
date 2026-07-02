# LexCase AWS Academy Setup Guide

You provision all AWS resources in the Console. This project is already configured for:
- **RDS PostgreSQL** (database)
- **S3** (document storage)
- **EC2** (app hosting via Nginx + FastAPI + React)
- **IAM** (EC2 instance role for S3 access)
- **Lambda + EventBridge** (optional deadline reminders)

Estimated demo cost: **~$3–6 for 3 days** (stays within $20 Academy credit).

---

## Step 1 — S3 Bucket (Documents)

1. AWS Console → **S3** → **Create bucket**
2. Name: `lexcase-docs-yourinitials` (must be globally unique)
3. Region: same as your EC2/RDS (e.g. `us-east-1`)
4. **Block all public access**: ON
5. **Bucket versioning**: optional
6. **Default encryption**: SSE-S3
7. Create bucket

---

## Step 2 — RDS PostgreSQL

1. AWS Console → **RDS** → **Create database**
2. Engine: **PostgreSQL 15**
3. Template: **Free tier** or Dev/Test
4. DB instance: **db.t3.micro**, Single-AZ
5. Storage: 20 GB gp2
6. DB identifier: `lexcase-db`
7. Master username: `lexcase`
8. Master password: *(choose a strong password — save it)*
9. Database name: `lexcase`
10. **Public access**: No
11. VPC security group: create new → `lexcase-rds-sg`
12. Create database (takes ~5–10 min)
13. Copy the **Endpoint** from RDS Console (e.g. `lexcase-db.xxxx.us-east-1.rds.amazonaws.com`)

---

## Step 3 — IAM Role for EC2

1. AWS Console → **IAM** → **Roles** → **Create role**
2. Trusted entity: **AWS service** → **EC2**
3. Create inline policy (JSON):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME",
        "arn:aws:s3:::YOUR-BUCKET-NAME/*"
      ]
    }
  ]
}
```

4. Role name: `lexcase-ec2-role`

---

## Step 4 — Security Groups

### RDS security group (`lexcase-rds-sg`)
- Inbound: PostgreSQL (5432) from `lexcase-ec2-sg` only

### EC2 security group (`lexcase-ec2-sg`)
- Inbound SSH (22) from **My IP**
- Inbound HTTP (80) from **0.0.0.0/0** (for demo access)
- Outbound: All traffic (default)

---

## Step 5 — Launch EC2

1. **EC2** → **Launch instance**
2. Name: `lexcase-app`
3. AMI: **Amazon Linux 2023**
4. Instance type: **t3.micro**
5. Key pair: create or use existing (.pem file for SSH)
6. Network: default VPC, public subnet
7. Security group: `lexcase-ec2-sg`
8. IAM instance profile: `lexcase-ec2-role`
9. Storage: 20 GB
10. Launch instance
11. Copy **Public IPv4 address**

---

## Step 6 — Deploy Application on EC2

SSH into the instance:

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

Install dependencies:

```bash
sudo dnf update -y
sudo dnf install -y python3.11 python3.11-pip nodejs nginx git
sudo npm install -g yarn
```

Upload or clone the project to `/opt/lexcase`:

```bash
sudo mkdir -p /opt/lexcase
sudo chown ec2-user:ec2-user /opt/lexcase
# Copy project files here (scp, git clone, or zip upload)
```

Configure backend `.env` (use `deploy/env.production.example` as template):

```bash
cd /opt/lexcase/backend
cp ../deploy/env.production.example .env
nano .env   # fill in RDS endpoint, S3 bucket, EC2 IP, JWT secret
```

Install Python deps and seed:

```bash
python3.11 -m pip install -r requirements.txt
python3.11 seed.py
```

Build frontend:

```bash
cd /opt/lexcase/frontend
echo "REACT_APP_BACKEND_URL=http://YOUR_EC2_PUBLIC_IP" > .env
yarn install
yarn build
```

Configure Nginx:

```bash
sudo cp /opt/lexcase/deploy/nginx.conf /etc/nginx/conf.d/lexcase.conf
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl start nginx
```

Start backend (use systemd or screen):

```bash
cd /opt/lexcase/backend
nohup python3.11 -m uvicorn server:app --host 0.0.0.0 --port 8001 &
```

Open `http://YOUR_EC2_PUBLIC_IP` in browser. Login: `admin@lexcase.com` / `Admin@123`

---

## Step 7 — Lambda Reminders (Optional)

1. **Lambda** → Create function → Python 3.11
2. Upload `backend/lambda/reminder_handler.py` as deployment package
3. Environment variable: `DATABASE_URL=postgresql://lexcase:PASSWORD@RDS_ENDPOINT:5432/lexcase`
4. VPC: same as RDS (if RDS is private)
5. **EventBridge** → Rules → `rate(1 day)` → target Lambda

---

## Step 8 — Teardown (Protect Your $20 Credit!)

After demo/submission, delete in this order:

1. Terminate EC2 instance
2. Delete RDS instance (skip final snapshot)
3. Empty S3 bucket → delete bucket
4. Delete Lambda function and EventBridge rule
5. Release Elastic IP (if used)
6. Delete security groups and IAM role

---

## P31 Requirements Checklist

| Requirement | AWS Service | Configured In |
|-------------|-------------|---------------|
| Secure document storage | S3 | `STORAGE_BACKEND=s3` in `.env` |
| Host application | EC2 | Nginx + Uvicorn on t3.micro |
| Manage case data | RDS PostgreSQL | `DATABASE_URL` in `.env` |
| Role-based access | IAM + app JWT | EC2 instance role + admin/lawyer/client roles |
| Workflow automation | EventBridge + Lambda | `lambda/reminder_handler.py` |
| Case history | PostgreSQL `audit_logs` | `/api/cases/{id}/history` |
| Legal research | CourtListener API | `/api/research/search` |
| Client portal | React frontend | Served via Nginx on EC2 |