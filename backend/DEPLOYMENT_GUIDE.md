# Deploying SmartSpend for Free — Complete Guide

This walks you through putting your own copy of SmartSpend online for
free, so anyone with the link can use it — no prior web/hosting
experience assumed. It has 5 parts, done in this order:

1. Get the code on your own GitHub account
2. Create a free database (Neon)
3. Deploy the backend (Render)
4. Deploy the frontend (Netlify)
5. Connect the two + test everything

Budget: **$0**. Total time: roughly 45–60 minutes the first time.

---

## Before you start — the pieces, in plain terms

This repo has two halves that get hosted **separately**:

```
your-repo/
├── backend/    → Spring Boot REST API (Java)
└── frontend/   → Static HTML/CSS/JS client
```

- **`frontend/`** (`index.html`, `app.js`, `style.css`, `chart.js`) — just
  files a browser reads directly. Any "static site" host works.
- **`backend/`** (the Spring Boot Java project) — a program that has to
  keep running on a server, plus a **database** to store users and
  transactions.

They talk to each other over the internet using the URL in
`frontend/app.js` (`API_BASE`). Once both are online, you point the
frontend at the backend's real address instead of `localhost`.

---

## Part 1 — Get the code on your own GitHub account

1. Create a free GitHub account if you don't have one:
   **https://github.com/join**
2. On this repository's GitHub page, click **"Fork"** (top right) to make
   your own copy under your account. Alternatively, click the green
   **"Code"** button → **"Download ZIP"** and upload the contents to a new
   repo of your own.
3. Your GitHub account now has its own copy of the project, with the same
   `backend/` and `frontend/` folder structure.

---

## Part 2 — Free database (Neon)

Render's own free database expires after 30 days. **Neon's free tier
doesn't expire**, so we'll use that instead.

1. Go to **https://neon.tech** → sign up (GitHub login is fastest, no
   credit card needed).
2. Create a new project. Name it `smartspend`. Pick any region close to
   your users.
3. On the project dashboard, find the **Connection string** — it looks
   like:
   ```
   postgresql://alex:AbC123xyz@ep-cool-name-12345.us-east-2.aws.neon.tech/smartspend?sslmode=require
   ```
4. You need to split this into 3 pieces for later — write them down:
   - **DATABASE_URL**: `jdbc:postgresql://ep-cool-name-12345.us-east-2.aws.neon.tech/smartspend?sslmode=require`
     (same as above, but starting with `jdbc:` and with the username/password removed)
   - **DATABASE_USERNAME**: `alex` (the part before the `:` after `postgresql://`)
   - **DATABASE_PASSWORD**: `AbC123xyz` (the part between `:` and `@`)

Keep this tab open — you'll paste these into Render next.

---

## Part 3 — Deploy the backend (Render)

1. Go to **https://render.com** → sign up with your GitHub account (no
   credit card required for the free tier).
2. Click **New → Web Service**.
3. Connect your forked repository.
4. Since the backend code lives in a subfolder, set **Root Directory** to:
   ```
   backend
   ```
   Render will then detect the `Dockerfile` inside that folder and set
   **Runtime: Docker**. Leave the Dockerfile path as `.` and build/start
   commands blank — the Dockerfile handles everything.
