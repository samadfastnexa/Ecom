# Push Notification Page Enhancements

## Overview
The Admin Notification Screen has been significantly enhanced with new features for better control, organization, and tracking of push notifications.

## New Features

### 1. **Tab Navigation**
- **Compose Tab**: Create and send notifications
- **Templates Tab**: Quick access to pre-defined message templates
- **History Tab**: View all sent notifications with delivery statistics

### 2. **Test Mode**
- Send test notifications to yourself before broadcasting
- Toggle test mode with a single tap
- Useful for previewing how notifications appear on devices

### 3. **Message Templates**
Pre-configured templates for common scenarios:
- Special Offer Alert
- New Products Available
- Order Update
- Weekend Sale
- Delivery Reminder
- System Maintenance

Templates include:
- Pre-written titles and messages
- Category tags
- Relevant icons
- One-tap application to composer

### 4. **Scheduled Notifications**
- Schedule notifications for future delivery
- Date and time picker for precise scheduling
- Visual indication of scheduled time
- Helpful for planning campaigns in advance

### 5. **Rich Notifications**
- Support for image URLs
- Visual preview of notifications with images
- Enhanced notification appearance on user devices

### 6. **Quick Actions**
- **Test Mode**: Quickly enable/disable test sending
- **Use Template**: Fast access to template library
- **Save Draft**: Save work in progress (coming soon)

### 7. **Enhanced Preview**
- Real-time preview of notifications as you type
- Shows exactly how the notification will appear
- Includes image placeholder when URL is provided
- Character counters for title (80) and message (300)

### 8. **Notification History**
- Complete log of all sent notifications
- Key metrics for each notification:
  - Title and message
  - Recipient type (Everyone/Customers/Riders)
  - Devices reached (sent/total)
  - Success rate percentage
  - Date sent
- Pull-to-refresh for latest data

### 9. **Improved UX**
- Color-coded recipient types
- Visual feedback for all interactions
- Loading states for better user experience
- Error handling with user-friendly messages
- Confirmation dialogs for all send actions

## Technical Implementation

### New Dependencies
- `@react-native-community/datetimepicker`: For scheduling notifications

### State Management
Enhanced component state includes:
- Active tab management
- Schedule settings
- Test mode toggle
- Template modal visibility
- History data with loading states

### API Integration
The component expects the following backend endpoints:
- `POST /auth/admin/notifications/send/` - Send notifications
  - Supports `recipient_type`: 'all', 'customers', 'riders', 'test'
  - Optional `image_url` for rich notifications
  - Optional `scheduled_for` for future delivery
  
- `GET /auth/admin/notifications/history/` - Fetch notification history
  - Returns array of sent notifications with metadata

## Usage Instructions

### Sending a Basic Notification
1. Navigate to **Compose** tab
2. Select recipient type (Everyone/Customers/Riders)
3. Enter notification title and message
4. Review in preview section
5. Tap "Send to [Recipients]"

### Using Templates
1. Navigate to **Templates** tab
2. Browse available templates
3. Tap a template to apply it
4. Automatically switches to Compose tab
5. Edit as needed and send

### Sending Test Notifications
1. In Compose tab, tap **Test Mode** button
2. Compose your message
3. Tap "Send Test"
4. Notification is sent only to your device

### Scheduling Notifications
1. In Compose tab, toggle **Schedule for later**
2. Tap date/time button
3. Select desired date and time
4. Compose message
5. Tap "Schedule Notification"

### Adding Images
1. In message composer, scroll to "Image URL" field
2. Enter valid image URL
3. Preview shows placeholder
4. Send as normal

### Viewing History
1. Navigate to **History** tab
2. View all sent notifications
3. See delivery statistics for each
4. Pull down to refresh

## Best Practices

### Message Guidelines
- **Title**: Keep under 50 characters for best display
- **Message**: Keep under 200 characters for full visibility
- **Images**: Use 2:1 aspect ratio (e.g., 1200x600px)
- **URLs**: Use HTTPS for images

### Testing Before Broadcast
1. Always use Test Mode first
2. Verify message appearance
3. Check image rendering
4. Confirm call-to-action clarity

### Template Usage
- Customize templates for your brand voice
- Update placeholders (e.g., [date]) before sending
- Create new templates for recurring campaigns

### Scheduling Tips
- Schedule at optimal engagement times
- Consider user time zones
- Allow buffer time for review
- Test scheduled notifications first

## Future Enhancements

Planned features for future releases:
- **Draft Management**: Save and restore incomplete messages
- **User Segmentation**: Target by location, purchase history, etc.
- **A/B Testing**: Test different messages with user segments
- **Analytics Dashboard**: Detailed open rates and engagement metrics
- **Action Buttons**: Add buttons with deep links
- **Multi-language Support**: Send in user's preferred language
- **Recurring Notifications**: Set up repeating schedules
- **Custom Sound**: Choose notification sounds
- **Priority Levels**: Set notification importance

## Backend Requirements

The backend should support:

### Send Endpoint
```python
POST /auth/admin/notifications/send/
Body: {
  "title": string,
  "body": string,
  "recipient_type": "all" | "customers" | "riders" | "test",
  "image_url": string? (optional),
  "scheduled_for": ISO8601 datetime? (optional)
}
Response: {
  "sent": number,
  "total_tokens": number
}
```

### History Endpoint
```python
GET /auth/admin/notifications/history/
Response: [{
  "id": number,
  "title": string,
  "body": string,
  "recipient_type": string,
  "sent_count": number,
  "total_devices": number,
  "created_at": ISO8601 datetime,
  "scheduled_for": ISO8601 datetime? (optional)
}]
```

## Installation

After updating the code:

```bash
cd mobile-app
npm install
# or
yarn install
```

For Expo projects:
```bash
npx expo install @react-native-community/datetimepicker
```

## Troubleshooting

### DateTimePicker not working
- Ensure package is installed: `npm ls @react-native-community/datetimepicker`
- Rebuild app if using bare React Native
- Check platform-specific setup in package documentation

### History not loading
- Verify backend endpoint is accessible
- Check authentication token is valid
- Ensure history endpoint returns correct JSON structure

### Images not displaying in notifications
- Confirm image URLs are publicly accessible
- Use HTTPS URLs only
- Check image file size (keep under 1MB)
- Verify Expo push notification image support

## Support

For issues or questions:
1. Check this documentation
2. Review backend API logs
3. Test with simpler notifications first
4. Verify device push notification permissions
