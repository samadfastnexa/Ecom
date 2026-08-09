import requests
import json

def send_push_notification(token, title, body, data=None):
    if not token:
        return

    url = "https://exp.host/--/api/v2/push/send"
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "to": token,
        "title": title,
        "body": body,
        "data": data or {},
    }

    try:
        # timeout is load-bearing: this runs inside order-save paths, so a slow
        # Expo endpoint must never be able to hang an order save indefinitely.
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error sending push notification: {e}")
        return None
