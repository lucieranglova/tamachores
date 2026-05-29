import os
import json
import logging
from pywebpush import webpush, WebPushException

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS = {"sub": "mailto:tamachores@example.com"}

logger = logging.getLogger(__name__)

def send_push_notification(subscription_json: str, title: str, body: str, data: dict = None):
    if not VAPID_PRIVATE_KEY or not subscription_json:
        return
    try:
        subscription = json.loads(subscription_json)
        payload = json.dumps({"title": title, "body": body, "data": data or {}})
        webpush(
            subscription_info=subscription,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS,
        )
    except WebPushException as e:
        logger.warning(f"Push failed: {e}")
    except Exception as e:
        logger.warning(f"Push error: {e}")
