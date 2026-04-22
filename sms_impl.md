# SMS / OTP Implementation Guide — Lumipass

Reference document for how OTP delivery is configured across Lumipass environments (prod + dev), based on the current `notification-service` setup.

---

## 1. Architecture Overview

OTP delivery is handled by a dedicated `notification-service` (Django + Celery + Redis + Postgres). The main API (`lumi-main-app`) does **not** send SMS directly — it queues a notification task on the notification service, which processes it asynchronously via a Celery worker.

```
Client → dev-api.lumipass.uz (main-app)
       → queues task to notification-service
       → Celery worker picks up task
       → sends via SMS (Eskiz) OR Telegram bot
       → user receives OTP
```

### Relevant containers

| Container | Role |
|---|---|
| `lumi-main-app` | Main API, queues OTP tasks |
| `lumi-notification-web-prod` | Notification service HTTP API |
| `lumi-notification-celery-prod` | Celery worker that actually sends OTPs |
| `lumi-notification-celerybeat-prod` | Celery scheduler |
| `lumi-notification-redis-prod` | Task queue broker |
| `lumi-notification-db-prod` | Notification Postgres DB |
| `lumi-telegram-bot` | Telegram bot (alternative OTP channel) |

> Note: container names include `-prod` suffix even on the dev server. This is a naming artifact — the dev/prod distinction lives in env vars, not container names.

---

## 2. OTP Delivery Modes

The notification service supports **two OTP delivery channels**, toggled by an env variable:

```env
USE_TELEGRAM_FOR_OTP=True   # Send OTP via Telegram bot
USE_TELEGRAM_FOR_OTP=False  # Send OTP via Eskiz SMS
```

### Behavior in code (`apps/notification/tasks.py`)

- If `USE_TELEGRAM_FOR_OTP=True`:
  - SMS path is skipped (`"Skipping SMS OTP send, USE_TELEGRAM_FOR_OTP is True"`)
  - Task calls `telegram.send_message(...)`
  - If the Telegram endpoint fails → entire OTP fails, user gets nothing

- If `USE_TELEGRAM_FOR_OTP=False`:
  - Task sends SMS via Eskiz using credentials in env
  - No Telegram involvement

**Important:** The two modes are mutually exclusive. There's no fallback from Telegram → SMS if Telegram fails. Choose carefully per environment.

---

## 3. Environment Variables

Full set of env vars required by `notification-service` for OTP:

### SMS (Eskiz)

```env
SMS_URL=https://notify.eskiz.uz
SMS_EMAIL=<eskiz-account-email>
SMS_PASSWORD=<eskiz-secret-key>
SMS_FROM=4546            # Sender nickname; 4546 is Eskiz's test nickname
```

### Telegram

```env
USE_TELEGRAM_FOR_OTP=False
TELEGRAM_URL=https://api.lumipass.uz/api/v1/telegram
TELEGRAM_BOT_TOKEN=<bot-token-from-BotFather>
TELEGRAM_OTP_CHAT_ID=<chat-or-channel-id>
```

### Environment-specific recommendations

| Env | `USE_TELEGRAM_FOR_OTP` | `TELEGRAM_URL` | Notes |
|---|---|---|---|
| **prod** | `False` | — | Use Eskiz SMS for real users |
| **dev** | `False` (recommended) | — | Match prod behavior; avoids a Telegram-path dependency that can silently break |
| **dev (alternative)** | `True` | must be a reachable endpoint | Only if internal Telegram relay is maintained |

---

## 4. Eskiz SMS Integration

### 4.1 Credentials setup

Get credentials from the Eskiz dashboard: **Settings → SMS gateway**

- **Email (Login)** → `SMS_EMAIL`
- **Secret key (Password)** → `SMS_PASSWORD`

> Treat the secret key like a password. Never commit it. If leaked, rotate immediately via the Eskiz dashboard.

### 4.2 Token lifecycle

Eskiz uses JWT bearer tokens obtained via an auth call. Tokens typically last ~30 days.

**Login endpoint:**

```bash
curl -X POST https://notify.eskiz.uz/api/auth/login \
  -F "email=$SMS_EMAIL" \
  -F "password=$SMS_PASSWORD"
```

Response:

```json
{
  "message": "token_generated",
  "data": { "token": "eyJhbGci..." },
  "token_type": "bearer"
}
```

Store the token; refresh before expiry. The service should handle refresh automatically on 401.

### 4.3 Sending an SMS

```bash
curl -X POST https://notify.eskiz.uz/api/message/sms/send \
  -H "Authorization: Bearer $TOKEN" \
  -F "mobile_phone=998XXXXXXXXX" \
  -F "message=<approved template text>" \
  -F "from=$SMS_FROM"
```

### 4.4 Template moderation (critical)

Eskiz requires **every SMS text to be pre-approved** via moderation. A non-approved message returns:

```json
{
  "message": "Этот смс текст еще не прошёл модерацию. Сначала добавьте его через API - Шаблоны - Отправить шаблон или через кабинет my.eskiz.uz - СМС - Мои тексты.",
  "status": "error"
}
```

**Workflow:**

