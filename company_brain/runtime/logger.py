from datetime import datetime, timezone


def log(message: str):
    ts = datetime.now(timezone.utc).isoformat()
    print(f"[{ts}] {message}")
