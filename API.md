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

1. `POST /api/auth/send-otp` — request a 4-digit OTP (valid 180s).
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
{ "phone": "+998901234567", "code": "1234" }
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

### Branches — `/api/branches` (public)

Partner venue locations. Multilingual `address` / `description`. Includes `location.lat` / `location.lng` when set (not yet filtered by proximity).

#### `GET /api/branches?page=1&limit=10&search=&partner_id=`

Query params:
- `page` (default `1`)
- `limit` (default `10`)
- `search` — matches `title`, `landmark`, and any locale of `address`
- `partner_id` — filter by partner

Response `data`:
```json
{
  "data": [
    {
      "_id": "…",
      "title": "Lumi Yunusobod",
      "landmark": "TRK Next",
      "address": { "uz": "…", "ru": "…", "en": "…" },
      "description": { "uz": "…", "ru": "…", "en": "…" },
      "location": { "lat": 41.36, "lng": 69.28 },
      "partner_id": "…",
      "manager_full_name": "…",
      "manager_phone": "+998…",
      "images": ["/uploads/…"],
      "status": "approved",
      "created_at": "…",
      "updated_at": "…"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 10,
  "pages": 2
}
```

#### `GET /api/branches/:id`
Returns a single branch object.

---

### Categories — `/api/categories` (public)

Activity categories with localized `name`. `type` is one of `free_play | timed_activity`.

#### `GET /api/categories?page=1&limit=10&type=timed_activity`

Query params:
- `page`, `limit` — pagination
- `type` — `free_play` | `timed_activity` (optional)

Response `data`:
```json
{
  "data": [
    {
      "_id": "…",
      "name": { "uz": "…", "ru": "…", "en": "…" },
      "type": "timed_activity",
      "image": "/uploads/…",
      "created_at": "…",
      "updated_at": "…"
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 10,
  "pages": 1
}
```

#### `GET /api/categories/:id`
Returns a single category object.

---

### Classes — `/api/classes` (public)

Activities / classes offered at branches. Multilingual `name` / `description`. Populated with `branch` and `category` relations.

#### `GET /api/classes?page=1&limit=10&branch_id=&category_id=&search=`

Query params:
- `page`, `limit` — pagination
- `branch_id` — filter by branch
- `category_id` — filter by category
- `search` — matches across locales of `name`

Response `data`:
```json
{
  "data": [
    {
      "_id": "…",
      "name": { "uz": "…", "ru": "…", "en": "…" },
      "description": { "uz": "…", "ru": "…", "en": "…" },
      "branch_id": {
        "_id": "…",
        "title": "Lumi Yunusobod",
        "address": { "uz": "…", "ru": "…", "en": "…" },
        "location": { "lat": 41.36, "lng": 69.28 }
      },
      "category_id": {
        "_id": "…",
        "name": { "uz": "…", "ru": "…", "en": "…" },
        "type": "timed_activity"
      },
      "age_from": 4,
      "age_to": 12,
      "gender": "any",
      "price": 250000,
      "has_age_pricing": false,
      "age_price_ranges": [],
      "discount_percentage": 0,
      "schedule": [
        { "day": "mon", "start_time": "10:00", "end_time": "11:00" }
      ],
      "work_hours": [
        { "day": "mon", "start_time": "09:00", "end_time": "20:00" }
      ],
      "image": "/uploads/…",
      "images": ["/uploads/…"],
      "important_notes": { "uz": "…", "ru": "…", "en": "…" },
      "is_parent_control_required": false,
      "parent_control_age_from": null,
      "parent_control_age_to": null,
      "required_items": { "uz": "…", "ru": "…", "en": "…" },
      "vimeo_link": null,
      "youtube_link": null,
      "activity_languages": ["uz", "ru"],
      "status": "approved",
      "created_at": "…",
      "updated_at": "…"
    }
  ],
  "total": 40,
  "page": 1,
  "limit": 10,
  "pages": 4
}
```

#### `GET /api/classes/:id`
Returns a single class object with the same populated shape as a list item.

> Note: geo-based "nearby classes" filtering (by user coordinates / radius) is not yet supported. Sort/filter classes client-side using `branch_id.location` if needed.

---

### Children — `/api/children` (auth required)

Parent's children (profiles used for bookings/onboarding). `parent_id` is taken from the JWT.

#### `GET /api/children?page=1&limit=50`
Response `data`:
```json
{
  "data": [
    {
      "_id": "…",
      "name": "Ali",
      "age": 5,
      "gender": "male",
      "avatar": "/uploads/…",
      "parent_id": "…",
      "created_at": "…",
      "updated_at": "…"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50,
  "pages": 1
}
```

#### `GET /api/children/:id`
Returns a single child object (must belong to the caller).

#### `POST /api/children`
Body:
```json
{ "name": "Ali", "age": 5, "gender": "male", "avatar": "/uploads/…" }
```
Returns the created child.

#### `PATCH /api/children/:id`
Body: any subset of create fields. Returns the updated child.

#### `DELETE /api/children/:id`
Soft-deletes. Response `data`:
```json
{ "message": "Child deleted successfully" }
```

---

### Tariffs (Plans) — `/api/tariffs` (public)

Subscription plans shown in place of a wallet. Multilingual `name`, `description`, and `features[]`.

#### `GET /api/tariffs?page=1&limit=20`
Response `data`:
```json
{
  "data": [
    {
      "_id": "…",
      "name": { "uz": "…", "ru": "…", "en": "…" },
      "description": { "uz": "…", "ru": "…", "en": "…" },
      "price": 199000,
      "currency": "UZS",
      "duration_days": 30,
      "features": [
        { "uz": "…", "ru": "…", "en": "…" }
      ],
      "is_active": true,
      "order": 1,
      "created_at": "…",
      "updated_at": "…"
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20,
  "pages": 1
}
```

#### `GET /api/tariffs/:id`
Returns a single tariff.

---

### Discovery — `/api/discovery` (public)

Aggregated content for the home feed and explore screen.

#### `GET /api/discovery/feed`
Response `data`:
```json
{
  "banners": [ /* banner objects */ ],
  "categories": [ /* category objects */ ],
  "new_classes": [ /* class objects (populated) */ ]
}
```

#### `GET /api/discovery/explore?page=1&limit=10&search=&branch_id=&category_id=`
Paginated class search. Same response shape as `GET /api/classes`.

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