1. Log into `my.eskiz.uz` → **SMS → My texts (Мои тексты)**
2. Add the exact template used in code, with `{CODE}` (or chosen placeholder) for variable parts
3. Submit for moderation — approval takes hours to 1 business day
4. Once approved, code must send the **exact same text** (char-for-char) with variables filled in

**Tip:** Keep the template identical across prod and dev to avoid maintaining two approvals. Dev and prod can share the same Eskiz account.

### 4.5 Sender nickname

`SMS_FROM` must be a pre-approved sender name. Defaults:

- `4546` — Eskiz's reserved test nickname (works only with the default test template `"This is test from Eskiz"`)
- Custom branded nicknames (e.g., `LUMIPASS`) must be requested and approved via the Eskiz dashboard

---

## 5. Debugging: Why is SMS not arriving?

API returning 200 does not mean SMS was sent. Debug in this order:

### Step 1: Check the celery worker logs

```bash
docker logs --tail 200 lumi-notification-celery-prod
```

Look for lines like:

- `Skipping SMS OTP send, USE_TELEGRAM_FOR_OTP is True` → SMS disabled, Telegram path is being used
- `Failed to send OTP via Telegram service. Status code: 500` → Telegram endpoint broken
- Eskiz error response → template not approved, or auth failed

### Step 2: Verify env vars

```bash
docker exec lumi-notification-web-prod env | grep -iE "telegram|otp|eskiz|sms"
```

Compare dev vs prod — the most common dev/prod divergence is `USE_TELEGRAM_FOR_OTP`.

### Step 3: Reproduce the Eskiz call manually

Login:

```bash
curl -X POST https://notify.eskiz.uz/api/auth/login \
  -F "email=$SMS_EMAIL" -F "password=$SMS_PASSWORD"
```

Send a test (with an approved template text):

```bash
curl -X POST https://notify.eskiz.uz/api/message/sms/send \
  -H "Authorization: Bearer $TOKEN" \
  -F "mobile_phone=998XXXXXXXXX" \
  -F "message=This is test from Eskiz" \
  -F "from=4546"
```

If this works but the service doesn't → issue is in code/template. If this fails → issue is in Eskiz account (balance, suspension).

### Step 4: Check Eskiz dashboard

- **Detailing (Детализация)** → message history with delivery status
- Check **balance** — zero balance silently fails messages
- Check **sender name** approval status
- Check **My texts** — confirm template is approved

### Step 5: Verify outbound network

From the host (Docker containers may not have `curl`):

```bash
curl -I https://notify.eskiz.uz
```

Expect `HTTP/2 200`. If this fails, the server has no outbound network to Eskiz (firewall/egress issue).

---

## 6. Known Pitfalls

1. **200 OK from your API ≠ SMS sent.** The celery task runs async; API returns before Eskiz confirms. Always check celery logs.

2. **Template mismatch is the #1 Eskiz failure mode.** Even a single changed word, punctuation, or language = rejected.

3. **Dev and prod on different servers = different outbound IPs.** If Eskiz or the SMS provider ever requires IP whitelisting, both must be whitelisted.

4. **Cached Eskiz tokens can expire without graceful handling.** Ensure the service handles 401 by re-authenticating, or restart after long outages.

5. **Telegram-as-OTP on dev can silently break** if the `TELEGRAM_URL` points to an endpoint that no longer exists (e.g., `https://dev-api.lumipass.uz/api/v1/telegram` returning 404). Verify with a direct `curl`.

6. **`USE_TELEGRAM_FOR_OTP=True` skips SMS entirely.** If users report "no OTP", first check this flag — not the SMS integration.

7. **Credentials exposed in chats/logs should be rotated immediately.** Eskiz password → change in dashboard. Telegram bot token → `/revoke` via BotFather.

---

## 7. Recommended Production Setup

- `USE_TELEGRAM_FOR_OTP=False` in prod (and dev, for parity)
- Eskiz sender nickname: branded (e.g., `LUMIPASS`), not `4546`
- Single Eskiz account for both envs, with approved template reused
- Notification-service deployed with auto-restart and healthcheck
- Token refresh handled inside the service (not relying on container lifecycle)
- Celery retry policy on SMS send: 3 retries with exponential backoff
- Logging: every SMS attempt logs the phone (masked), template id, Eskiz response code, and response body

---

## 8. Quick Recovery Runbook

**Symptom:** "SMS not arriving on dev, works on prod"

1. `docker exec lumi-notification-web-prod env | grep USE_TELEGRAM` — check the flag
2. If `True` → either:
   - Change to `False` in `/home/lumi/notif/.env`
   - `docker restart lumi-notification-web-prod lumi-notification-celery-prod lumi-notification-celerybeat-prod`
3. Trigger an SMS, tail celery logs, confirm it reaches Eskiz
4. If Eskiz rejects with template error → align the dev code's template text with an approved one

**Symptom:** "Works in curl but not via service"

1. Inspect celery logs for the exact payload sent
2. Compare sent message text vs Eskiz "My texts" — must match exactly
3. Compare `from` field vs approved sender

**Symptom:** "API returns 200 but nothing in celery logs"

1. Redis (`lumi-notification-redis-prod`) may be down — check `docker ps`
2. Main-app may not be queuing to notification-service — check `lumi-main-app` logs
3. Celery worker may be stuck — `docker restart lumi-notification-celery-prod`
