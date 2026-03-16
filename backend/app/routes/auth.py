from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserResponse
from app.services.auth_service import delete_user, login_user, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register(data: UserCreate, db: Session = Depends(get_db)):
    return register_user(db, data)


@router.post("/login", response_model=Token)
def login(data: UserCreate, db: Session = Depends(get_db)):
    token = login_user(db, data.email, data.password)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_user(db, current_user)
