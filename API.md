# Lumi Mobile API — Integration Guide

Reference for integrating the mobile app with the Lumi backend.

## Base URL

| Environment | URL |
|---|---|
| Local | `http://localhost:3000` |
| Production | `https://mobile-api-production-82c0.up.railway.app` |

Sibling services on Railway (for reference):
- adminka-backend → `https://adminka-api-production.up.railway.app`
- b2b-backend → `https://b2b-api-production-b1f9.up.railway.app`

- No global route prefix — every path already includes `/api/...`.
- Swagger docs: `GET /api/docs` (Basic Auth — user `admin`, pass `DOCS_PASSWORD`).
- Rate limit: **10 requests / 60s** per IP.
- CORS: enabled with credentials.

## Authentication

JWT Bearer token. Send it on every protected request:

```http
Authorization: Bearer <access_token>
```

### Flow

1. `POST /api/auth/send-otp` — request a 6-digit OTP (valid 180s).
2. `POST /api/auth/verify-otp` — verify code.
   - Existing user → `{ is_new_user: false, access_token, user }`.
   - New user → `{ is_new_user: true, access_token: null, user: null }` → go to step 3.
3. `POST /api/auth/register` — complete sign-up, receive `access_token`.

Store `access_token` securely (Keychain / Keystore) and attach it to all authenticated calls.

## Response Envelope

Every success response is wrapped:

```json
{ "data": <payload> }
```

Errors:

```json
{
  "statusCode": 400,
  "message": "…",
  "error": "Bad Request",
  "timestamp": "2026-04-12T10:00:00.000Z",
  "path": "/api/..."
}
```

Common codes: `200` OK · `400` validation · `401` invalid/missing token · `403` forbidden · `404` not found · `429` rate-limited · `500` server error.

---

## Endpoints

### Auth — `/api/auth` (public)

#### `POST /api/auth/send-otp`
Send OTP to a phone.

Request:
```json
{ "phone": "+998901234567" }
```

Response `data`:
```json
{ "message": "OTP sent successfully", "expires_in": 180 }
```

#### `POST /api/auth/verify-otp`
Verify OTP, log in existing user or flag new user.

Request:
```json
{ "phone": "+998901234567", "code": "123456" }
```

Response `data`:
```json
{
  "is_new_user": false,
  "access_token": "eyJhbGci...",
  "user": {
    "_id": "…",
    "phone": "+998901234567",
    "first_name": "Ali",
    "last_name": "Valiev",
    "role": "user"
  }
}
```

#### `POST /api/auth/register`
Create account after OTP verification.

Request:
```json
{
  "phone": "+998901234567",
  "first_name": "Ali",
  "last_name": "Valiev"
}
```

Response `data`:
```json
{
  "access_token": "eyJhbGci...",
  "user": { "_id": "…", "phone": "…", "first_name": "…", "last_name": "…", "role": "user" }
}
```

---

### Profile — `/api/profile` (auth required)

#### `GET /api/profile`
Get current user.

Response `data`:
```json
{
  "_id": "…",
  "phone": "+998901234567",
  "first_name": "Ali",
  "last_name": "Valiev",
  "role": "user",
  "avatar": "/uploads/xyz.jpg",
  "created_at": "…",
  "updated_at": "…"
}
```

#### `PATCH /api/profile`
Update profile. All fields optional.

```json
{
  "first_name": "Ali",
  "last_name": "Valiev",
  "avatar": "/uploads/xyz.jpg"
}
```

#### `DELETE /api/profile`
Delete account.

Response `data`:
```json
{ "message": "Account deleted successfully" }
```

---

### Banners — `/api/banners` (public)

Localized content in `uz` / `ru` / `en`.

#### `GET /api/banners?page=1&limit=10`

Response `data`:
```json
{
  "data": [
    {
      "_id": "…",
      "image": { "uz": "…", "ru": "…", "en": "…" },
      "title": { "uz": "…", "ru": "…", "en": "…" },
      "description": { "uz": "…", "ru": "…", "en": "…" },
      "link": "https://…",
      "tags": ["promo"],
      "is_active": true,
      "order": 1,
      "created_at": "…",
      "updated_at": "…"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "pages": 5
}
```

#### `GET /api/banners/:id`
Returns a single banner object (same shape as list item).

---

### Uploads — `/api/uploads` (auth required)

#### `POST /api/uploads`
Upload image. `multipart/form-data`, field name `file`. Max 10 MB. Allowed: `jpg, jpeg, png, gif, webp, svg`.

Response `data`:
```json
{
  "url": "/uploads/1713000000-abc.jpg",
  "filename": "1713000000-abc.jpg",
  "originalname": "photo.jpg",
  "size": 204800
}
```

Prefix `url` with the base URL when rendering: `${BASE_URL}${url}`.

---

## Mobile Client Checklist

- [ ] Store base URL per environment in config.
- [ ] Persist `access_token` securely (Keychain / EncryptedSharedPreferences).
- [ ] Inject `Authorization: Bearer …` via HTTP interceptor.
- [ ] On `401`, clear token and route to OTP screen.
- [ ] Handle `429` with backoff.
- [ ] Unwrap `data` field globally in your API client.
- [ ] Send locale-aware strings from `uz | ru | en` objects based on current app language.
