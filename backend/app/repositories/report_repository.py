from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions.report import ReportAlreadyExistsError
from app.models.report import UserReport


def add(
    db: Session,
    reporter_user_id: int,
    reported_user_id: int,
    reason: str,
    detail: Optional[str] = None,
) -> UserReport:
    if exists(db, reporter_user_id, reported_user_id):
        raise ReportAlreadyExistsError()

    report = UserReport(
        reporter_user_id=reporter_user_id,
        reported_user_id=reported_user_id,
        reason=reason,
        detail=detail,
    )
    db.add(report)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ReportAlreadyExistsError() from None
    db.refresh(report)
    return report


def exists(db: Session, reporter_user_id: int, reported_user_id: int) -> bool:
    found = db.query(
        db.query(UserReport)
        .filter(
            UserReport.reporter_user_id == reporter_user_id,
            UserReport.reported_user_id == reported_user_id,
        )
        .exists()
    ).scalar()
    return bool(found)
