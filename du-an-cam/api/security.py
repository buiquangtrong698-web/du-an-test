import base64
import hashlib
import hmac
import json
import os
import time


_PASSWORD_ITERATIONS = 310_000
_TOKEN_SECRET = os.getenv("SECRET_KEY", "change-this-development-secret")
_TOKEN_LIFETIME = 60 * 60 * 24 * 7


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PASSWORD_ITERATIONS
    )
    return f"{_PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        iterations, salt_hex, digest_hex = stored_hash.split("$", 2)
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def create_access_token(member_id: int) -> str:
    payload = json.dumps(
        {"sub": member_id, "exp": int(time.time()) + _TOKEN_LIFETIME},
        separators=(",", ":"),
    ).encode("utf-8")
    encoded = base64.urlsafe_b64encode(payload).rstrip(b"=")
    signature = hmac.new(_TOKEN_SECRET.encode("utf-8"), encoded, hashlib.sha256).digest()
    return f"{encoded.decode('ascii')}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode('ascii')}"


def read_access_token(token: str) -> int | None:
    try:
        encoded, signature = token.split(".", 1)
        expected = hmac.new(
            _TOKEN_SECRET.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256
        ).digest()
        supplied = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        if not hmac.compare_digest(expected, supplied):
            return None
        payload = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
        claims = json.loads(payload)
        if int(claims["exp"]) <= int(time.time()):
            return None
        return int(claims["sub"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None
