# Eskiz SMS Service

Eskiz integration lives in the separate **notification-service** (Python/Django/Celery), not in main-service. Main-service only posts an OTP request to the internal notification API; notification-service then calls Eskiz.

Source: `/Users/macbookuz/Desktop/notification-service-main`

## 1. Configuration

### Environment Variables (`.env.example`)

```env
SMS_URL=https://notify.eskiz.uz
SMS_EMAIL=sms@lumipass.uz
SMS_PASSWORD=very-strong-password
SMS_FROM=4546
SMS_CALLBACK_URL=http://your-website.com/sms-callback
```

### Django Settings (`src/config/settings/base.py:184-188`)

```python
SMS_URL = config("SMS_URL", default="https://notify.eskiz.uz")
SMS_EMAIL = config("SMS_EMAIL", default="")
SMS_PASSWORD = config("SMS_PASSWORD", default="")
SMS_FROM = config("SMS_FROM", default="4546")
SMS_CALLBACK_URL = config("SMS_CALLBACK_URL", default="")
```

| Key | Purpose |
|---|---|
| `SMS_URL` | Eskiz base URL (`https://notify.eskiz.uz`) |
| `SMS_EMAIL` | Eskiz account email — used for `/api/auth/login` |
| `SMS_PASSWORD` | Eskiz account password |
| `SMS_FROM` | Sender/alpha ID registered with Eskiz (`4546`) |
| `SMS_CALLBACK_URL` | Delivery status webhook Eskiz calls |

Also relevant: `JWT_SECRET_KEY`, `USE_TELEGRAM_FOR_OTP` (if `True`, OTPs are routed to Telegram instead of SMS).

## 2. Eskiz Endpoints Used

**File:** `src/apps/notification/services/sms/config.py:10-21`

```python
endpoints = {
    "login":          "api/auth/login",
    "refresh":        "api/auth/refresh",
    "user":           "api/auth/user",
    "send_sms":       "api/message/sms/send",
    "send_sms_batch": "api/message/sms/send-batch",
}

credentials = {
    "email":    settings.SMS_EMAIL,
    "password": settings.SMS_PASSWORD,
}
```

## 3. Token Lifecycle

**File:** `src/apps/notification/services/sms/config.py`

Token is a module-level global, lazy-loaded, JWT-decoded to check expiry, and refreshed in-place.

### Expiry check (`:28-36`)

```python
def is_token_expired() -> bool:
    import jwt
    payload = jwt.decode(_token, algorithms=["HS256"], options={"verify_signature": False})
    return payload.get("exp", 0) < int(time.time())
```

### Get token (`:39-52`)

```python
def get_token() -> str:
    global _token
    if _token:
        if is_token_expired():
            refresh_token()
        return _token
    else:
        login()
        return get_token()
```

### Login — `POST /api/auth/login` (`:55-69`)

```python
def login() -> None:
    global _token
    response = _api_client.post(endpoint=endpoints["login"], json=credentials)
    if response.status_code != 200:
        raise Exception(f"Failed to login to SMS service. Status code: {response.status_code}")
    data = response.json()
    _token = data.get("data", {}).get("token", "")
```

Request body: `{ "email": "...", "password": "..." }`
Response: `{ "data": { "token": "<JWT>" } }`

### Refresh — `PATCH /api/auth/refresh` (`:71-85`)

```python
def refresh_token() -> None:
    global _token
    response = _api_client.patch(endpoint=endpoints["refresh"], auth_token=_token)
    if response.status_code != 200:
        raise Exception(f"Failed to refresh SMS service token. Status code: {response.status_code}")
    data = response.json()
    _token = data.get("data", {}).get("token", "")
```

## 4. Sending SMS

**File:** `src/apps/notification/services/sms/functions.py`

### Public helper (`:18-27`)

```python
def send_message(phone: str, message: str) -> SendSMSResponse:
    sms_request = SendSMSRequest(mobile_phone=phone, message=message)
    logger.info(f"Sending SMS to {phone}: {message}")
    return _send_sms(request=sms_request)
```

