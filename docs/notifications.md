# Push Notifications

Staff can broadcast Expo push notifications to app users, reuse saved templates, and
review delivery history. This document reflects the system **as it is actually
implemented** (it supersedes the older `NOTIFICATION_*` and `BACKEND_NOTIFICATION_SETUP`
docs, which described features that were never shipped).

> The backend runs on **port 8002** (port 8001 is intentionally avoided). Adjust the
> host/port in the examples below to match your environment.

## Where it lives

**Backend** — Django app `accounts`:
- Models: [`backend/accounts/models.py`](../backend/accounts/models.py) — `NotificationHistory`, `NotificationTemplate`
- Views: [`backend/accounts/views.py`](../backend/accounts/views.py)
- URLs: [`backend/accounts/urls.py`](../backend/accounts/urls.py) (mounted under `/api/auth/`)
- Admin: [`backend/accounts/admin.py`](../backend/accounts/admin.py) (`NotificationHistory` only, read-only)
- Push helper: `backend/core/notifications.py` → `send_push_notification`

**Frontends:**
- **Web** (the fuller UI): `web/src/features/notifications/components/SendNotificationPage.tsx`, API client `web/src/lib/api/notifications.ts`
- **Mobile:** `mobile-app/src/screens/admin/AdminNotificationScreen.tsx`

## Audiences (`recipient_type`)

| Value | Targets |
|-------|---------|
| `all` | every device with a push token |
| `customers` | `user_type = customer` |
| `riders` | `user_type = delivery_boy` |
| `admins` | `is_staff`/superuser, or `user_type` in (`admin`, `staff`) |
| `test` | only the requesting admin's own device |
| `specific` | an explicit `user_ids` list in the request body |

The **web** UI exposes `all / customers / riders / admins`. The **mobile** UI exposes
`all / customers / riders` plus a **Test Mode** toggle (which sends as `test`).

## API

All endpoints require a **staff** user (`IsStaff`). Paths are under the `/api/auth/` prefix.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/admin/notifications/send/` | Send a notification |
| GET | `/api/auth/admin/notifications/history/` | List sent notifications (`?recipient_type=&limit=50`) |
| GET, POST | `/api/auth/admin/notifications/templates/` | List / create templates |
| GET, PUT, PATCH, DELETE | `/api/auth/admin/notifications/templates/<id>/` | Retrieve / update / delete a template |

**Send** body:

```json
{
  "title": "string (required)",
  "body": "string (required)",
  "recipient_type": "all | customers | riders | admins | test | specific",
  "image_url": "https://… (optional)",
  "scheduled_for": "ISO-8601 datetime (optional, accepted but NOT acted on — see caveats)",
  "user_ids": [1, 2, 3]
}
```

**Send** response: `{ "sent": <int>, "total_tokens": <int> }`

### curl examples

```bash
# Send a test notification (only reaches your own device)
curl -X POST http://localhost:8002/api/auth/admin/notifications/send/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Hello","recipient_type":"test"}'

# Fetch history
curl http://localhost:8002/api/auth/admin/notifications/history/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Models

### `NotificationHistory`

| Field | Type | Notes |
|-------|------|-------|
| `title` | CharField(200) | |
| `body` | TextField | |
| `recipient_type` | CharField(20) | one of the audience values above |
| `image_url` | URLField | optional |
| `sent_by` | FK(User) | `SET_NULL`, related_name `sent_notifications` |
| `sent_count` | Integer | successful sends |
| `total_devices` | Integer | targeted device count |
| `scheduled_for` | DateTime | nullable (see caveats) |
| `created_at` | DateTime | `auto_now_add` |
| `sent_at` | DateTime | nullable |

Property `success_rate` = `round(sent_count / total_devices * 100, 2)`. Ordered by `-created_at`.

### `NotificationTemplate`

`name` (CharField 120), `title` (CharField 200), `body` (TextField),
`recipient_type` (CharField 20), `created_by` (FK User, related_name
`notification_templates`), `created_at`, `updated_at`. Ordered by `-updated_at`.

Both models ship in migration
`backend/accounts/migrations/0008_notificationhistory_notificationtemplate.py` — it is
already applied, so **no `makemigrations` is needed** for a normal checkout.

## Templates: web vs mobile

- **Web** uses the server-backed template CRUD above (create / edit / delete / apply
  saved templates), plus quick-start presets, an emoji picker, a confirmation modal, and
  a phone preview.
- **Mobile** currently uses **6 built-in templates hard-coded** in the screen's
  `TEMPLATES` array (Special Offer, New Products, Order Update, Weekend Sale, Delivery
  Reminder, System Maintenance). It does **not** call the templates API.

## Mobile screen features

Compose / Templates / History tabs; Test Mode toggle; optional image URL; live preview;
character counters (title 80, body 300).

## Caveats / not implemented

- **Scheduling is not implemented.** `scheduled_for` is accepted by the model and the send
  endpoint, but nothing dispatches messages later — everything sends immediately. A real
  implementation would need Celery/Django-Q plus a periodic task. (The older docs and some
  leftover styles reference a date/time picker and `@react-native-community/datetimepicker`
  — neither exists in the app.)
- **Mobile "Save Draft"** is a stub button only.
- The **web** page keeps only session history in the browser; the persistent
  `/history/` endpoint is consumed by the mobile History tab.
- `NotificationTemplate` is **not** registered in the Django admin (only
  `NotificationHistory` is).
