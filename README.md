<div align="center">
  <img src="https://via.placeholder.com/150/0f172a/ffffff?text=LexCase" alt="LexCase Logo" width="100"/>
  <h1>LexCase</h1>
  <p><strong>A Modern, Secure Legal Case Management Platform</strong></p>
  <p>
    Built for law firms to manage cases, interact securely with clients, and streamline day-to-day operations.
  </p>
</div>

<br/>

## 🌟 Key Features

LexCase is built around a secure, role-based architecture providing specialized portals for every stakeholder in the legal process:

### 🛡️ Admin Portal
The command center for law firm partners and administrators.
- **Firm Oversight:** Track active cases, financial metrics, and team performance via a comprehensive dashboard.
- **User Management:** Create and manage accounts for lawyers and paralegals.
- **Case Assignment:** Open new cases and assign them to specific attorneys.

### ⚖️ Lawyer Portal
A focused workspace designed for attorney productivity.
- **Case & Task Management:** Track deadlines, manage case files, and update case statuses.

- **Client Communication:** Secure, encrypted direct messaging with assigned clients.
- **Billing:** Generate and track invoices.

### 🤝 Client Portal
A secure, transparent environment for clients to stay updated on their legal matters.
- **Case Tracking:** View the real-time status of assigned cases.
- **Secure Messaging:** Communicate directly and securely with their assigned lawyer.
- **Document Vault:** Safely upload evidence, contracts, and documents directly to their case file.
- **Invoices & Appointments:** Keep track of upcoming hearings, strategy meetings, and pending invoices.

---

## 🛠️ Tech Stack

- **Backend:** FastAPI (Python), Motor (Async MongoDB), JWT Authentication
- **Frontend:** React, Tailwind CSS, Shadcn/UI (Radix UI), Vite
- **Database:** MongoDB


---

## 🚀 Getting Started

Follow the instructions below to get LexCase running on your local machine.

### Option 1: Running with Docker (Recommended)

Docker is the fastest way to get LexCase running, as it spins up the frontend, backend, and MongoDB simultaneously.

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd lexcase
   ```

2. **Start the containers**
   ```bash
   docker compose up --build -d
   ```
   *(Note: The containers will hot-reload automatically when you make changes to the source code).*

3. **Seed the Database with Professional Dummy Data**
   To easily test the platform, you can populate the database with a rich set of dummy data (including sample lawyers, clients, cases, documents, tasks, and messages).
   ```bash
   docker compose exec backend python seed.py
   ```

4. **Access the Application**
   - **Frontend UI:** [http://localhost:3000](http://localhost:3000)
   - **Backend API Docs:** [http://localhost:8001/docs](http://localhost:8001/docs)

5. **Test Accounts (from Seed Data)**
   - **Admin:** `admin@lexcase.com` | Password: `Admin@123`
   - **Lawyer:** `rahul@lexcase.com` | Password: `Lawyer@123`
   - **Client:** `contact@rameshtraders.com` | Password: `Client@123`

---

### Option 2: Manual Local Setup (Without Docker)

If you prefer to run the services directly on your host machine, follow these steps.

**Prerequisites:** Python 3.10+, Node.js 18+, MongoDB (running locally or via Atlas).

#### 1. Setup the Backend
```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate      # On Windows use: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Configure Environment Variables
cp .env.example .env
# Open .env and set MONGO_URL to your local/Atlas MongoDB connection string

# Run the database seeder
python seed.py

# Start the FastAPI server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### 2. Setup the Frontend (Open a new terminal tab)
```bash
cd frontend

# Install dependencies
yarn install

# Configure Environment Variables
cp .env.example .env
# Ensure REACT_APP_BACKEND_URL=http://localhost:8001 is set inside .env

# Start the React development server
yarn start
```
*The frontend will be available at [http://localhost:3000](http://localhost:3000).*

---

## ☁️ Deployment

### AWS App Runner (Backend)
1. Push the repository to GitHub.
2. In the AWS App Runner console, create a new service from your GitHub repo.
3. Select **Use a configuration file** (`apprunner.yaml`).
4. Set your environment variables in the console (`MONGO_URL`, `JWT_SECRET`, `FRONTEND_URL`, etc).

### Vercel / AWS S3 + CloudFront (Frontend)
1. Simply import the `frontend` folder into Vercel, or build using `yarn build` and upload the `dist`/`build` folder to an S3 bucket.
2. Ensure you set the `REACT_APP_BACKEND_URL` environment variable to point to your deployed App Runner URL.

---

## 🤝 Contributing
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.


