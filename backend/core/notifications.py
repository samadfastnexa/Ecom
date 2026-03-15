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
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error sending push notification: {e}")
        return None
