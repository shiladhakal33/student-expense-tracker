# SmartSpend — Student Expense Tracker

A full-stack web application that helps students track income and expenses,
set a monthly budget, and see their spending trends at a glance.

**Live app:** https://iridescent-manatee-8f5f28.netlify.app

Built for the Research Fundamentals project (4th Semester, Pokhara University).

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Deployment](#deployment)

---

## Problem Statement

Students often struggle to keep track of daily spending, especially when
juggling irregular income (allowances, part-time work, family support)
against recurring expenses. Without a simple way to log transactions and
set spending limits, it's easy to overspend without noticing until it's too
late. SmartSpend gives students a lightweight, no-friction way to log
income and expenses, set a monthly budget, and visualize spending patterns
— so they can make better financial decisions.

---

## Features

- **Authentication** — Register and log in with a username, email, and
  password. Sessions are secured with JWT.
- **Transaction tracking** — Log income and expenses with category,
  subcategory, amount, and date.
- **Monthly budget** — Set a monthly spending limit and track how much of
  it has been used.
- **Dashboard overview** — See total balance, money in, money spent, and
  recent transactions at a glance.
- **Analytics** — Visual breakdown of spending by category and trends over
  time.
- **Account security** — Deleting an account requires re-entering your
  password, so a session left open on a shared device can't be used to
  wipe your data.
- **Account deletion** — Permanently delete your account and all
  associated data.

---

## Tech Stack

**Backend**
- Java 17, Spring Boot 3.2.5
- Spring Security + JWT for authentication
- Spring Data JPA (Hibernate)
- PostgreSQL (production, hosted on [Neon](https://neon.tech)) / H2
  (local development)
- Maven

**Frontend**
- HTML, CSS, vanilla JavaScript (no framework)
- Chart.js for analytics visualizations

**Deployment**
- Backend: [Render](https://render.com) (Docker)
- Frontend: [Netlify](https://netlify.com)
- Database: [Neon](https://neon.tech) (serverless Postgres)

---

## Architecture

This repo contains two independently deployed halves:

```
student-expense-tracker/
├── backend/    → Spring Boot REST API (Java)
└── frontend/   → Static HTML/CSS/JS client
```

The frontend talks to the backend over HTTPS using the URL configured in
`frontend/app.js` (`API_BASE`). They are hosted separately and communicate
purely over the network — there's no server-side rendering or shared build
step between them.

---

## Installation and Setup

### Prerequisites
- Java 17+
- Maven 3.8+ (or use your IDE's built-in Maven support)
- A modern web browser

### Backend

```bash
cd backend
mvn spring-boot:run
```

The API starts on **http://localhost:8080**. On first run, a local H2
database file is created automatically at `./data/smartspend.mv.db` — no
manual database setup needed for local development.

### Frontend

Open `frontend/index.html` with a local static server (e.g. VS Code's
"Live Server" extension) rather than opening the file directly, so that
requests to the backend work correctly.

By default, `frontend/app.js` points at `http://localhost:8080/api` for
local development.

---

## Environment Variables

For production deployment, the backend expects the following environment
variables (see `backend/DEPLOYMENT_GUIDE.md` for a full walkthrough):

| Variable | Description |
|---|---|
| `SPRING_PROFILES_ACTIVE` | Set to `prod` in production |
| `DATABASE_URL` | JDBC connection string for the Postgres database |
| `DATABASE_USERNAME` | Database username |
| `DATABASE_PASSWORD` | Database password |
| `JWT_SECRET` | Long, random Base64-encoded secret used to sign JWTs |
| `CORS_ORIGINS` | The frontend's deployed URL, so the API accepts its requests |

---

## API Reference

Base URL (local): `http://localhost:8080/api`

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new account |
| `POST` | `/auth/login` | Log in with username/email + password |
| `POST` | `/auth/forgot/find` | Look up an account by username |
| `POST` | `/auth/forgot/reset` | Reset a forgotten password |

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/transactions` | List the current user's transactions |
| `POST` | `/transactions` | Create a new income/expense transaction |
| `DELETE` | `/transactions/{id}` | Delete a transaction |

### Budget

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/budget` | Get the current user's monthly budget |
| `PUT` | `/budget` | Set or update the monthly budget |

### User

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users/me` | Get the current user's profile |
| `DELETE` | `/users/me` | Permanently delete the account (requires password confirmation in the request body) |

All endpoints except `/auth/*` require an `Authorization: Bearer <token>`
header.

---

## Deployment

This project is deployed for free across three platforms:

1. **Neon** — free-tier Postgres database (doesn't expire)
2. **Render** — free-tier Docker web service for the backend (spins down
   after 15 minutes of inactivity; wakes up in ~20–30 seconds on the next
   request)
3. **Netlify** — free static hosting for the frontend

See `backend/DEPLOYMENT_GUIDE.md` in this repo for the full step-by-step
deployment walkthrough.