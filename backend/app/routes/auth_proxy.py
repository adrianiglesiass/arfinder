from fastapi.encoders import jsonable_encoder
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.core.security import insforge
from app.core.rate_limit import rate_limiter

router = APIRouter(
    prefix="/auth/proxy", tags=["auth-proxy"], dependencies=[Depends(rate_limiter)]
)


class AuthLogin(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., max_length=128)


class AuthRegister(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class AuthVerify(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    otp: str = Field(..., min_length=1, max_length=10)


class AuthResend(BaseModel):
    email: EmailStr = Field(..., max_length=255)


@router.post("/login")
async def proxy_login(data: AuthLogin):
    try:
        response = await insforge.auth.sign_in_with_password(
            email=data.email, password=data.password
        )
        return {
            "accessToken": response.access_token,
            "refreshToken": response.refresh_token,
            "user": jsonable_encoder(response.user)
            if hasattr(response, "user")
            else None,
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/register")
async def proxy_register(data: AuthRegister):
    try:
        response = await insforge.auth.create_user(
            email=data.email, password=data.password
        )
        return {
            "accessToken": response.access_token,
            "refreshToken": response.refresh_token,
            "requireEmailVerification": response.require_email_verification,
            "user": jsonable_encoder(response.user) if response.user else None,
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/verify-email")
async def proxy_verify_email(data: AuthVerify):
    try:
        response = await insforge.auth.verify_email(email=data.email, otp=data.otp)
        return {
            "accessToken": response.access_token,
            "refreshToken": response.refresh_token,
            "user": jsonable_encoder(response.user) if response.user else None,
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/resend-verification")
async def proxy_resend_verification(data: AuthResend):
    try:
        await insforge.auth.send_email_verification(email=data.email)
        return {"status": "ok"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
