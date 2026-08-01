# SmartSpend Backend (Spring Boot)

A real backend for the SmartSpend expense tracker: Spring Boot 3 + Spring
Security (JWT) + Spring Data JPA + H2 (file-based, zero setup).

## Requirements
- Java 17+
- Maven 3.8+ (or use your IDE's built-in Maven support)

## Run it

```bash
cd smartspend-backend
mvn spring-boot:run
```

The API starts on **http://localhost:8080**. A `./data/smartspend.mv.db`
file is created automatically on first run — that's your database, no
install needed. Delete that file any time to wipe all data and start fresh.

You can browse the database directly at http://localhost:8080/h2-console
(JDBC URL: `jdbc:h2:file:./data/smartspend`, user `sa`, blank password).

## Before you deploy anywhere real
Set a proper secret instead of the built-in dev default:
```bash
export JWT_SECRET=$(openssl rand -base64 48)
```
`application.properties` reads it via `${JWT_SECRET:...}`, so this
overrides the default automatically.

Also update `app.cors.allowed-origins` in `application.properties` to match
wherever your frontend is actually hosted.

## Deploying it for free (so other people can use it)

This project already ships with what you need for a free, permanent
deployment:
- `Dockerfile` — Render (and most PaaS platforms) build and run this
  automatically, no extra config.
- `src/main/resources/application-prod.properties` — a Spring "prod"
  profile that reads everything (database, JWT secret, allowed frontend
  origin) from environment variables, so no secrets ever go in Git.

See **DEPLOYMENT_GUIDE.md** (next to this file) for the complete,
click-by-click walkthrough — free Postgres on Neon, free backend hosting on
Render, free frontend hosting on Netlify, and how to test it all with
Postman. It assumes no prior web/hosting experience.



All request/response bodies are JSON. Authenticated endpoints require:
`Authorization: Bearer <token>`

| Method | Path                     | Auth? | Body                                   | Notes |
|--------|--------------------------|-------|-----------------------------------------|-------|
| POST   | /api/auth/register       | no    | `{username, email, password}`           | 201 + token |
| POST   | /api/auth/login          | no    | `{usernameOrEmail, password}`           | 200 + token |
| POST   | /api/auth/forgot/find    | no    | `{username}`                            | 200 or 404 |
| POST   | /api/auth/forgot/reset   | no    | `{username, newPassword}`               | 200 |
| GET    | /api/users/me            | yes   | —                                        | profile |
| DELETE | /api/users/me            | yes   | —                                        | deletes account + all data |
| GET    | /api/transactions        | yes   | —                                        | list, newest first |
| POST   | /api/transactions        | yes   | `{type, amount, category, subcategory, otherText, date}` | 201 |
| DELETE | /api/transactions/{id}   | yes   | —                                        | 204 |
| GET    | /api/budget              | yes   | —                                        | 200 or 204 if unset |
| PUT    | /api/budget              | yes   | `{amount}`                               | upsert |

Errors come back as:
```json
{ "timestamp": "...", "status": 400, "error": "message", "fieldErrors": { "field": "message" } }
```

## What's actually secure here (vs. the old localStorage version)
- Passwords are hashed server-side with **BCrypt** — the client never
  computes or sees a hash, and the server never stores or logs the
  plaintext password.
- Auth tokens are signed **JWTs**; the server validates the signature on
  every request rather than trusting anything the client claims.
- Each user's transactions and budget are scoped by their authenticated
  identity server-side — a user cannot read or delete another user's data
  no matter what the client sends.
- Duplicate-email registration is rejected at the database/service layer
  (not just in the browser), closing the login-collision bug from the
  prototype version for good.

## Still your job before a real production deploy
- Serve over **HTTPS** (a reverse proxy like Nginx + Let's Encrypt, or a
  platform that terminates TLS for you).
- Swap the dev JWT secret (see above).
- Consider a managed Postgres/MySQL instead of the H2 file once you have
  real users — H2 file mode is great for development but isn't built for
  concurrent production traffic.
- Add rate limiting on `/api/auth/login` to slow down brute-force attempts
  (not included here — Spring Boot doesn't ship this out of the box; a
  library like Bucket4j or an API gateway is the usual answer).
