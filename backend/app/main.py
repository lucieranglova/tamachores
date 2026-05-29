import os
import json
import random
from datetime import datetime, date, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from sqlalchemy import text, inspect as sa_inspect
from .database import get_db, engine
from . import models, schemas
from .auth import verify_password, get_password_hash, create_access_token, decode_token
from .push import send_push_notification, VAPID_PUBLIC_KEY

models.Base.metadata.create_all(bind=engine)

# Migrate: add max_per_period column if missing
with engine.connect() as _conn:
    _cols = [c["name"] for c in sa_inspect(engine).get_columns("chores")]
    if "max_per_period" not in _cols:
        _conn.execute(text("ALTER TABLE chores ADD COLUMN max_per_period INTEGER DEFAULT 1 NOT NULL"))
        _conn.commit()

app = FastAPI(title="TamaChores API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()


# ── WebSocket manager ────────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.connections:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


# ── Auth helpers ─────────────────────────────────────────────────────────────
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    username = decode_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Period helpers ───────────────────────────────────────────────────────────
def get_period_start(reset_type: str) -> datetime:
    now = datetime.utcnow()
    if reset_type == "daily":
        return datetime(now.year, now.month, now.day)
    elif reset_type == "weekly":
        monday = now.date() - timedelta(days=now.weekday())
        return datetime(monday.year, monday.month, monday.day)
    else:
        return datetime(now.year, now.month, 1)


def get_claims_in_period(chore: models.Chore, db: Session) -> list:
    period_start = get_period_start(chore.reset_type)
    return (
        db.query(models.Claim)
        .filter(models.Claim.chore_id == chore.id, models.Claim.claimed_at >= period_start)
        .all()
    )

def is_chore_full(chore: models.Chore, db: Session) -> bool:
    return len(get_claims_in_period(chore, db)) >= chore.max_per_period


def calc_spendable(user_id: int, db: Session) -> int:
    earned = sum(
        c.points_earned
        for c in db.query(models.Claim).filter(models.Claim.player_id == user_id).all()
    )
    spent = 0
    for r in db.query(models.Redemption).filter(models.Redemption.redeemed_by == user_id).all():
        reward = db.query(models.Reward).filter(models.Reward.id == r.reward_id).first()
        if reward:
            spent += reward.point_cost
    return earned - spent


# ── Startup seed ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    os.makedirs("data", exist_ok=True)
    db = next(get_db())

    for username, password in [("player1", "tamachores1"), ("player2", "tamachores2")]:
        if not db.query(models.User).filter(models.User.username == username).first():
            db.add(models.User(username=username, password_hash=get_password_hash(password)))
    db.commit()

    if db.query(models.Chore).filter(models.Chore.is_default == True).count() == 0:
        defaults = [
            ("Vysát obývák", 15, "daily", "vacuum"),
            ("Umýt nádobí", 10, "daily", "dishes"),
            ("Uklidit kuchyň", 12, "daily", "kitchen"),
            ("Vynést koš", 8, "daily", "trash"),
            ("Uvařit večeři", 20, "daily", "dinner"),
            ("Uvařit snídani", 10, "daily", "breakfast"),
            ("Zalít kytky", 6, "daily", "plants"),
            ("Utřít prach", 10, "weekly", "dust"),
            ("Vyprat prádlo", 12, "weekly", "laundry"),
            ("Pověsit prádlo", 10, "weekly", "hang_laundry"),
            ("Vyžehlit", 15, "weekly", "iron"),
            ("Uklidit WC", 15, "weekly", "toilet"),
            ("Uklidit koupelnu", 20, "weekly", "bathroom"),
            ("Vytřít podlahy", 18, "weekly", "mop"),
            ("Nakoupit potraviny", 20, "weekly", "groceries"),
            ("Odnést recyklaci", 8, "weekly", "recycling"),
            ("Umýt okna", 25, "monthly", "windows"),
            ("Vyčistit lednici", 20, "monthly", "fridge"),
            ("Uklidit sklep/úložiště", 20, "monthly", "storage"),
            ("Vyčistit troubu", 18, "monthly", "oven"),
        ]
        for name, pts, rtype, icon in defaults:
            db.add(
                models.Chore(
                    name=name, points=pts, reset_type=rtype, is_default=True, icon_key=icon
                )
            )
        db.commit()

    for user in db.query(models.User).all():
        if not db.query(models.Streak).filter(models.Streak.player_id == user.id).first():
            db.add(models.Streak(player_id=user.id))
    db.commit()


# ── Health ────────────────────────────────────────────────────────────────────
@router.get("/health")
def health():
    return {"ok": True}


# ── Auth routes ───────────────────────────────────────────────────────────────
@router.post("/auth/login", response_model=schemas.TokenResponse)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(user.username)
    return {"access_token": token, "token_type": "bearer", "username": user.username, "player_id": user.id}


@router.post("/auth/change-password")
def change_password(
    req: schemas.ChangePasswordRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Wrong current password")
    current_user.password_hash = get_password_hash(req.new_password)
    db.commit()
    return {"ok": True}


# ── Chore routes ──────────────────────────────────────────────────────────────
@router.get("/chores", response_model=List[schemas.ChoreResponse])
def list_chores(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    chores = db.query(models.Chore).filter(models.Chore.is_active == True).all()
    result = []
    for chore in chores:
        period_claims = get_claims_in_period(chore, db)
        last_claim = period_claims[-1] if period_claims else None
        claimer_name = None
        claimer_id = None
        claim_id = None
        if last_claim:
            u = db.query(models.User).filter(models.User.id == last_claim.player_id).first()
            claimer_name = u.username if u else None
            claimer_id = last_claim.player_id
            claim_id = last_claim.id
        result.append(
            schemas.ChoreResponse(
                id=chore.id,
                name=chore.name,
                points=chore.points,
                reset_type=chore.reset_type,
                is_default=chore.is_default,
                is_active=chore.is_active,
                icon_key=chore.icon_key,
                max_per_period=chore.max_per_period,
                claims_in_period=len(period_claims),
                claimed_by=claimer_name,
                claimed_by_id=claimer_id,
                claim_id=claim_id,
            )
        )
    return result


@router.post("/chores", response_model=schemas.ChoreResponse)
def create_chore(
    req: schemas.CustomChoreRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chore = models.Chore(
        name=req.name,
        points=req.points,
        reset_type=req.reset_type,
        is_default=False,
        is_active=True,
        icon_key=req.icon_key,
        max_per_period=max(1, req.max_per_period),
        created_by=current_user.id,
    )
    db.add(chore)
    db.commit()
    db.refresh(chore)
    return schemas.ChoreResponse(
        id=chore.id,
        name=chore.name,
        points=chore.points,
        reset_type=chore.reset_type,
        is_default=chore.is_default,
        is_active=chore.is_active,
        icon_key=chore.icon_key,
    )


@router.get("/chores/all")
def list_all_chores(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    chores = db.query(models.Chore).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "points": c.points,
            "reset_type": c.reset_type,
            "is_default": c.is_default,
            "is_active": c.is_active,
            "icon_key": c.icon_key,
            "max_per_period": c.max_per_period,
        }
        for c in chores
    ]


@router.patch("/chores/{chore_id}")
def update_chore(chore_id: int, req: schemas.UpdateChoreRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    chore = db.query(models.Chore).filter(models.Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")
    chore.max_per_period = max(1, req.max_per_period)
    db.commit()
    return {"id": chore_id, "max_per_period": chore.max_per_period}

@router.put("/chores/{chore_id}/toggle")
def toggle_chore(chore_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    chore = db.query(models.Chore).filter(models.Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")
    chore.is_active = not chore.is_active
    db.commit()
    return {"id": chore_id, "is_active": chore.is_active}


@router.delete("/chores/{chore_id}")
def delete_chore(chore_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    chore = db.query(models.Chore).filter(
        models.Chore.id == chore_id, models.Chore.is_default == False
    ).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Custom chore not found")
    db.delete(chore)
    db.commit()
    return {"ok": True}


# ── Claim routes ──────────────────────────────────────────────────────────────
@router.post("/claims", response_model=schemas.ClaimResponse)
async def claim_chore(
    req: schemas.ClaimRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chore = db.query(models.Chore).filter(
        models.Chore.id == req.chore_id, models.Chore.is_active == True
    ).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")

    if is_chore_full(chore, db):
        raise HTTPException(status_code=409, detail="Already claimed this period")

    five_min_ago = datetime.utcnow() - timedelta(minutes=5)
    recent = (
        db.query(models.Claim)
        .filter(models.Claim.player_id == current_user.id, models.Claim.claimed_at >= five_min_ago)
        .count()
    )
    combo_mult = 3.0 if recent >= 5 else (2.0 if recent >= 3 else 1.0)
    is_crit = random.random() < 0.08
    crit_mult = 2.0 if is_crit else 1.0
    streak = db.query(models.Streak).filter(models.Streak.player_id == current_user.id).first()
    streak_mult = 1.2 if (streak and streak.streak_bonus_active) else 1.0
    points_earned = int(chore.points * combo_mult * crit_mult * streak_mult)

    claim = models.Claim(
        chore_id=chore.id,
        player_id=current_user.id,
        points_earned=points_earned,
        is_crit=is_crit,
        combo_mult=combo_mult,
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    await _check_and_update_streak(current_user.id, db)
    total_points = calc_spendable(current_user.id, db)

    partner = db.query(models.User).filter(models.User.id != current_user.id).first()
    if partner and partner.push_subscription:
        send_push_notification(
            partner.push_subscription,
            title="TamaChores 🐣",
            body=f"Partner splnil: {chore.name} +{points_earned}pts!",
            data={"chore_id": chore.id, "points": points_earned},
        )

    await manager.broadcast(
        {
            "type": "chore_claimed",
            "chore_id": chore.id,
            "player_id": current_user.id,
            "username": current_user.username,
            "points_earned": points_earned,
            "is_crit": is_crit,
            "combo_mult": combo_mult,
        }
    )

    return schemas.ClaimResponse(
        claim_id=claim.id,
        chore_name=chore.name,
        points_earned=points_earned,
        is_crit=is_crit,
        combo_mult=combo_mult,
        total_points=total_points,
    )


async def _check_and_update_streak(player_id: int, db: Session):
    today = date.today()
    period_start = datetime(today.year, today.month, today.day)
    active_daily_ids = [
        c.id
        for c in db.query(models.Chore).filter(
            models.Chore.reset_type == "daily", models.Chore.is_active == True
        ).all()
    ]
    if not active_daily_ids:
        return
    done_count = (
        db.query(models.Claim)
        .filter(
            models.Claim.player_id == player_id,
            models.Claim.claimed_at >= period_start,
            models.Claim.chore_id.in_(active_daily_ids),
        )
        .count()
    )
    streak = db.query(models.Streak).filter(models.Streak.player_id == player_id).first()
    if not streak:
        return
    if done_count >= len(active_daily_ids):
        yesterday = today - timedelta(days=1)
        if streak.last_completed_date == yesterday:
            streak.current_streak += 1
        elif streak.last_completed_date != today:
            streak.current_streak = 1
        streak.last_completed_date = today
        streak.streak_bonus_active = True
    else:
        if streak.last_completed_date and streak.last_completed_date < today:
            streak.streak_bonus_active = False
    db.commit()


# ── Stats routes ──────────────────────────────────────────────────────────────
@router.get("/stats", response_model=schemas.StatsResponse)
def get_stats(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.id).all()
    today = date.today()

    def make_stats(user: models.User) -> schemas.PlayerStats:
        all_claims = db.query(models.Claim).filter(models.Claim.player_id == user.id).all()
        today_start = datetime(today.year, today.month, today.day)
        week_start = today_start - timedelta(days=today.weekday())
        today_pts = sum(c.points_earned for c in all_claims if c.claimed_at >= today_start)
        week_pts = sum(c.points_earned for c in all_claims if c.claimed_at >= week_start)
        total_pts = sum(c.points_earned for c in all_claims)
        spendable = calc_spendable(user.id, db)
        daily_pts = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            ds = datetime(d.year, d.month, d.day)
            de = ds + timedelta(days=1)
            daily_pts.append(sum(c.points_earned for c in all_claims if ds <= c.claimed_at < de))
        streak = db.query(models.Streak).filter(models.Streak.player_id == user.id).first()
        return schemas.PlayerStats(
            username=user.username,
            player_id=user.id,
            total_points=total_pts,
            spendable_points=spendable,
            today_points=today_pts,
            week_points=week_pts,
            current_streak=streak.current_streak if streak else 0,
            streak_bonus_active=streak.streak_bonus_active if streak else False,
            daily_points=daily_pts,
        )

    p1 = next((u for u in users if u.username == "player1"), users[0])
    p2 = next((u for u in users if u.username == "player2"), users[1] if len(users) > 1 else users[0])
    days_labels = [(today - timedelta(days=i)).strftime("%a") for i in range(6, -1, -1)]
    return schemas.StatsResponse(player1=make_stats(p1), player2=make_stats(p2), days_labels=days_labels)


# ── Reward routes ─────────────────────────────────────────────────────────────
@router.get("/rewards", response_model=List[schemas.RewardResponse])
def list_rewards(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Reward).all()


@router.post("/rewards", response_model=schemas.RewardResponse)
def create_reward(req: schemas.RewardRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    reward = models.Reward(name=req.name, point_cost=req.point_cost, created_by=current_user.id)
    db.add(reward)
    db.commit()
    db.refresh(reward)
    return reward


@router.delete("/rewards/{reward_id}")
def delete_reward(reward_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    reward = db.query(models.Reward).filter(models.Reward.id == reward_id).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    db.delete(reward)
    db.commit()
    return {"ok": True}


@router.post("/rewards/{reward_id}/redeem")
def redeem_reward(reward_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    reward = db.query(models.Reward).filter(models.Reward.id == reward_id).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    if calc_spendable(current_user.id, db) < reward.point_cost:
        raise HTTPException(status_code=400, detail="Insufficient points")
    db.add(models.Redemption(reward_id=reward_id, redeemed_by=current_user.id))
    db.commit()
    return {"ok": True, "points_spent": reward.point_cost}


# ── User routes ───────────────────────────────────────────────────────────────
@router.get("/users/me")
def get_me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    all_claims = db.query(models.Claim).filter(models.Claim.player_id == current_user.id).all()
    total_pts = sum(c.points_earned for c in all_claims)
    spendable = calc_spendable(current_user.id, db)
    streak = db.query(models.Streak).filter(models.Streak.player_id == current_user.id).first()
    return {
        "id": current_user.id,
        "username": current_user.username,
        "total_points": total_pts,
        "spendable_points": spendable,
        "current_streak": streak.current_streak if streak else 0,
        "streak_bonus_active": streak.streak_bonus_active if streak else False,
    }


@router.put("/users/push-subscription")
def update_push_sub(
    req: schemas.PushSubscriptionRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.push_subscription = json.dumps(req.subscription)
    db.commit()
    return {"ok": True}


@router.get("/vapid-public-key")
def get_vapid_key():
    return {"public_key": VAPID_PUBLIC_KEY}


# ── Mount router + WebSocket + static ────────────────────────────────────────
app.include_router(router, prefix="/api")


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Serve built frontend (production only — not present in dev)
_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