### Wire call — `POST /api/message/sms/send` (`:52-74`)

```python
def _send_sms(request: SendSMSRequest) -> SendSMSResponse:
    response = _api_client.post(
        endpoint=endpoints["send_sms"],
        json=request.model_dump(by_alias=True),
        auth_token=get_token(),
    )
    if response.status_code != 200:
        raise Exception(f"Failed to send SMS via SMS service. Status code: {response.status_code}")
    response_json = response.json()
    try:
        return SendSMSResponse.from_dict(response_json)
    except ValidationError as e:
        logger.error("Failed to parse SendSMSResponse from SMS service",
                     extra={"raw_response": response_json, "error": str(e)})
        raise Exception("Invalid SMS response from SMS service") from e
```

### Batch — `POST /api/message/sms/send-batch` (`:77-108`)

Sends up to N messages in one call using `SendBatchSMSRequest`.

## 5. Request / Response Models

**File:** `src/apps/notification/services/sms/models.py`

```python
class SendSMSRequest(BasePydanticModel):
    mobile_phone: str
    message: str
    from_: str = Field(default=settings.SMS_FROM, alias="from")
    callback_url: str | None = Field(default=settings.SMS_CALLBACK_URL)

class SendSMSResponse(BasePydanticModel):
    id: UUID
    message: str
    status: str

class SendBatchSMSMessage(BasePydanticModel):
    user_sms_id: str = Field(default_factory=lambda: str(UUID()))
    to: str
    text: str

class SendBatchSMSRequest(BasePydanticModel):
    messages: list[SendBatchSMSMessage]
    dispatch_id: str | None = None
    from_: str = Field(default=settings.SMS_FROM, alias="from")
    callback_url: str | None = Field(default=settings.SMS_CALLBACK_URL)

class SendSMSBatchResponse(BasePydanticModel):
    id: UUID
    message: str
    status: list[str]
```

Example Eskiz payload:

```json
{
  "mobile_phone": "+998901234567",
  "message": "Tasdiqlash kodi ... 123456",
  "from": "4546",
  "callback_url": "http://your-website.com/sms-callback"
}
```

## 6. HTTP Client

**File:** `src/apps/core/utils/api_client.py:6-64`

Thin wrapper around `requests`. When `auth_token=` is passed, it injects `Authorization: Bearer <token>`. Default timeout: 10s.

```python
token = kwargs.pop("auth_token", None)
if token:
    all_headers["Authorization"] = f"Bearer {token}"
```

## 7. OTP → SMS Wiring

### OTP dispatcher

**File:** `src/apps/notification/services/otp/functions.py`

```python
def send_otp(phone: str, code: str, method: str, language: str) -> None:
    if method == CONSTANTS.NotificationMethod.SMS:
        from apps.notification.services import sms
        if not settings.USE_TELEGRAM_FOR_OTP:
            with translation.override(language):
                message = _otp_message % {"code": code}
                sms.send_message(phone=phone, message=message)
        else:
            logging.info("Skipping SMS OTP send, USE_TELEGRAM_FOR_OTP is True")
    else:
        raise NotImplementedError(f"Notification method {method} not implemented")
```

Template (bilingual UZ/RU):
```
Tasdiqlash kodi Lumi Pass (lumipass.uz) ilovasiga kirish uchun: %(code)s |
Kod podtverjdeniya dlya vhoda v prilojenie Lumi Pass (lumipass.uz): %(code)s
```

### HTTP entry point

`POST /api/v1/notifications/otp/` → `SendOTPNotificationView` (`src/apps/notification/api/views.py:15-69`)

1. Validates with `SendOTPSerializer` (phone ≤15, code 6 digits, method ∈ {sms}, type ∈ {otp}).
2. Persists `Notification` row (status=`pending`).
3. Enqueues Celery task `send_notification_task` with the notification id.

### Celery task

