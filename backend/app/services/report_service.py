from sqlalchemy.orm import Session

from app.core.exceptions.block import BlockAlreadyExistsError
from app.core.exceptions.report import ReportSelfError
from app.repositories import report_repository
from app.schemas.report import ReportCreate
from app.services import block_service, profile_service


def report_profile(
    db: Session, current_user_id: int, profile_id: int, payload: ReportCreate
) -> None:
    profile = profile_service.get_public_profile(db, profile_id)
    reported_user_id = profile.user_id
    if reported_user_id == current_user_id:
        raise ReportSelfError()

    report_repository.add(
        db,
        current_user_id,
        reported_user_id,
        payload.reason.value,
        payload.detail,
    )

    try:
        block_service.block_profile(db, current_user_id, profile_id)
    except BlockAlreadyExistsError:
        pass
