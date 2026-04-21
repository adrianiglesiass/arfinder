from fastapi.encoders import jsonable_encoder
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.security import insforge

router = APIRouter(prefix="/auth/proxy", tags=["auth-proxy"])


class AuthLogin(BaseModel):
    email: EmailStr
    password: str


class AuthRegister(BaseModel):
    email: EmailStr
    password: str


class AuthVerify(BaseModel):
    email: EmailStr
    otp: str


class AuthResend(BaseModel):
    email: EmailStr


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