**File:** `src/apps/notification/tasks.py`

```python
class SendNotificationTask(Task):
    name = "send_notification_task"
    max_retries = 5

    def run(self, notification_id):
        n = Notification.objects.get(id=notification_id)
        if n.type == CONSTANTS.NotificationType.OTP:
            if n.payload.get("user_type", "") == "PARENT":
                otp.send_otp(phone=n.phone, code=n.code, method=n.method, language=n.language)
            telegram.send_message(n.to_dict())

    def on_success(self, *a, **kw):  # status=SENT, sent_at=now()
    def on_failure(self, *a, **kw):  # status=FAILED, failed_at=now()
```

## 8. End-to-End Flow

```
main-service
  └── POST /api/v1/notifications/otp/   (Bearer server-JWT)
       └── notification-service: SendOTPNotificationView
            ├── Notification row (pending)
            └── Celery: send_notification_task
                 └── otp.send_otp
                      └── sms.send_message
                           └── get_token()  → login / refresh if needed
                           └── POST https://notify.eskiz.uz/api/message/sms/send
                                Authorization: Bearer <eskiz-jwt>
```

## 9. Notification Model

**File:** `src/apps/notification/models.py`

```python
class Notification(TimestampedModel):
    id = UUIDField(primary_key=True, default=uuid.uuid4)
    phone = CharField(max_length=15, validators=[phone_number_validator])
    code = CharField(max_length=6)
    type = CharField(choices=NotificationType.CHOICES)          # otp | credential | ...
    language = CharField(choices=Language.CHOICES, default=RU)
    method = CharField(choices=NotificationMethod.CHOICES)      # sms | telegram | push
    status = CharField(choices=NotificationDeliveryStatus.CHOICES, default=PENDING)
    sent_at / failed_at / canceled_at = DateTimeField(null=True)
    payload = JSONField(null=True)
```

Lifecycle: `pending → sent | failed | canceled`.

## 10. Constants

**File:** `src/apps/core/utils/constants.py`

```python
NotificationType:     OTP, CREDENTIAL, SCHEDULE, PAYMENT, FISCAL   # IMPLEMENTED = [OTP]
NotificationMethod:   SMS, TELEGRAM, PUSH                          # IMPLEMENTED = [SMS]
Language:             EN, RU, UZ (default RU)
NotificationDeliveryStatus: PENDING, SENT, FAILED, CANCELED
```

## 11. Error Cases

| Where | Condition | Effect |
|---|---|---|
| `login()` | HTTP ≠ 200 | Raises, Celery retries (max 5) |
| `refresh_token()` | HTTP ≠ 200 | Raises, Celery retries |
| `_send_sms()` | HTTP ≠ 200 | Raises, notification marked `failed` |
| Response parse | Pydantic `ValidationError` | Logs raw response, raises |
| Serializer | Non-digit code / bad phone | 400 before queueing |

## 12. Dependencies (`pyproject.toml`)

`requests>=2.32.5`, `pydantic>=2.11.7`, `PyJWT` (via `djangorestframework-simplejwt`), `celery>=5.5.3`, `redis>=6.4.0`, `django>=5.2.4`, `python-decouple>=3.8`.

## 13. File Map

| Purpose | Path |
|---|---|
| Settings | `src/config/settings/base.py:184-188` |
| Eskiz config/token | `src/apps/notification/services/sms/config.py` |
| Eskiz send | `src/apps/notification/services/sms/functions.py` |
| Eskiz models | `src/apps/notification/services/sms/models.py` |
| HTTP client | `src/apps/core/utils/api_client.py` |
| OTP dispatcher | `src/apps/notification/services/otp/functions.py` |
| OTP API view | `src/apps/notification/api/views.py` |
| Serializer | `src/apps/notification/api/serializers.py` |
| Celery task | `src/apps/notification/tasks.py` |
| DB model | `src/apps/notification/models.py` |
| Constants | `src/apps/core/utils/constants.py` |
