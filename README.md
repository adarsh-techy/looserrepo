# Looser Vault: Dual-User High-Security Business & Emergency Enclave

A modern, highly secure web application designed specifically for **two business partners/associates** to manage joint business knowledge, future roadmaps, encrypted passwords, targeted partner notes, government documents & cards, family health vaults, and secret emergency directives with a 3-step emergency access protocol and real-time siren security alerts.

---

## Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Redux Toolkit, React Router v6, Tailwind CSS, Lucide Icons, Web Audio API, Socket.io Client |
| **Backend** | Node.js, Express, TypeScript, Socket.io, Prisma ORM, JSON Web Tokens (JWT), Speakeasy (TOTP 2FA), Helmet, CORS, Rate-Limiting |
| **Database** | PostgreSQL via Prisma ORM (supports local Docker, Railway, Render, Supabase, Neon, AWS RDS) |
| **Encryption** | AES-256-GCM (Envelope Encryption with 96-bit IVs and 128-bit Auth Tags), Argon2id & PBKDF2 Key Derivation |
| **Testing** | Jest, Supertest, TypeScript in-memory test suite |

---

## System Capabilities

### 1. Security & Core Vaults
- **Passwords**: Zero-knowledge credential vault. Sensitive values masked (`••••••••••••••`) with **session re-authentication**, 30-second reveal timer, and clipboard auto-wipe.
- **Documents & Cards Vault (`/documents`)**:
  - **1. Bank Accounts**: Authentic bank themes (HDFC, SBI, ICICI, Axis, Kotak) with embossed monospace account numbers, IFSC codes, UPI IDs, and passbook lightbox viewer.
  - **2. ATM & Payment Cards**: Metallic Platinum/Indigo cards with EMV chip graphics, 16-digit blocks, CVV reveal, and PIN hints.
  - **3. Identity Documents**: Exact physical card replicas for **Aadhaar Card**, **PAN Card**, **Driving License**, **Passport bio-page**, **Voter ID (EPIC)**, and custom smart cards.
  - **4. Health Insurance**: Policies, sum insured, cashless TPA helplines, and policy documents.
- **Adarsh Family Health Vault (`/health`)**:
  - Drill-down hierarchy: Family Member ➔ Organ System ➔ Department ➔ Medical Sections (Diagnostic Reports vs Doctor Consults).
  - Multi-file attachment viewer with zoom, rotation, and 1-click download.
- **Secret Notes & Emergency Directives**:
  - Section 1: **Private and Emergency Notes** (accessible if owner is unreachable > 48h).
  - Section 2: **Instructions to Follow After My Death** (executive succession directives, trust payouts).
- **Audit Log & Recycle Bin**: Tamper-evident ledger logging all reveals, edits, siren events, and soft deletions with 1-click restoration.

---

## 3-Step Emergency Access Protocol

```mermaid
sequenceDiagram
    autonumber
    actor Recipient as Partner (Requester)
    participant Server as Vault Security Engine
    participant Owner as Note Owner (Active Sessions)
    
    Recipient->>Server: Step 1: Re-authenticate + TOTP 2FA Check
    Server-->>Recipient: Step 1 Validated
    
    Recipient->>Server: Step 2: Enter Note's Separate Password
    Server-->>Recipient: Step 2 Validated
    
    Recipient->>Server: Step 3: Emergency Justification + Legal Acknowledgment
    alt Owner Active (Inactivity < 48h)
        Server->>Server: Start Waiting Period Timer
        Server-->>Owner: 🚨 Broadcast Live Red Siren & Audio Alert
        Server-->>Recipient: Access Pending (Waiting Period Active)
        Note over Owner: Owner can check in or click "Deny / Cancel Request"
    else Owner Unreachable (> 48h) or Verified Post-Death
        Server-->>Recipient: Release Decrypted Note Content
        Server-->>Owner: 🚨 Broadcast Emergency Release Siren
    end
```

---

## Quick Start (Development Mode)

### 1. Prerequisites
- Node.js >= 18.x
- npm >= 9.x
- PostgreSQL (local instance or Docker)

### 2. Fast Setup (1 Command)
```bash
# 1. Install all dependencies across root, backend, and frontend:
npm run install:all

# 2. Configure environment files:
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. (Optional) Start local PostgreSQL with Docker:
docker-compose up -d

# 4. Generate Prisma client & sync schema:
npm run prisma:generate
npm run prisma:push

# 5. (Optional) Seed default users:
npm run prisma:seed

# 6. Start both backend (port 5001) and frontend (port 3000) concurrently:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Deployment & Hosting Guide

### Option A: Cloud PaaS (Frontend on Vercel/Netlify + Backend on Render/Railway)

#### 1. Database Setup:
- Create a PostgreSQL database on **Neon** (neon.tech), **Supabase** (supabase.com), **Railway** (railway.app), or **Render** (render.com).
- Copy the connection string with SSL enabled:
  ```env
  DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
  ```

#### 2. Backend Deployment (Render / Railway):
- **Root Directory**: `backend`
- **Build Command**: `npm run build` *(runs `prisma generate && tsc`)*
- **Start Command**: `npm start` *(runs `node dist/server.js`)*
- **Environment Variables**:
  - `PORT`: 5001 (or platform-assigned)
  - `NODE_ENV`: `production`
  - `DATABASE_URL`: Your cloud PostgreSQL URL
  - `JWT_SECRET`: Generate via `openssl rand -base64 32`
  - `REAUTH_SECRET`: Generate via `openssl rand -base64 32`
  - `VAULT_MASTER_KEY`: 64-char hex key via `openssl rand -hex 32`
  - `CORS_ORIGIN`: Your production frontend domain, e.g. `https://vault.yourdomain.com`

#### 3. Frontend Deployment (Vercel / Netlify / Cloudflare Pages):
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: `https://api.yourdomain.com/api` (URL to your deployed backend API)
  - `VITE_SOCKET_URL`: `https://api.yourdomain.com` (URL to your deployed backend for WebSockets)

---

### Option B: Single VPS (Ubuntu / Docker / Nginx)

1. Build production bundles:
   ```bash
   npm run build
   ```
2. Run backend under PM2:
   ```bash
   cd backend
   pm2 start dist/server.js --name "looser-vault-api"
   ```
3. Serve frontend `frontend/dist` via Nginx with reverse proxy for `/api` and `/socket.io` to `http://127.0.0.1:5001`.

---

## Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description | Example |
|---|---|---|
| `PORT` | Port server listens on | `5001` |
| `NODE_ENV` | Mode (`development` or `production`) | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Secret for signing auth tokens | `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `REAUTH_SECRET` | Secret for sensitive operation reveals | `openssl rand -base64 32` |
| `VAULT_MASTER_KEY` | 64-char hex key for AES-256-GCM | `openssl rand -hex 32` |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `https://vault.yourdomain.com` |

### Frontend (`frontend/.env`)
| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Base URL for API requests | `/api` (local) or `https://api.domain.com/api` |
| `VITE_SOCKET_URL` | Real-time WebSocket server URL | `/` (local) or `https://api.domain.com` |
| `VITE_APP_NAME` | Display title | `Looser Secure Vault` |

---

## Pre-configured Partner Accounts (Seed)

| User | Email | Password | Role |
|---|---|---|---|
| **Adarsh** (User 1) | `user1@looser.vault` | `VaultPass123!` | Founder Partner (AD) |
| **Bob Vance** (User 2) | `user2@looser.vault` | `VaultPass123!` | Managing Partner (NS) |

---

## Running Automated Tests

```bash
# Run backend crypto, auth, and emergency access test suite:
npm test
```
