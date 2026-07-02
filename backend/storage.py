"""Document storage abstraction — local disk for dev, S3 for AWS production."""

import os
import logging
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException

logger = logging.getLogger("lexcase.storage")

ROOT_DIR = Path(__file__).parent
STORAGE_BACKEND = os.environ.get("STORAGE_BACKEND", "local").lower()
S3_BUCKET = os.environ.get("S3_BUCKET_NAME", "")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
APP_NAME = os.environ.get("APP_NAME", "lexcase")

LOCAL_STORAGE_DIR = os.environ.get("STORAGE_DIR", str(ROOT_DIR / "storage"))
_s3_client = None


def init_storage() -> None:
    global _s3_client
    if STORAGE_BACKEND == "s3":
        if not S3_BUCKET:
            raise ValueError("S3_BUCKET_NAME is required when STORAGE_BACKEND=s3")
        _s3_client = boto3.client("s3", region_name=AWS_REGION)
        logger.info("Storage backend: S3 (bucket=%s)", S3_BUCKET)
    else:
        os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)
        logger.info("Storage backend: local (%s)", LOCAL_STORAGE_DIR)


def build_storage_path(case_id: str | None, user_id: str, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    import uuid

    uid = str(uuid.uuid4())
    if case_id:
        return f"{APP_NAME}/cases/{case_id}/{uid}.{ext}"
    return f"{APP_NAME}/uploads/{user_id}/{uid}.{ext}"


def put_object(path: str, data: bytes, content_type: str) -> dict:
    if STORAGE_BACKEND == "s3":
        try:
            _s3_client.put_object(
                Bucket=S3_BUCKET,
                Key=path,
                Body=data,
                ContentType=content_type or "application/octet-stream",
                ServerSideEncryption="AES256",
            )
        except ClientError as exc:
            logger.exception("S3 put_object failed")
            raise HTTPException(status_code=500, detail="Failed to store document") from exc
        return {"path": path, "size": len(data)}

    full_path = os.path.join(LOCAL_STORAGE_DIR, path.replace("/", "_"))
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "wb") as f:
        f.write(data)
    return {"path": path, "size": len(data)}


def get_object(path: str) -> tuple[bytes, str]:
    if STORAGE_BACKEND == "s3":
        try:
            response = _s3_client.get_object(Bucket=S3_BUCKET, Key=path)
            data = response["Body"].read()
            content_type = response.get("ContentType", "application/octet-stream")
            return data, content_type
        except ClientError as exc:
            if exc.response["Error"]["Code"] in ("NoSuchKey", "404"):
                raise HTTPException(status_code=404, detail="File not found") from exc
            logger.exception("S3 get_object failed")
            raise HTTPException(status_code=500, detail="Failed to retrieve document") from exc

    full_path = os.path.join(LOCAL_STORAGE_DIR, path.replace("/", "_"))
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    with open(full_path, "rb") as f:
        return f.read(), "application/octet-stream"


def delete_object(path: str) -> None:
    if STORAGE_BACKEND == "s3":
        try:
            _s3_client.delete_object(Bucket=S3_BUCKET, Key=path)
        except ClientError:
            logger.exception("S3 delete_object failed")
        return

    full_path = os.path.join(LOCAL_STORAGE_DIR, path.replace("/", "_"))
    if os.path.exists(full_path):
        os.remove(full_path)