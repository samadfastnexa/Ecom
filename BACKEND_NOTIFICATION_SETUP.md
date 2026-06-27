# Backend Setup for Push Notification Enhancements

This guide covers the backend changes needed to support the enhanced push notification features.

## Changes Made

### 1. New Model: NotificationHistory

Added to `backend/accounts/models.py`:
- Stores history of all sent notifications
- Tracks delivery statistics
- Supports scheduled notifications (future feature)
- Records sender, recipients, and success rates

### 2. Enhanced Views

**AdminSendNotificationView** (`backend/accounts/views.py`):
- Added support for test mode (`recipient_type='test'`)
- Added support for image URLs (`image_url` field)
- Added support for scheduled notifications (`scheduled_for` field)
- Saves notification history automatically
- Better error handling and responses

**AdminNotificationHistoryView** (new):
- Returns list of sent notifications
- Includes statistics and metadata
- Supports filtering by recipient type
- Configurable result limit

### 3. Updated URLs

Added to `backend/accounts/urls.py`:
```python
path('admin/notifications/history/', AdminNotificationHistoryView.as_view(), name='admin-notification-history'),
```

### 4. Admin Interface

Added NotificationHistory admin:
- View all sent notifications
- Color-coded success rates
- Read-only (prevents manual editing)
- Search and filter capabilities

## Installation Steps

### Step 1: Create Database Migration

```bash
cd backend
python manage.py makemigrations accounts
```

This will create a migration file for the NotificationHistory model.

### Step 2: Apply Migration

```bash
python manage.py migrate accounts
```

### Step 3: Verify Changes

Check that the migration was successful:

```bash
python manage.py shell
```

```python
from accounts.models import NotificationHistory
print(NotificationHistory._meta.fields)
```

### Step 4: Test the API

#### Send a Test Notification
```bash
curl -X POST http://localhost:8000/api/auth/admin/notifications/send/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test",
    "recipient_type": "test"
  }'
```

#### Get Notification History
```bash
curl http://localhost:8000/api/auth/admin/notifications/history/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## API Reference

### POST /api/auth/admin/notifications/send/

Send a push notification to users.

**Request Body:**
```json
{
  "title": "Notification Title",
  "body": "Notification message",
  "recipient_type": "all",  // "all", "customers", "riders", "test"
  "image_url": "https://example.com/image.png",  // optional
  "scheduled_for": "2026-06-22T10:00:00Z"  // optional (not yet implemented)
}
```

**Response:**
```json
{
  "sent": 42,
  "total_tokens": 50,
  "message": "Notifications sent successfully"
}
```

**Test Mode:**
```json
{
  "title": "Test",
  "body": "Test message",
  "recipient_type": "test"
}
```
Sends only to the authenticated admin user.

### GET /api/auth/admin/notifications/history/

Get notification history.

**Query Parameters:**
- `recipient_type` (optional): Filter by recipient type
- `limit` (optional, default: 50): Maximum number of results

**Response:**
```json
[
  {
    "id": 1,
    "title": "Special Offer",
    "body": "Get 20% off today!",
    "recipient_type": "all",
    "image_url": "https://example.com/offer.png",
    "sent_count": 42,
    "total_devices": 50,
    "success_rate": 84.0,
    "scheduled_for": null,
    "created_at": "2026-06-21T10:00:00Z",
    "sent_at": "2026-06-21T10:00:05Z",
    "sent_by": "admin"
  }
]
```

## Model Schema

### NotificationHistory

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| title | CharField(200) | Notification title |
| body | TextField | Notification message |
| recipient_type | CharField(20) | Target audience |
| image_url | URLField | Optional image URL |
| sent_by | ForeignKey(User) | Admin who sent it |
| sent_count | Integer | Successful sends |
| total_devices | Integer | Target device count |
| scheduled_for | DateTimeField | Scheduled send time |
| created_at | DateTimeField | Creation timestamp |
| sent_at | DateTimeField | Actual send time |

### Properties

- `success_rate`: Calculated percentage (sent_count/total_devices * 100)

## Admin Interface

Access the NotificationHistory admin at:
`http://localhost:8000/admin/accounts/notificationhistory/`

