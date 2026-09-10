from datetime import date
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from app.models.profile import Profile, ScheduleEnum, TypeEnum
from app.schemas.profile import ProfileCreate, ProfileUpdate


def get_profile_by_user_id(db: Session, user_id: int) -> Profile | None:
    return db.query(Profile).filter(Profile.user_id == user_id).first()


def create_profile(db: Session, user_id: int, data: ProfileCreate) -> Profile:
    profile = Profile(user_id=user_id, **data.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_profile(db: Session, profile: Profile, data: ProfileUpdate) -> Profile:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


def delete_profile(db: Session, profile: Profile):
    db.delete(profile)
    db.commit()


def get_profile_by_id(db: Session, profile_id: int):
    return (
        db.query(Profile)
        .options(joinedload(Profile.photos))
        .filter(Profile.id == profile_id)
        .first()
    )


def search_profiles(
    db: Session,
    city: str | None = None,
    budget_max: int | None = None,
    has_pets: bool | None = None,
    is_smoker: bool | None = None,
    schedule: ScheduleEnum | None = None,
    profile_type: TypeEnum | None = None,
    gender: str | None = None,
    age_min: int | None = None,
    age_max: int | None = None,
    available_from: date | None = None,
    skip: int = 0,
    limit: int = 20,
    exclude_user_id: int | None = None,
    exclude_user_ids: list[int] | None = None,
) -> list[Profile]:

    q = db.query(Profile).options(joinedload(Profile.photos))

    if exclude_user_id is not None:
        q = q.filter(Profile.user_id != exclude_user_id)
    if exclude_user_ids:
        q = q.filter(~Profile.user_id.in_(exclude_user_ids))
    if city:
        q = q.filter(Profile.city.ilike(f"%{city}%"))
    if budget_max is not None:
        q = q.filter(Profile.max_budget <= budget_max)
    if has_pets is not None:
        q = q.filter(Profile.has_pets == has_pets)
    if is_smoker is not None:
        q = q.filter(Profile.is_smoker == is_smoker)
    if schedule is not None:
        q = q.filter(Profile.schedule == schedule)
    if profile_type is not None:
        q = q.filter(Profile.type == profile_type)
    if gender:
        q = q.filter(Profile.gender.ilike(f"%{gender}%"))
    if age_min is not None:
        q = q.filter(Profile.age >= age_min)
    if age_max is not None:
        q = q.filter(Profile.age <= age_max)
    if available_from is not None:
        q = q.filter(
            or_(
                Profile.available_from.is_(None),
                Profile.available_from <= available_from,
            )
        )

    return q.order_by(Profile.id.desc()).offset(skip).limit(limit).all()


def get_profiles_by_user_ids(db: Session, target_user_ids: list[int]) -> list[Profile]:
    if not target_user_ids:
        return []
    rows = (
        db.query(Profile)
        .options(joinedload(Profile.photos))
        .filter(Profile.user_id.in_(target_user_ids))
        .all()
    )
    by_user = {row.user_id: row for row in rows}
    return [by_user[user_id] for user_id in target_user_ids if user_id in by_user]
