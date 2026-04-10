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
    return db.query(Profile).filter(Profile.id == profile_id).first()


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
    skip: int = 0,
    limit: int = 20,
) -> list[Profile]:

    q = db.query(Profile).options(joinedload(Profile.photos))

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

    return q.order_by(Profile.id.desc()).offset(skip).limit(limit).all()
