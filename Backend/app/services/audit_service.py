# Backend/app/services/audit_service.py: contains backend logic for the Animal Breed Registry System.
"""Centralized audit logging helpers.

Audit logging must never break the user action. These helpers swallow logging
errors while keeping the calling route clean and consistent.
"""

from __future__ import annotations
import json
import logging
from typing import Any
from sqlalchemy.orm import Session
from .. import models
from ..models import log_action

logger = logging.getLogger(__name__)

# Handles record action logic for this module.
def record_action(
    db: Session,
    *,
    actor_type: str,
    actor_id: int,
    actor_name: str | None,
    action: str,
    target_type: str | None = None,
    target_id: int | None = None,
    detail: dict[str, Any] | str | None = None,

) -> None:
    try:
        if isinstance(detail, dict):
            detail_value = json.dumps(detail, default=str)
        else:
            detail_value = detail
        log_action(
            db,
            actor_type=actor_type,
            actor_id=actor_id,
            actor_name=actor_name or "",
            action=action.upper(),
            target_type=target_type,
            target_id=target_id,
            detail=detail_value,
        )

    except Exception:
        logger.exception("audit record failed — suppressed")

# Handles list breeder logs logic for this module.
def list_breeder_logs(db: Session, *, breeder_id: int, limit: int = 50):
    return (
        db.query(models.AuditLog)
        .filter(models.AuditLog.actor_type == "breeder", models.AuditLog.actor_id == breeder_id)
        .order_by(models.AuditLog.created_at.desc(), models.AuditLog.id.desc())
        .limit(limit)
        .all()
    )
