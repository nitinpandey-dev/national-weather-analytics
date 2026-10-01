from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.db.models import User
from app.db.schemas import UserLogin, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

DEMO_USERS = [
    {"username": "admin", "password": "adminpassword123", "role": "admin", "full_name": "Chief Meteorological Officer", "email": "admin@weather.gov.in"},
    {"username": "moderator", "password": "moderatorpassword123", "role": "moderator", "full_name": "Regional Verification Officer", "email": "moderator@weather.gov.in"},
    {"username": "analyst", "password": "analystpassword123", "role": "analyst", "full_name": "Senior Weather Analyst", "email": "analyst@weather.gov.in"},
    {"username": "viewer", "password": "viewerpassword123", "role": "viewer", "full_name": "Public Citizen Observer", "email": "viewer@weather.gov.in"},
]

def init_demo_users(db: Session):
    for u in DEMO_USERS:
        existing = db.query(User).filter(User.username == u["username"]).first()
        if not existing:
            new_u = User(
                username=u["username"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
                full_name=u["full_name"],
                is_active=True
            )
            db.add(new_u)
    db.commit()

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    # Auto-seed demo users if not yet created
    init_demo_users(db)
    
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={
        "sub": user.username,
        "role": user.role,
        "name": user.full_name,
        "id": user.id
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "full_name": user.full_name,
            "email": user.email
        }
    }

@router.get("/me")
def get_current_user_profile(user: dict = Depends(get_current_user)):
    return user
