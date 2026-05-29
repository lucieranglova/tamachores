from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    display_name: Optional[str] = None
    player_id: int

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ChangeDisplayNameRequest(BaseModel):
    display_name: str

class ChoreResponse(BaseModel):
    id: int
    name: str
    points: int
    reset_type: str
    is_default: bool
    is_active: bool
    icon_key: str
    max_per_period: int = 1
    claims_in_period: int = 0
    claimed_by: Optional[str] = None
    claimed_by_id: Optional[int] = None
    claim_id: Optional[int] = None

    class Config:
        from_attributes = True

class ClaimRequest(BaseModel):
    chore_id: int

class ClaimResponse(BaseModel):
    claim_id: int
    chore_name: str
    points_earned: int
    is_crit: bool
    combo_mult: float
    total_points: int

class CustomChoreRequest(BaseModel):
    name: str
    points: int
    reset_type: str
    icon_key: str = "custom"
    max_per_period: int = 1

class UpdateChoreRequest(BaseModel):
    max_per_period: int

class RewardResponse(BaseModel):
    id: int
    name: str
    point_cost: int
    created_by: int

    class Config:
        from_attributes = True

class RewardRequest(BaseModel):
    name: str
    point_cost: int

class PlayerStats(BaseModel):
    username: str
    player_id: int
    total_points: int
    spendable_points: int
    today_points: int
    week_points: int
    current_streak: int
    streak_bonus_active: bool
    daily_points: List[int]

class StatsResponse(BaseModel):
    player1: PlayerStats
    player2: PlayerStats
    days_labels: List[str]

class PushSubscriptionRequest(BaseModel):
    subscription: dict
