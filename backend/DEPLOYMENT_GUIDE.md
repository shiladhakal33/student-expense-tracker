# Deploying SmartSpend for Free — Complete Guide

This walks you through putting SmartSpend online for free, so anyone with
the link can use it — no prior web/hosting experience assumed. It has 5
parts, done in this order:

1. Put your code on GitHub
2. Create a free database (Neon)
3. Deploy the backend (Render)
4. Deploy the frontend (Netlify)
5. Connect the two + test everything

Budget: **$0**. Total time: roughly 45–60 minutes the first time.

---

## Before you start — the pieces, in plain terms

Your app has two halves that get hosted **separately**:
- **Frontend** (`index.html`, `app.js`, `style.css`, `chart.js`) — just
  files a browser reads directly. Any "static site" host works.
- **Backend** (the Spring Boot Java project) — a program that has to keep
  running on a server, plus a **database** to store users/transactions.

They talk to each other over the internet using the URL in `app.js`
(`API_BASE`). Once both are online, you point the frontend at the
backend's real address instead of `localhost`.

---

## Part 1 — Put your code on GitHub

GitHub is where your code lives so the hosting platforms can find it.

1. Create a free account: **https://github.com/join**
2. Install **GitHub Desktop** (a graphical app — no command line needed):
   **https://desktop.github.com/**
3. Open GitHub Desktop → sign in with your GitHub account.
4. `File → New Repository`. Name it `smartspend-backend`. Set "Local Path"
   to somewhere on your computer. Click **Create Repository**.
5. Copy all the files from the `smartspend-backend` folder I gave you
   (unzip it first) into that new repository's folder on your computer.
6. Back in GitHub Desktop, you'll see all the new files listed. Type a
   summary like "Initial commit", click **Commit to main**, then click
   **Publish repository** (top right). Leave "Keep this code private"
   unchecked if you don't mind it being public — it needs to be public for
   Render's free tier to access it, unless you connect your GitHub account
   directly, which also works with private repos.
7. Repeat steps 4–6 for a **second** repository named `smartspend-frontend`,
   using your `index.html`, `app.js`, `style.css`, `chart.js` files.

You now have two repos on your GitHub profile — `smartspend-backend` and
`smartspend-frontend`.

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
3. Connect your `smartspend-backend` GitHub repo.
4. Render will detect the `Dockerfile` automatically and set
   **Runtime: Docker**. Leave build/start commands blank — the Dockerfile
   handles it.
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

   For `JWT_SECRET`, generate one at
   **https://www.random.org/strings/** (20+ characters, or just mash your
   keyboard for 40 characters) — it just needs to be long and secret.

7. Click **Create Web Service**. Render will build and deploy — the first
   build takes 3–5 minutes. Watch the logs; when it says the app started,
   you're live.
8. Your backend's URL is shown at the top of the page, something like:
   `https://smartspend-backend-xxxx.onrender.com`
   Write this down — you need it for the frontend.

**Free tier quirk to expect:** Render's free web services "sleep" after 15
minutes with no traffic, and take 10–30 seconds to wake up on the next
request. This is normal — not a bug. The first person to visit after a
quiet period just waits a bit longer.

---

## Part 4 — Deploy the frontend (Netlify)

This is the easy part — no command line at all.

1. Open your `index.html`, `app.js`, `style.css`, `chart.js` files — put
   them all in one folder on your computer if they aren't already.
2. **Before uploading**, open `app.js` in a text editor, find this line
   near the top:
   ```js
   const API_BASE = 'http://localhost:8080/api';
   ```
   and change it to your Render URL from Part 3, keeping `/api` on the end:
   ```js
   const API_BASE = 'https://smartspend-backend-xxxx.onrender.com/api';
   ```
   Save the file.
3. Go to **https://app.netlify.com/drop**
4. Drag your whole folder (containing the 4 files) onto the page.
5. Netlify uploads it and gives you a live URL immediately, like
   `https://random-name-123.netlify.app`. That's your app's public
   address — share it with anyone.

(Want it to auto-update whenever you change the code later? Connect
Netlify to your `smartspend-frontend` GitHub repo instead of drag-and-drop
— same free tier, Netlify docs walk through it: **https://docs.netlify.com/git/get-started/**)

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
   "Response" for the error message my backend sends back).

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
frontend broken" when something doesn't work.

---

## Quick reference — all the links

| What | Link | Free tier |
|---|---|---|
| GitHub (code hosting) | https://github.com/join | Unlimited public repos |
| GitHub Desktop (no command line) | https://desktop.github.com/ | Free |
| Neon (database) | https://neon.tech | Permanent, 0.5 GB, no card |
| Render (backend hosting) | https://render.com | Permanent, sleeps when idle |
| Netlify (frontend hosting) | https://app.netlify.com/drop | Permanent, generous |
| Postman (API testing) | https://www.postman.com/downloads/ | Free |

---

## Troubleshooting checklist

- **"Could not reach the server"** in the app → your Render service is
  probably asleep (wait 20–30s and retry) or `API_BASE` in `app.js` has a
  typo/wrong URL.
- **Login/register works but nothing else does** → check the browser
  console for a `401` — usually means `JWT_SECRET` isn't set on Render.
- **"blocked by CORS policy"** in the console → `CORS_ORIGINS` on Render
  doesn't exactly match your Netlify URL (check for `http` vs `https`, or
  a trailing slash).
- **Backend won't deploy on Render at all** → open the Render build logs;
  copy the error and paste it back to me — I'll tell you the fix.
- **Data disappeared after 30 days** → make sure you're using the Neon
  database (Part 2), not Render's built-in free Postgres, which does
  expire.

## What "free" actually costs you here
No money, but two real trade-offs: Render's backend goes to sleep and
takes a few seconds to wake up on the first visit after a quiet spell, and
Neon's free database has a 0.5 GB storage cap — plenty for hundreds of
users' worth of expense records, but worth knowing about if this ever
takes off.
