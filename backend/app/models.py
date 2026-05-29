from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Date, Text
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    push_subscription = Column(Text, nullable=True)

class Chore(Base):
    __tablename__ = "chores"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    points = Column(Integer, nullable=False)
    reset_type = Column(String, nullable=False)  # daily / weekly / monthly
    is_default = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    icon_key = Column(String, default="default")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

class Claim(Base):
    __tablename__ = "claims"
    id = Column(Integer, primary_key=True, index=True)
    chore_id = Column(Integer, ForeignKey("chores.id"))
    player_id = Column(Integer, ForeignKey("users.id"))
    claimed_at = Column(DateTime, default=datetime.utcnow)
    points_earned = Column(Integer)
    is_crit = Column(Boolean, default=False)
    combo_mult = Column(Float, default=1.0)

class Reward(Base):
    __tablename__ = "rewards"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    point_cost = Column(Integer, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))

class Redemption(Base):
    __tablename__ = "redemptions"
    id = Column(Integer, primary_key=True, index=True)
    reward_id = Column(Integer, ForeignKey("rewards.id"))
    redeemed_by = Column(Integer, ForeignKey("users.id"))
    redeemed_at = Column(DateTime, default=datetime.utcnow)

class Streak(Base):
    __tablename__ = "streaks"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("users.id"), unique=True)
    current_streak = Column(Integer, default=0)
    last_completed_date = Column(Date, nullable=True)
    streak_bonus_active = Column(Boolean, default=False)
