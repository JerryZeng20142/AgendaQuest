from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from database import get_db
from models import User, UserSettings
from schemas import LoginRequest, SessionResponse, UserResponse, OnboardingRequest
from auth import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter()


def user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        displayName=user.display_name,
        avatarUrl=user.avatar_url,
        onboardingCompleted=user.onboarding_completed,
        onboardingSettings=user.onboarding_settings
    )


@router.post("/login", response_model=SessionResponse)
async def login(
    response: Response,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # Find user
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    # Set cookie with secure defaults for HTTPS; allow HTTP for local dev
    import os
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=bool(os.environ.get("HTTPS", False)),
        samesite="lax",
        max_age=86400,
        path="/",
    )
    
    return SessionResponse(
        user=user_to_response(user),
        authenticatedAt=datetime.utcnow().isoformat() + "Z"
    )


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out successfully"}


@router.get("/session", response_model=SessionResponse | None)
async def get_session(
    user: User = Depends(get_current_user)
):
    return SessionResponse(
        user=user_to_response(user),
        authenticatedAt=datetime.utcnow().isoformat() + "Z"
    )


@router.post("/onboarding/complete", response_model=SessionResponse)
async def complete_onboarding(
    onboarding_data: OnboardingRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user.onboarding_completed = True
    user.onboarding_settings = onboarding_data.model_dump()
    
    await db.commit()
    await db.refresh(user)
    
    return SessionResponse(
        user=user_to_response(user),
        authenticatedAt=datetime.utcnow().isoformat() + "Z"
    )


# Alias for /onboarding prefix
@router.post("/complete", response_model=SessionResponse)
async def complete_onboarding_alias(
    onboarding_data: OnboardingRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await complete_onboarding(onboarding_data, user, db)