5. Choose the **Free** instance type.
6. Scroll to **Environment Variables** and add these (click "Add
   Environment Variable" for each):

   | Key | Value |
   |---|---|
   | `SPRING_PROFILES_ACTIVE` | `prod` |
   | `DATABASE_URL` | the `jdbc:postgresql://...` string from Part 2 |
   | `DATABASE_USERNAME` | from Part 2 |
   | `DATABASE_PASSWORD` | from Part 2 |
   | `JWT_SECRET` | any long random string — see below |
   | `CORS_ORIGINS` | leave blank for now, you'll fill this in Part 5 |

   For `JWT_SECRET`, it needs to be at least 32 bytes once decoded, so a
   short random string usually isn't long enough. The most reliable way
   to generate a proper one is with PowerShell (Windows) or a terminal
   (Mac/Linux):
   ```powershell
   $bytes = New-Object byte[] 32
   (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
   [Convert]::ToBase64String($bytes)
   ```
   Copy the output and use that as the value.

7. Click **Create Web Service**. Render will build and deploy — the first
   build takes 3–5 minutes. Watch the logs; when it says the app started
   and "Your service is live," you're done.
8. Your backend's URL is shown at the top of the page, something like:
   `https://smartspend-backend-xxxx.onrender.com`
   Write this down — you need it for the frontend.

**Free tier quirk to expect:** Render's free web services "sleep" after 15
minutes with no traffic, and take 20–30 seconds to wake up on the next
request. This is normal — not a bug. The first person to visit after a
quiet period just waits a bit longer.

---

## Part 4 — Deploy the frontend (Netlify)

1. **Before deploying**, open `frontend/app.js` in a text editor, find
   this line near the top:
   ```js
   const API_BASE = 'http://localhost:8080/api';
   ```
   and change it to your Render URL from Part 3, keeping `/api` on the end:
   ```js
   const API_BASE = 'https://smartspend-backend-xxxx.onrender.com/api';
   ```
   Save, commit, and push the change to your GitHub fork.
2. Go to **https://app.netlify.com** and sign up with your GitHub account.
3. Click **"Add new site" → "Import an existing project"**, then connect
   and select your forked repository.
4. In the build settings, set:
   - **Base directory**: `frontend`
   - **Build command**: leave empty
   - **Publish directory**: `frontend`
5. Deploy. Netlify gives you a live URL like
   `https://random-name-123.netlify.app`. That's your app's public
   address — share it with anyone.
6. By default, new Netlify sites can be private to your team. If visitors
   see an access-restricted page instead of the app, go to your site's
   **Project overview** and click **"Make public"**.

Because this is connected directly to your GitHub repo, any future push
to your `main` branch redeploys the frontend automatically.

---

## Part 5 — Connect them + test

Right now the backend will *reject* requests from your Netlify site,
because `CORS_ORIGINS` is still blank. Fix that:

1. Go back to Render → your backend service → **Environment**.
2. Set `CORS_ORIGINS` to your exact Netlify URL from Part 4, e.g.
   `https://random-name-123.netlify.app` (no trailing slash).
3. Save — Render automatically redeploys with the new setting (takes ~1
   minute).

Now test it:

1. Open your Netlify URL in a browser.
2. Try registering an account. If it works, add an expense, set a budget,
   check the Analytics page.
3. If something fails, open your browser's DevTools (press `F12`) → the
   **Console** tab will show the actual error, and the **Network** tab
   will show which request failed and why (click it → check the
   "Response" for the error message the backend sends back).

### Testing the API directly (optional, but useful for debugging)

If you want to test the backend on its own, without going through the
frontend, use **Postman** (free): **https://www.postman.com/downloads/**

- Create a new request: `POST https://smartspend-backend-xxxx.onrender.com/api/auth/register`
- Body → raw → JSON:
  ```json
  { "username": "testuser", "email": "test@example.com", "password": "test1234" }
  ```
- Send. You should get back a `token`, `username`, `email`.
- To test an authenticated endpoint (e.g. `GET /api/transactions`), add a
  header: `Authorization: Bearer <the token you got back>`.

This is the fastest way to tell "is my backend broken" apart from "is my
frontend broken" when something doesn't work. It's entirely optional —
skip it if the app already works end-to-end through the actual website.

---

## Quick reference — all the links

| What | Link | Free tier |
|---|---|---|
| GitHub (code hosting) | https://github.com/join | Unlimited public repos |
| Neon (database) | https://neon.tech | Permanent, 0.5 GB, no card |
| Render (backend hosting) | https://render.com | Permanent, sleeps when idle |
| Netlify (frontend hosting) | https://app.netlify.com | Permanent, generous |
| Postman (API testing) | https://www.postman.com/downloads/ | Free |

---

## Troubleshooting checklist

- **"Could not reach the server"** in the app → your Render service is
  probably asleep (wait 20–30s and retry) or `API_BASE` in `app.js` has a
  typo/wrong URL.
- **Login/register works but nothing else does** → check the browser
  console for a `401` — usually means `JWT_SECRET` isn't set correctly on
  Render.
- **"blocked by CORS policy"** in the console → `CORS_ORIGINS` on Render
  doesn't exactly match your Netlify URL (check for `http` vs `https`, or
  a trailing slash).
- **Backend won't start at all / crashes right after starting** → open
  the Render logs and read the error near the bottom. A common cause is
  `JWT_SECRET` being too short — it needs to decode to at least 32 bytes.
- **Netlify site shows a blank page or 404** → double check the
  **Publish directory** is set to `frontend`, not the repo root.
- **Site is live but visitors can't open it** → check your Netlify site's
  visibility setting; new sites can default to private.
- **Data disappeared after 30 days** → make sure you're using the Neon
  database (Part 2), not Render's built-in free Postgres, which does
  expire.

## Making changes later

Edit your code locally, commit, and push to your fork on GitHub. Render
will notice the change and redeploy the backend automatically. Netlify
does the same for the frontend, since both are connected directly to
your repository.

## What "free" actually costs you here
No money, but two real trade-offs: Render's backend goes to sleep and
takes 20–30 seconds to wake up on the first visit after a quiet spell,
and Neon's free database has a 0.5 GB storage cap — plenty for hundreds
of users' worth of expense records, but worth knowing about if this ever
takes off.