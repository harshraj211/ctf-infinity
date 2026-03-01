# CTF INFINITY 🚩

A vulnerable-by-design CTF platform for educational security training.

## Quick Start

```bash
cd ctf-platform
npm install
npm run dev
```

Visit: http://localhost:3000

## Demo Accounts

| Username | Password  | Notes                     |
|----------|-----------|---------------------------|
| alice    | alice123  | Has IDOR flag in profile  |
| bob      | bob123    | Standard player           |

## Admin Portal

URL: `http://localhost:3000/creator`  
Password: `Adm1n@CTF!` (set via `ADMIN_PASSWORD` in `.env`)

## Intentional Vulnerabilities

| Vuln | Route | How to find |
|------|-------|-------------|
| **SQLi** | `GET /vuln/search?q=` | Try `' OR 1=1--` |
| **Stored XSS** | `POST /vuln/xss` | Post `<script>alert(1)</script>` |
| **Reflected XSS** | `GET /vuln/xss?msg=` | Add XSS payload to `msg` param |
| **IDOR** | `GET /vuln/user/:id` | Change ID in URL to see other users |
| **Path Traversal** | `GET /vuln/file?name=` | Try `../app.js` or `../../etc/passwd` |
| **SSRF** | `GET /vuln/fetch?url=` | Try `http://169.254.169.254/latest/meta-data/` |

## Firebase Setup (Optional)

1. Create a Firebase project
2. Enable Firestore and Storage
3. Download service account JSON
4. Set `FIREBASE_SERVICE_ACCOUNT` in `.env` as a single-line JSON string
5. Set `FIREBASE_STORAGE_BUCKET` to your bucket name
6. Set Storage rules to allow public reads, authenticated admin writes

## ⚠️ Warning

**Never deploy this on public infrastructure.** The vulnerable routes are intentionally insecure.
