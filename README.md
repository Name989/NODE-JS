# NODE JS BACKEND

A secure Node.js/Express REST API featuring JWT authentication with TOTP-based OTP verification delivered via email and SMS.

---

## Features

- Email + password login with bcrypt password hashing
- TOTP-based OTP (Google Authenticator compatible) sent via **email** (Nodemailer) and **SMS** (Twilio)
- JWT access tokens (15 min) + refresh tokens (7 days) with automatic rotation
- Refresh tokens stored as SHA-256 hashes — raw token never touches the database
- Protected route middleware with `TokenExpiredError` / `JsonWebTokenError` handling
- Rate limiting on `/auth/login` and `/auth/verify-otp` (10 req / 15 min)
- PostgreSQL + Sequelize ORM with migrations
- 22 Jest tests (unit + functional) covering happy paths, edge cases, and security scenarios

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL + Sequelize ORM |
| Auth | JWT (`jsonwebtoken`) + bcryptjs |
| OTP | otplib (TOTP — RFC 6238) |
| Email | Nodemailer |
| SMS | Twilio |
| Testing | Jest + Supertest |

---

## Project Structure

```
.
├── src/
│   ├── app.js                  # Express app setup, routes, error handler
│   ├── server.js               # DB connect + server start
│   ├── config/
│   │   ├── database.js         # Sequelize instance
│   │   ├── env.js              # Env var validation (exits on missing vars)
│   │   └── sequelize-cli.js    # Sequelize CLI config
│   ├── controllers/
│   │   └── auth.controller.js  # Input validation + response shaping
│   ├── middleware/
│   │   └── auth.middleware.js  # JWT Bearer token verification
│   ├── migrations/
│   │   ├── 001-create-users.js
│   │   └── 002-create-refresh-tokens.js
│   ├── models/
│   │   ├── User.js
│   │   └── RefreshToken.js
│   ├── routes/
│   │   └── auth.routes.js      # Rate-limited auth routes
│   └── services/
│       ├── auth.service.js     # Login, OTP verify, refresh, logout logic
│       ├── email.service.js    # Nodemailer OTP email
│       ├── sms.service.js      # Twilio OTP SMS
│       ├── token.service.js    # JWT sign/verify + refresh token management
│       └── totp.service.js     # TOTP generate/verify
├── tests/
│   ├── setup.js                # Test env vars
│   ├── unit/
│   │   ├── totp.service.test.js
│   │   ├── token.service.test.js
│   │   └── auth.service.test.js
│   └── functional/
│       └── auth.routes.test.js
├── backlog/                    # SDD task files (planning → spec → done)
├── documents/                  # Security rules, gate process docs
├── .env.example
├── .sequelizerc
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL database
- Twilio account (for SMS)
- SMTP email credentials (for email OTP)

### Installation

```bash
git clone https://github.com/Name989/NODE-JS.git
cd NODE-JS
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Fill in all values in .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default: 5432) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASS` | Database password |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASS` | SMTP password |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Twilio sender phone number |

### Run Migrations

```bash
npm run migrate
```

### Start Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

---

## API Endpoints

### `POST /auth/login`

Validates email + password, sends OTP via email and SMS.

**Request**
```json
{ "email": "user@example.com", "password": "yourpassword" }
```

**Response `200`**
```json
{ "success": true, "message": "OTP sent" }
```

---

### `POST /auth/verify-otp`

Verifies the TOTP code and issues JWT tokens.

**Request**
```json
{ "email": "user@example.com", "otp": "123456" }
```

**Response `200`**
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<token>"
}
```

---

### `POST /auth/refresh`

Rotates the refresh token and issues a new access token.

**Request**
```json
{ "refreshToken": "<token>" }
```

**Response `200`**
```json
{ "accessToken": "<new-jwt>" }
```

---

### `POST /auth/logout`

Revokes the refresh token.

**Request**
```json
{ "refreshToken": "<token>" }
```

**Response `200`**
```json
{ "message": "Logged out successfully" }
```

---

### `GET /protected`

Example protected route — requires valid Bearer token.

**Headers**
```
Authorization: Bearer <accessToken>
```

**Response `200`**
```json
{ "message": "Access granted", "user": { "id": "...", "email": "..." } }
```

---

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Functional tests only
npm run test:functional
```

All 22 test cases pass covering:
- TOTP generation and verification
- JWT sign, verify, expiry, and tamper detection
- Login happy path and credential leak prevention
- OTP verify and token issuance
- Refresh token rotation and replay prevention
- Logout and token revocation
- Protected route middleware

---

## Security Highlights

- Passwords hashed with bcryptjs (salt rounds: 12)
- Refresh tokens stored as SHA-256 hashes — never raw values in DB
- Generic `"Invalid credentials"` error for both wrong password and unknown email (prevents user enumeration)
- Atomic refresh token rotation — replayed tokens are rejected
- Rate limiting on sensitive auth endpoints
- Stack traces never exposed in API responses

---

## License

MIT
