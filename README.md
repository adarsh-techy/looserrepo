# Looser Vault: Dual-User High-Security Business & Emergency Enclave

A modern, highly secure web application designed specifically for **two business partners/associates** to manage joint business knowledge, future roadmaps, encrypted passwords, targeted partner notes, and secret emergency directives with emergency access protocols and real-time siren security alerts.

---

## Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Redux Toolkit, React Router v6, Tailwind CSS, Lucide Icons, Web Audio API, Socket.io Client |
| **Backend** | Node.js, Express, TypeScript, Socket.io, Prisma ORM, JSON Web Tokens (JWT), Speakeasy (TOTP 2FA), Helmet, CORS, Rate-Limiting |
| **Database** | PostgreSQL (Primary) / SQLite (Zero-Config Development Fallback) via Prisma ORM |
| **Encryption** | AES-256-GCM (Authenticated Envelope Encryption with unique 96-bit IVs and 128-bit Auth Tags), Argon2id & PBKDF2 Key Derivation |
| **Testing** | Jest, Supertest, TypeScript, In-memory crypto verification suite |

---

## System Capabilities

### 1. Sidebar Navigation
- **Business**: Strategic knowledge base, contracts, cap tables, categories, tags, search, links, and attachments.
- **Future Plans**: Roadmap goals, milestones checklist with instant toggle, priority flags (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), target quarters (e.g. `Q4 2026`).
- **Passwords**: Zero-knowledge credential vault. Passwords masked (`••••••••••••••`) by default. Requires **session re-authentication** to reveal with a 30-second countdown timer, clipboard copy with automatic clearing warning, and strong password generator.
- **Secret Notes**:
  - Section 1: **Private and Emergency Notes** (for situations where owner is unreachable > 48h).
  - Section 2: **Instructions to Follow After My Death** (executive succession directives, trust payouts).
- **Audit Log**: Immutable tamper-evident security ledger capturing logins, reveals, emergency requests, siren triggers, and IP addresses with zero plaintext leakage.
- **Users**: Partner reachability telemetry, last check-in timer, TOTP 2FA QR code setup, and siren preferences.
- **Notifications**: Security alert broadcasts, emergency request status, and unread badges.
- **Reminders and Notes**: Targeted messages specifically left for the other user with prompt-on-login modal and live read receipts.

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

### Post-Death Instruction Safeguards
- Inactivity alone is **never** treated as proof of death.
- Post-death directives require trustee verification code / official document identifier submission before becoming eligible for decryption.

---

## Real-Time Security Siren & Alerts
- Whenever an emergency access attempt, failed password guess, or secret note unlock is initiated:
  1. An immutable audit record is logged.
  2. A WebSocket event is broadcasted directly to all active owner sessions.
  3. A full-screen pulsing red warning modal is displayed.
  4. A dual-tone emergency siren sound is synthesized via the Web Audio API with volume and mute controls.

---

## Quick Start Guide

### 1. Prerequisites
- Node.js >= 18.x
- npm >= 9.x
- (Optional) Docker for PostgreSQL

### 2. Installation
```bash
# Clone repository
cd Looser

# Install backend dependencies
cd backend && npm install

# Initialize database & run seed
npx prisma generate
npx prisma db push
npm run prisma:seed

# Install frontend dependencies
cd ../frontend && npm install
```

### 3. Run Locally
In two separate terminal tabs:

**Terminal 1 (Backend on port 5001):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend on port 3000):**
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Pre-configured Partner Accounts

| User | Email | Password | Role |
|---|---|---|---|
| **Adarsh** (User 1) | `user1@looser.vault` | `VaultPass123!` | Founder Partner (AD) |
| **Bob Vance** (User 2) | `user2@looser.vault` | `VaultPass123!` | Managing Partner (NS) |

*Note: The vault starts completely empty with zero mock data. All business items, roadmap plans, credentials, and secret notes are created and managed manually.*

---

## Running Tests

To run the backend security, encryption, and permission tests:
```bash
cd backend
npm test
```

---

## Production PostgreSQL Deployment

To deploy with PostgreSQL 16:
1. Start PostgreSQL using docker-compose:
```bash
docker-compose up -d
```
2. Update `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgrespassword2026!@localhost:5432/looser_vault?schema=public"
```
3. Run Prisma migration:
```bash
cd backend
npx prisma db push
npm run prisma:seed
```

---

## Security Limitations & Considerations

1. **Browser Audio Autoplay Policies**: Modern browsers require at least one user interaction before playing audio. The system provides accessible visual strobing warnings alongside audio siren controls.
2. **Offline Emergency Verification**: If the owner is entirely offline for over 48 hours, the system adheres to the configured waiting period. Integrating external webhook or SMS gateway (e.g. Twilio / SendGrid) provides additional out-of-band notification channels.
3. **Dedicated Note Passwords**: Secret notes use client-and-server authenticated Argon2/PBKDF2 key derivation. If both users forget a note's dedicated password, the note content is mathematically unrecoverable.