Features:
- List view with statistics
- Color-coded success rates
- Search by title, body, or sender
- Filter by recipient type and date
- Read-only (cannot edit sent notifications)

## Scheduled Notifications (Future)

The model and API support scheduled notifications, but the actual scheduling implementation requires:

1. **Celery or Django Q** for task scheduling
2. **Background job** to check and send scheduled notifications
3. **Cron job** or periodic task to process pending notifications

Example implementation (to be added):

```python
# tasks.py
from celery import shared_task
from django.utils import timezone
from accounts.models import NotificationHistory
from core.notifications import send_push_notification

@shared_task
def send_scheduled_notifications():
    now = timezone.now()
    pending = NotificationHistory.objects.filter(
        scheduled_for__lte=now,
        sent_at__isnull=True
    )
    
    for notification in pending:
        # Send notification logic here
        notification.sent_at = now
        notification.save()
```

## Troubleshooting

### Migration Issues

If you encounter migration conflicts:

```bash
python manage.py migrate accounts --fake
python manage.py makemigrations accounts
python manage.py migrate accounts
```

### History Not Showing

1. Check that notifications are being sent successfully
2. Verify the view has proper authentication
3. Check Django logs for errors:
```bash
python manage.py runserver --verbosity 2
```

### Test Mode Not Working

1. Ensure the admin user has an `expo_push_token` in their profile
2. Check that the device is registered
3. Test with a direct send first

## Security Considerations

1. **Authentication**: All endpoints require staff authentication
2. **Permissions**: Only staff/admin users can send notifications
3. **Rate Limiting**: Consider adding rate limiting to prevent spam
4. **Audit Trail**: All sends are logged with sender information
5. **Read-Only History**: Past notifications cannot be edited

## Performance Optimization

For large user bases:

1. **Batch Sending**: Send in chunks of 100 tokens
2. **Async Processing**: Use Celery for large broadcasts
3. **Caching**: Cache user token queries
4. **Indexing**: Add indexes on `created_at` and `recipient_type`

Example optimization:

```python
# In views.py
from django.core.cache import cache

# Cache token lists
cache_key = f'push_tokens_{recipient_type}'
tokens = cache.get(cache_key)
if not tokens:
    tokens = list(qs.values_list('expo_push_token', flat=True))
    cache.set(cache_key, tokens, 300)  # Cache for 5 minutes
```

## Testing

### Unit Tests

Create tests in `backend/accounts/tests.py`:

```python
from django.test import TestCase
from django.contrib.auth.models import User
from accounts.models import NotificationHistory

class NotificationHistoryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='admin',
            password='testpass',
            is_staff=True
        )
    
    def test_notification_creation(self):
        notification = NotificationHistory.objects.create(
            title='Test',
            body='Test message',
            recipient_type='all',
            sent_by=self.user,
            sent_count=10,
            total_devices=10
        )
        self.assertEqual(notification.success_rate, 100.0)
    
    def test_api_send(self):
        # Add API tests here
        pass
```

Run tests:
```bash
python manage.py test accounts.tests.NotificationHistoryTests
```

## Next Steps

1. **Install frontend dependencies**: 
   ```bash
   cd mobile-app
   npm install
   ```

2. **Test the enhanced UI**: Open the app and navigate to Admin > Notifications

3. **Configure Scheduled Notifications**: If needed, set up Celery

4. **Monitor Usage**: Check the admin interface regularly for delivery statistics

## Support

For issues:
1. Check backend logs: `python manage.py runserver`
2. Verify database migrations are applied
3. Test API endpoints with curl/Postman
4. Check mobile app console for errors
