import http.server
import socketserver
import os
import json
import threading
import time
import random
import uuid as _uuid_mod
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs

# Import trending engine (starts background refresh thread)
try:
    import trending_engine as _te
    _HAS_TRENDING = True
except Exception as _te_err:
    print(f"[serve.py] trending_engine import failed: {_te_err}", flush=True)
    _HAS_TRENDING = False

try:
    import psycopg2
    _HAS_DB = True
except ImportError:
    _HAS_DB = False

DATABASE_URL = os.environ.get("DATABASE_URL", "")

BANTCREDIT_AGENT_WIN_REWARD = 50
BANTCREDIT_SIGNUP_REWARD = 5
BANTCREDIT_DAILY_CHECKIN_REWARD = 5
BANTCREDIT_REFERRED_REWARD = 30
BANTCREDIT_REFERRER_REWARD = 100
def query_db(sql, params=(), fetchone=False):
    if not _HAS_DB or not DATABASE_URL:
        return None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(sql, params)
        result = cur.fetchone() if fetchone else cur.fetchall()
        conn.close()
        return result
    except Exception as e:
        print(f"DB error: {e}", flush=True)

def execute_db(sql, params=()):
    if not _HAS_DB or not DATABASE_URL:
        return None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"DB execute error: {e}", flush=True)
        return False

def award_bantcredit(wallet, amount, tx_type, reference_id=""):
    """Award BantCredit and update the ledger and balance."""
    if not wallet or not _HAS_DB or not DATABASE_URL:
        return False
    
    # 1. Get user_id from wallet
    user = query_db("SELECT id FROM users WHERE LOWER(primary_wallet_address)=%s", (wallet.lower(),), fetchone=True)
    if not user:
        return False
    user_id = user[0]
    
    # 2. Insert into ledger
    execute_db(
        "INSERT INTO bantcredit_ledger (user_id, amount, transaction_type, reference_id) VALUES (%s, %s, %s, %s)",
        (user_id, amount, tx_type, reference_id)
    )
    
    # 3. Upsert balance
    # In postgres, ON CONFLICT requires a unique constraint. We assume user_id + wallet_address is unique.
    # Actually, we can just check if balance exists, or use ON CONFLICT
    execute_db(
        """
        INSERT INTO bantcredit_balances (user_id, wallet_address, balance, total_earned)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (wallet_address) DO UPDATE 
        SET balance = bantcredit_balances.balance + EXCLUDED.balance,
            total_earned = bantcredit_balances.total_earned + EXCLUDED.total_earned,
            updated_at = NOW()
        """,
        (user_id, wallet.lower(), amount, amount)
    )
    return True

def insert_pfp_battle_record(live):
    if not _HAS_DB or not DATABASE_URL:
        return
    battle_id = live.get("match_id") or live.get("id")
    started_at = live.get("started_at")
    ended_at = datetime.now(timezone.utc).isoformat()
    
    title = f"{live.get('fighter_a', {}).get('name', 'A')} vs {live.get('fighter_b', {}).get('name', 'B')}"
    arena_id = "pfp-arena"
    status = "resolved"
    winner_id = live.get("winner_id")
    loser_id = live.get("loser_id")
    
    # We construct a fake BantahBroAgentBattle side so the TS scripts can read it
    seed = f"{battle_id}:{started_at}"[:255]
    import re
    raw_key = f"{battle_id}:seed:{seed}:rounds:5:arena:{arena_id}"
    record_key = re.sub(r'[^a-zA-Z0-9:_-]', '-', raw_key)
    record_key = re.sub(r'-+', '-', record_key)[:360]
    
    fighters = json.dumps([live.get("fighter_a", {}), live.get("fighter_b", {})])
    round_log = json.dumps(live.get("log", []))
    simulation = json.dumps({
        "finalState": {
            "winnerId": winner_id,
            "status": "resolved"
        }
    })
    
    # Add a mock battle snapshot that looks like BantahBroAgentBattle so onchainSimBattleClaimService can parse it
    f_a = live.get("fighter_a", {})
    f_b = live.get("fighter_b", {})
    battle_snapshot = json.dumps({
        "id": battle_id,
        "title": title,
        "battleType": "agent-battle",
        "status": "expired",
        "sides": [
            {
                "id": f_a.get("id"),
                "agentName": f_a.get("name"),
                "tokenAddress": f_a.get("walletAddress"),
                "source": "pfp-arena"
            },
            {
                "id": f_b.get("id"),
                "agentName": f_b.get("name"),
                "tokenAddress": f_b.get("walletAddress"),
                "source": "pfp-arena"
            }
        ]
    })
    
    metadata = json.dumps({
        "winnerName": live.get("winner_name"),
        "loserName": live.get("loser_name")
    })
    
    execute_db("""
        INSERT INTO bota_arena_battle_records (
            record_key, battle_id, source_battle_id, title, arena_id, status,
            winner_agent_id, winner_side_id, loser_agent_id, loser_side_id,
            provider, adapter_version, engine_version, seed, rounds, spectators,
            fighters, round_log, simulation, battle_snapshot, metadata,
            started_at, ended_at, resolved_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s
        ) ON CONFLICT (record_key) DO NOTHING
    """, (
        record_key, battle_id, battle_id, title, arena_id, status,
        winner_id, winner_id, loser_id, loser_id,
        "pfp_local", "1.0", "1.0", seed, live.get("rounds_fought", 0), 0,
        fighters, round_log, simulation, battle_snapshot, metadata,
        started_at, ended_at, ended_at, ended_at
    ))


PORT = int(os.environ.get("PORT", 5000))
GAME_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "game")
INDEX_PATH = os.path.join(GAME_DIR, "Arena", "index.html")
PRIVY_APP_ID    = os.environ.get("PRIVY_APP_ID", "")
ALCHEMY_API_KEY = os.environ.get("ALCHEMY_API_KEY", "") or os.environ.get("VITE_ALCHEMY_API_KEY", "")
STATE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app_state.json")
TELEGRAM_BOT_TOKEN = os.environ.get("BANTAHBRO_TELEGRAM_BOT_TOKEN", "")

_STATE_LOCK = threading.Lock()           # guards STATE mutations from matchmaker thread
_SECS_PER_ROUND = 2                      # frontend animates at this pace
_MATCHMAKER_INTERVAL = 30                # seconds between matchmaker ticks

DEFAULT_PROFILE = {
    "id": "demo-user",
    "username": "bantahbro",
    "firstName": "Bantah",
    "lastName": "Bro",
    "bio": "Building the next arena layer for onchain battles.",
    "profileImageUrl": "",
    "walletAddress": "0x4C24768D98F2D30d3AB827d463d7a8A05c66bD0c",
    "primaryWalletAddress": "0x4C24768D98F2D30d3AB827d463d7a8A05c66bD0c",
    "points": 12680,
    "balance": "1234.50",
    "coins": 2400,
    "level": 12,
    "xp": 8400,
    "streak": 5,
    "status": "Ready",
    "myAgents": 3,
    "queue": 2,
    "bantCredit": 12840,
    "bantcClaim": 1240000,
    "earnedUsdc": 1250,
}

DEFAULT_NOTIFICATIONS = [
    {
        "id": "notif-1",
        "type": "challenge",
        "title": "New challenge ready",
        "message": "ROBOT V1 is live against FLOATROBO. Jump in before the queue closes.",
        "icon": "⚔️",
        "read": False,
        "createdAt": "2026-07-05T10:00:00Z",
    },
    {
        "id": "notif-2",
        "type": "reward",
        "title": "Watch 2 Earn payout",
        "message": "You earned 576 BC from your latest watch streak.",
        "icon": "💰",
        "read": False,
        "createdAt": "2026-07-05T09:15:00Z",
    },
    {
        "id": "notif-3",
        "type": "market",
        "title": "Marketplace update",
        "message": "Golden Skin is back in stock for your next loadout.",
        "icon": "🛒",
        "read": True,
        "createdAt": "2026-07-05T08:00:00Z",
    },
]


def load_state():
    blank = {
        "profile": dict(DEFAULT_PROFILE),
        "notifications": [dict(n) for n in DEFAULT_NOTIFICATIONS],
        "pfp_fighters": [],
        "pfp_live_match": None,
        "pfp_recent_battles": [],
        "notifications_by_wallet": {},
    }
    if not os.path.exists(STATE_PATH):
        return blank
    try:
        with open(STATE_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return {
            "profile": {**DEFAULT_PROFILE, **(data.get("profile") or {})},
            "notifications": data.get("notifications") or [dict(n) for n in DEFAULT_NOTIFICATIONS],
            "pfp_fighters": data.get("pfp_fighters") or [],
            "pfp_live_match": data.get("pfp_live_match"),
            "pfp_recent_battles": data.get("pfp_recent_battles") or [],
            "notifications_by_wallet": data.get("notifications_by_wallet") or {},
        }
    except Exception:
        return blank


def save_state(state):
    with open(STATE_PATH, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2)


STATE = load_state()


def get_platform_fighter_counts():
    """Return the real number of Pumpfighters and PFP-mode fighters from live sources."""
    pumpfighter_count = 0
    if _HAS_TRENDING:
        try:
            engine_state = _te.get_state() or {}
            fighters = engine_state.get("fighters") or []
            if isinstance(fighters, list):
                pumpfighter_count = len(fighters)
        except Exception as exc:
            print(f"[serve.py] fighter count error: {exc}", flush=True)

    pfp_count = 0
    try:
        row = query_db("SELECT COUNT(*) FROM bota_fighter_profiles", fetchone=True)
        if row:
            pfp_count = int(row[0] or 0)
    except Exception as exc:
        print(f"[serve.py] PFP count query error: {exc}", flush=True)

    pfp_count += len(STATE.get("pfp_fighters", []))
    return {
        "pumpfighters": pumpfighter_count,
        "pfpMode": pfp_count,
        "total": pumpfighter_count + pfp_count,
    }


# ── PFP Battle Engine ──────────────────────────────────────────────────────

def _norm(val, lo, hi):
    """Normalise val to 0.0–1.0 within [lo, hi]."""
    if hi <= lo:
        return 0.5
    return max(0.0, min(1.0, (val - lo) / (hi - lo)))


def simulate_pfp_battle(fa, fb):
    """
    AI vs AI round-based simulation for PFP fighters.
    Stats: hp (60-220), atk (5-45), def (0-35), spd (5-24).
    Uses the same formula as trending_engine.simulate_battle.
    """
    hp_a = float(fa.get("hp", 120))
    hp_b = float(fb.get("hp", 120))
    max_hp_a, max_hp_b = hp_a, hp_b

    # Normalise to 0–1 for the damage formula
    agg_a  = _norm(fa.get("atk", 25), 5, 45)
    def_a  = _norm(fa.get("def", 15), 0, 35)
    spd_a  = _norm(fa.get("spd", 12), 5, 24)
    luck_a = random.uniform(0.3, 0.7)

    agg_b  = _norm(fb.get("atk", 25), 5, 45)
    def_b  = _norm(fb.get("def", 15), 0, 35)
    spd_b  = _norm(fb.get("spd", 12), 5, 24)
    luck_b = random.uniform(0.3, 0.7)

    intel = 0.5
    rounds_log = []
    round_num  = 0
    max_rounds = 25

    while hp_a > 0 and hp_b > 0 and round_num < max_rounds:
        round_num += 1
        # A attacks B
        base_a = (agg_a * 18 + spd_a * 4 + luck_a * 3 + intel * 2) * (1 - def_b * 0.45)
        dmg_a  = max(1.0, base_a * random.uniform(0.75, 1.30))
        hp_b  -= dmg_a
        if hp_b <= 0:
            hp_b = 0
            rounds_log.append({"round": round_num, "hp_a": int(hp_a), "hp_b": 0})
            break
        # B attacks A
        base_b = (agg_b * 18 + spd_b * 4 + luck_b * 3 + intel * 2) * (1 - def_a * 0.45)
        dmg_b  = max(1.0, base_b * random.uniform(0.75, 1.30))
        hp_a  -= dmg_b
        if hp_a <= 0:
            hp_a = 0
        rounds_log.append({"round": round_num,
                            "hp_a": int(max(0, hp_a)),
                            "hp_b": int(max(0, hp_b))})

    winner, loser = (fa, fb) if hp_a >= hp_b else (fb, fa)
    hp_rem = int(max(0, hp_a if hp_a >= hp_b else hp_b))

    return {
        "match_id":      f"pfp_{int(time.time())}_{random.randint(1000, 9999)}",
        "winner_id":     winner["id"],
        "loser_id":      loser["id"],
        "winner_name":   winner["name"],
        "loser_name":    loser["name"],
        "rounds_fought": round_num,
        "hp_remaining":  hp_rem,
        "max_hp_a":      max_hp_a,
        "max_hp_b":      max_hp_b,
        "rounds_log":    rounds_log,
        "bc_pool":       576,
        "created_at":    datetime.now(timezone.utc).isoformat(),
    }


def _send_telegram_dm(telegram_user_id, text):
    """Fire-and-forget Telegram DM to a user (by their Telegram user ID)."""
    if not TELEGRAM_BOT_TOKEN or not telegram_user_id:
        return
    try:
        import urllib.request
        payload = json.dumps({
            "chat_id": telegram_user_id,
            "text": text,
            "parse_mode": "HTML",
        }).encode("utf-8")
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as _e:
        print(f"[Telegram] DM failed: {_e}", flush=True)


def _pfp_add_notif(wallet, data):
    """
    Add a notification to the global list and per-wallet bucket.
    Optionally DMs the user on Telegram if their fighter has a telegramUserId.
    """
    notif = {
        "id":            f"pfp-{_uuid_mod.uuid4().hex[:8]}",
        "walletAddress": wallet or "",
        "type":          data.get("type", "info"),
        "title":         data.get("title", ""),
        "message":       data.get("message", ""),
        "icon":          data.get("icon", "🔔"),
        "read":          False,
        "createdAt":     datetime.now(timezone.utc).isoformat(),
    }
    STATE.setdefault("notifications", []).insert(0, notif)
    if wallet:
        STATE.setdefault("notifications_by_wallet", {}).setdefault(wallet, []).insert(0, notif)
    # Telegram DM: look up telegramUserId from any fighter owned by this wallet
    tg_id = None
    for f in STATE.get("pfp_fighters", []):
        if f.get("walletAddress", "").lower() == (wallet or "").lower() and f.get("telegramUserId"):
            tg_id = f["telegramUserId"]
            break
    if tg_id:
        _send_telegram_dm(tg_id, f"{notif['icon']} <b>{notif['title']}</b>\n{notif['message']}")


def _pfp_finish_battle(live):
    """Write wins/losses, add result notifications, archive battle."""
    winner_id = live.get("winner_id")
    loser_id  = live.get("loser_id")

    for f in STATE.get("pfp_fighters", []):
        if f["id"] == winner_id:
            f["wins"]   = f.get("wins", 0) + 1
            f["status"] = "idle"
            wallet = f.get("walletAddress", "")
            if wallet:
                award_bantcredit(wallet, BANTCREDIT_AGENT_WIN_REWARD, "agent_win", live.get("id", ""))
            
            _pfp_add_notif(wallet, {
                "type":    "battle_result",
                "title":   "Victory! 🏆",
                "message": f"{f['name']} defeated {live.get('loser_name', '???')} in {live.get('rounds_fought', '?')} rounds!",
                "icon":    "🏆",
            })
        elif f["id"] == loser_id:
            f["losses"] = f.get("losses", 0) + 1
            f["status"] = "idle"
            _pfp_add_notif(f.get("walletAddress", ""), {
                "type":    "battle_result",
                "title":   "Defeated",
                "message": f"{f['name']} lost to {live.get('winner_name', '???')}. Train harder!",
                "icon":    "💀",
            })

    record = {
        "match_id":       live.get("match_id"),
        "fighter_a_name": live.get("fighter_a", {}).get("name"),
        "fighter_b_name": live.get("fighter_b", {}).get("name"),
        "winner_name":    live.get("winner_name"),
        "rounds":         live.get("rounds_fought"),
        "bc_pool":        live.get("bc_pool", 576),
        "ended_at":       datetime.now(timezone.utc).isoformat(),
    }
    STATE.setdefault("pfp_recent_battles", []).insert(0, record)
    if len(STATE["pfp_recent_battles"]) > 20:
        STATE["pfp_recent_battles"] = STATE["pfp_recent_battles"][:20]
    save_state(STATE)
    
    # Record to DB for on-chain claiming
    insert_pfp_battle_record(live)

def _pfp_matchmaker_loop():
    """Background thread: pair queued PFP fighters and run AI vs AI battles every 30 s."""
    while True:
        time.sleep(_MATCHMAKER_INTERVAL)
        try:
            with _STATE_LOCK:
                live = STATE.get("pfp_live_match")

                # ── 1. Finish any completed live match ─────────────────────
                if live and live.get("status") == "live":
                    started = datetime.fromisoformat(
                        live["started_at"].replace("Z", "+00:00")
                    )
                    battle_duration = live.get("rounds_fought", 10) * _SECS_PER_ROUND
                    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
                    if elapsed >= battle_duration:
                        live["status"] = "finished"
                        STATE["pfp_live_match"] = live
                        _pfp_finish_battle(live)
                        live = None            # fall through to next pairing

                # ── 2. Start a new match if queue has ≥ 2 fighters ────────
                if live and live.get("status") == "live":
                    continue                  # still in progress

                queued = [f for f in STATE.get("pfp_fighters", [])
                          if f.get("status") == "queued"]
                if len(queued) < 2:
                    continue

                fa, fb = queued[0], queued[1]
                for f in STATE["pfp_fighters"]:
                    if f["id"] in (fa["id"], fb["id"]):
                        f["status"] = "fighting"

                # Match-found notifications
                _pfp_add_notif(fa.get("walletAddress", ""), {
                    "type":    "match_found",
                    "title":   "Match found! ⚔️",
                    "message": f"{fa['name']} vs {fb['name']} — battle starting now!",
                    "icon":    "⚔️",
                })
                if fb.get("walletAddress", "").lower() != fa.get("walletAddress", "").lower():
                    _pfp_add_notif(fb.get("walletAddress", ""), {
                        "type":    "match_found",
                        "title":   "Match found! ⚔️",
                        "message": f"{fb['name']} vs {fa['name']} — battle starting now!",
                        "icon":    "⚔️",
                    })

                result = simulate_pfp_battle(fa, fb)
                STATE["pfp_live_match"] = {
                    "match_id":      result["match_id"],
                    "fighter_a":     fa,
                    "fighter_b":     fb,
                    "max_hp_a":      result["max_hp_a"],
                    "max_hp_b":      result["max_hp_b"],
                    "rounds_log":    result["rounds_log"],
                    "rounds_fought": result["rounds_fought"],
                    "winner_id":     result["winner_id"],
                    "loser_id":      result["loser_id"],
                    "winner_name":   result["winner_name"],
                    "loser_name":    result["loser_name"],
                    "bc_pool":       result["bc_pool"],
                    "secs_per_round": _SECS_PER_ROUND,
                    "status":        "live",
                    "started_at":    datetime.now(timezone.utc).isoformat(),
                }
                save_state(STATE)
                print(f"[PFP Matchmaker] {fa['name']} vs {fb['name']} — {result['rounds_fought']} rounds",
                      flush=True)
        except Exception as _me:
            print(f"[PFP Matchmaker] Error: {_me}", flush=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=GAME_DIR, **kwargs)

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/profile":
            self.send_json(STATE["profile"])
            return
        if path == "/api/notifications":
            qs = parse_qs(urlparse(self.path).query)
            wallet = (qs.get("wallet") or [""])[0].strip().lower()
            if wallet:
                notifs = STATE.get("notifications_by_wallet", {}).get(wallet) \
                         or [n for n in STATE["notifications"]
                             if (n.get("walletAddress") or "").lower() == wallet]
            else:
                notifs = STATE["notifications"]
            self.send_json(notifs)
            return
        if path == "/api/notifications/unread-count":
            unread_count = sum(1 for notification in STATE["notifications"] if not notification.get("read", False))
            self.send_json({"unreadCount": unread_count})
            return
        if path == "/api/health":
            self.send_json({"ok": True})
            return

        if path == "/api/stats":
            qs = parse_qs(urlparse(self.path).query)
            wallet = (qs.get("wallet") or [""])[0].strip().lower()
            stats = {"myAgents": 0, "queue": 0, "bantCredit": 0,
                     "bantcClaim": 0, "earnedUsdc": 0, "status": "Ready"}
            if wallet:
                r = query_db("SELECT COUNT(*) FROM agents WHERE LOWER(owner_wallet_address)=%s", (wallet,), fetchone=True)
                if r: stats["myAgents"] = int(r[0])

                r = query_db("SELECT COUNT(*) FROM matchmaking_queue WHERE LOWER(wallet_address)=%s", (wallet,), fetchone=True)
                if r: stats["queue"] = int(r[0])

                r = query_db("SELECT COALESCE(balance,0) FROM bantcredit_balances WHERE LOWER(wallet_address)=%s", (wallet,), fetchone=True)
                if r: stats["bantCredit"] = float(r[0])

                r = query_db(
                    "SELECT COALESCE(SUM(amount),0) FROM onchain_sim_battle_reward_claims "
                    "WHERE LOWER(account)=%s AND status NOT IN ('claimed','expired','cancelled')",
                    (wallet,), fetchone=True)
                if r: stats["bantcClaim"] = int(r[0])

                r = query_db(
                    "SELECT COALESCE(SUM(pe.amount),0) FROM payout_entries pe "
                    "JOIN users u ON pe.user_id=u.id "
                    "WHERE LOWER(u.primary_wallet_address)=%s AND pe.status='completed'",
                    (wallet,), fetchone=True)
                if r: stats["earnedUsdc"] = round(float(r[0]) / 1_000_000, 2)

                r = query_db("SELECT status FROM users WHERE LOWER(primary_wallet_address)=%s", (wallet,), fetchone=True)
                if r and r[0]: stats["status"] = r[0]
            self.send_json(stats)
            return

        if path == "/api/my-agents":
            qs = parse_qs(urlparse(self.path).query)
            wallet = (qs.get("wallet") or [""])[0].strip().lower()
            agents = []
            if wallet:
                rows = query_db(
                    "SELECT agent_id, agent_name, avatar_url, win_count, loss_count, points, status "
                    "FROM agents WHERE LOWER(owner_wallet_address)=%s ORDER BY created_at DESC",
                    (wallet,))
                if rows:
                    agents = [{"id": r[0], "name": r[1], "avatarUrl": r[2],
                               "wins": r[3] or 0, "losses": r[4] or 0,
                               "points": r[5] or 0, "status": r[6]} for r in rows]
            self.send_json(agents)
            return

        if path == "/api/fighters/counts":
            self.send_json(get_platform_fighter_counts())
            return

        if path == "/api/fighters":
            rows = query_db(
                "SELECT agent_id, display_name, avatar_url, wins, losses, fame_score "
                "FROM bota_fighter_profiles "
                "WHERE wins > 0 OR losses > 0 "
                "ORDER BY (wins + losses) DESC NULLS LAST, fame_score DESC NULLS LAST "
                "LIMIT 30")
            fighters = []
            if rows:
                fighters = [{"id": r[0], "name": r[1], "avatarUrl": r[2],
                             "wins": r[3] or 0, "losses": r[4] or 0,
                             "fameScore": float(r[5] or 0)} for r in rows]
            
            # If no DB results, fallback to trending engine fighters
            if not fighters and _HAS_TRENDING:
                state = _te.get_state()
                if state and state.get("fighters"):
                    fighters = [{"id": f.get("unique_id", ""), 
                                "name": f.get("display_name", "Unknown"),
                                "avatarUrl": f.get("processed_avatar", ""),
                                "wins": f.get("wins", 0),
                                "losses": f.get("losses", 0),
                                "fameScore": float(f.get("fame_score", 0))} 
                               for f in state["fighters"][:30]]

            # Merge in locally-deployed PFP fighters (always included)
            pfp_ids = {f["id"] for f in fighters}
            for pf in STATE.get("pfp_fighters", []):
                if pf["id"] not in pfp_ids:
                    fighters.append({
                        "id": pf["id"],
                        "name": pf.get("name", ""),
                        "avatarUrl": pf.get("avatarUrl", ""),
                        "wins": pf.get("wins", 0),
                        "losses": pf.get("losses", 0),
                        "fameScore": float(pf.get("fameScore", 0)),
                    })

            self.send_json(fighters)
            return
        # ── PumpFighters Engine endpoints ──────────────────────────────────
        if path == "/api/pumpfighters/state":
            try:
                if _HAS_TRENDING:
                    s = _te.get_state()
                    def _clean(obj):
                        if isinstance(obj, dict):
                            return {k: _clean(v) for k, v in obj.items()}
                        if isinstance(obj, list):
                            return [_clean(i) for i in obj]
                        if isinstance(obj, bytes):
                            return obj.decode("utf-8", errors="replace")
                        if hasattr(obj, "isoformat"):
                            return obj.isoformat()
                        try:
                            from decimal import Decimal
                            if isinstance(obj, Decimal):
                                return float(obj)
                        except ImportError:
                            pass
                        return obj
                    def _strip_avatars(obj):
                        """Remove heavy base64 processed_avatar fields; keep image_uri."""
                        if isinstance(obj, dict):
                            return {k: (_strip_avatars(v) if k != "processed_avatar" else None)
                                    for k, v in obj.items()}
                        if isinstance(obj, list):
                            return [_strip_avatars(i) for i in obj]
                        return obj
                    payload = _strip_avatars(_clean(s))
                    self.send_json(payload)
                else:
                    self.send_json({"fighters": [], "live_match": None,
                                    "recent_battles": [], "last_refreshed": None,
                                    "error": "engine not available"})
            except Exception as _e:
                import traceback
                print(f"[serve.py] /api/pumpfighters/state error: {_e}\n{traceback.format_exc()}", flush=True)
                try:
                    self.send_json({"error": str(_e)}, 500)
                except Exception:
                    pass
            return

        if path == "/api/pumpfighters/leaderboard":
            try:
                qs = parse_qs(urlparse(self.path).query)
                chain = (qs.get("chain") or ["all"])[0]
                limit = int((qs.get("limit") or ["30"])[0])
                if _HAS_TRENDING:
                    rows = _te.get_leaderboard(chain=chain, limit=limit)
                    from decimal import Decimal as _Decimal
                    def _clean_row(r):
                        out = {}
                        for k, v in r.items():
                            if k == "processed_avatar":
                                out[k] = None  # strip heavy base64
                            elif isinstance(v, _Decimal):
                                out[k] = float(v)
                            elif hasattr(v, "isoformat"):
                                out[k] = v.isoformat()
                            elif isinstance(v, (list, set)):
                                out[k] = list(v)
                            elif isinstance(v, bytes):
                                out[k] = v.decode("utf-8", errors="replace")
                            else:
                                out[k] = v
                        return out
                    self.send_json([_clean_row(r) for r in rows])
                else:
                    self.send_json([])
            except Exception as _e:
                import traceback
                print(f"[serve.py] /api/pumpfighters/leaderboard error: {_e}\n{traceback.format_exc()}", flush=True)
                try:
                    self.send_json({"error": str(_e)}, 500)
                except Exception:
                    pass
            return

        if path == "/api/pumpfighters/recent-battles":
            limit = int((parse_qs(urlparse(self.path).query).get("limit") or ["20"])[0])
            if _HAS_TRENDING:
                rows = _te.get_recent_battles(limit=limit)
                def _clean_battle(r):
                    out = {}
                    for k, v in r.items():
                        out[k] = v.isoformat() if hasattr(v, "isoformat") else v
                    return out
                self.send_json([_clean_battle(r) for r in rows])
            else:
                self.send_json([])
            return

        if path == "/api/pumpfighters/trigger-refresh":
            if _HAS_TRENDING:
                threading.Thread(target=_te._refresh_cycle, daemon=True).start()
                self.send_json({"ok": True, "message": "Refresh triggered"})
            else:
                self.send_json({"ok": False, "message": "engine not available"})
            return

        if path == "/api/pumpfighters/market-energy":
            try:
                from market_energy_engine import market_energy_engine as _mee
                states = _mee.all_states()
                # Sanitise: remove non-serialisable fields
                out = {}
                for uid, s in states.items():
                    out[uid] = {
                        "energy":        s.get("energy", 0),
                        "ability_ready": s.get("ability_ready", False),
                        "ability":       s.get("ability", {}),
                        "events":        s.get("events_this_tick", []),
                    }
                self.send_json(out)
            except Exception as e:
                self.send_json({"error": str(e)})
            return

        if path == "/api/pfp/state":
            with _STATE_LOCK:
                live = STATE.get("pfp_live_match")
                # Compute elapsed so the frontend can derive the current round
                elapsed_secs = 0
                if live and live.get("status") == "live" and live.get("started_at"):
                    try:
                        started = datetime.fromisoformat(live["started_at"].replace("Z", "+00:00"))
                        elapsed_secs = (datetime.now(timezone.utc) - started).total_seconds()
                    except Exception:
                        pass
                self.send_json({
                    "live_match":      live,
                    "elapsed_secs":    elapsed_secs,
                    "recent_battles":  STATE.get("pfp_recent_battles", []),
                    "queued_count":    sum(1 for f in STATE.get("pfp_fighters", [])
                                          if f.get("status") == "queued"),
                })
            return

        if path == "/api/nfts":
            qs     = parse_qs(urlparse(self.path).query)
            wallet = (qs.get("wallet") or [""])[0].strip()
            if not wallet:
                self.send_json({"error": "wallet required"}, 400)
                return
            if not ALCHEMY_API_KEY:
                self.send_json({"error": "NFT lookup unavailable"}, 503)
                return
            import urllib.request as _ur
            nfts = []
            # Try Base first (most common for this app's audience), then Ethereum
            for chain_slug in ("base-mainnet", "eth-mainnet"):
                try:
                    url = (f"https://{chain_slug}.g.alchemy.com/nft/v3/{ALCHEMY_API_KEY}"
                           f"/getNFTsForOwner?owner={wallet}&withMetadata=true&pageSize=20")
                    req = _ur.Request(url, headers={"Accept": "application/json"})
                    with _ur.urlopen(req, timeout=8) as resp:
                        data = json.loads(resp.read())
                    for item in data.get("ownedNfts", []):
                        img = (item.get("image") or {}).get("cachedUrl") or \
                              (item.get("image") or {}).get("originalUrl") or \
                              item.get("metadata", {}).get("image", "")
                        if img:
                            nfts.append({
                                "name":       item.get("name") or item.get("contract", {}).get("name", "NFT"),
                                "collection": item.get("contract", {}).get("name", ""),
                                "imageUrl":   img,
                                "chain":      chain_slug.split("-")[0],
                            })
                    if nfts:
                        break
                except Exception as _e:
                    print(f"[serve.py] /api/nfts {chain_slug} error: {_e}", flush=True)
            self.send_json({"nfts": nfts[:20]})
            return

        if path in {"/", ""}:
            try:
                with open(INDEX_PATH, "r", encoding="utf-8") as f:
                    content = f.read()
                content = content.replace("'__PRIVY_APP_ID__'", f"'{PRIVY_APP_ID}'")
                body = content.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        try:
            super().do_GET()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/daily-checkin":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8") if length else "{}"
            payload = json.loads(body or "{}")
            wallet = payload.get("wallet")
            if not wallet:
                self.send_json({"error": "wallet required"}, 400)
                return
            
            # Very simple daily check-in: award if they haven't claimed today (we skip actual daily timing check for brevity as we just migrate the structure, or we can check ledger)
            # Check if claimed today:
            r = query_db("SELECT COUNT(*) FROM bantcredit_ledger WHERE transaction_type='daily_signin' AND user_id=(SELECT id FROM users WHERE LOWER(primary_wallet_address)=%s) AND created_at > NOW() - INTERVAL '1 day'", (wallet.lower(),), fetchone=True)
            if r and r[0] > 0:
                self.send_json({"error": "Already claimed today", "claimed": False}, 400)
                return
            
            success = award_bantcredit(wallet, BANTCREDIT_DAILY_CHECKIN_REWARD, "daily_signin")
            if success:
                self.send_json({"success": True, "reward": BANTCREDIT_DAILY_CHECKIN_REWARD})
            else:
                self.send_json({"error": "User not found or db error"}, 500)
            return

        if path == "/api/signup-bonus":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8") if length else "{}"
            payload = json.loads(body or "{}")
            wallet = payload.get("wallet")
            if not wallet:
                self.send_json({"error": "wallet required"}, 400)
                return
            
            # Check if claimed:
            r = query_db("SELECT COUNT(*) FROM bantcredit_ledger WHERE transaction_type='signup_bonus' AND user_id=(SELECT id FROM users WHERE LOWER(primary_wallet_address)=%s)", (wallet.lower(),), fetchone=True)
            if r and r[0] > 0:
                self.send_json({"error": "Already claimed signup bonus", "claimed": False}, 400)
                return
            
            success = award_bantcredit(wallet, BANTCREDIT_SIGNUP_REWARD, "signup_bonus")
            if success:
                self.send_json({"success": True, "reward": BANTCREDIT_SIGNUP_REWARD})
            else:
                self.send_json({"error": "User not found or db error"}, 500)
            return

        if path == "/api/pfp/deploy":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8") if length else "{}"
            try:
                payload = json.loads(body or "{}")
            except Exception:
                self.send_json({"error": "Invalid JSON"}, 400)
                return

            with _STATE_LOCK:
                fighter_id = _uuid_mod.uuid4().hex[:8]
                wallet     = (payload.get("walletAddress") or "").strip()
                tg_id      = (payload.get("telegramUserId") or "").strip() or None

                fighter = {
                    "id":             fighter_id,
                    "name":           (payload.get("name") or "UNNAMED FIGHTER").strip(),
                    "avatarUrl":      payload.get("imageUrl", ""),
                    "collection":     payload.get("collection", ""),
                    "class":          payload.get("class", ""),
                    "traits":         payload.get("traits", ""),
                    "hp":             int(payload.get("hp") or 120),
                    "atk":            int(payload.get("atk") or 25),
                    "def":            int(payload.get("def") or 15),
                    "spd":            int(payload.get("spd") or 12),
                    "agentKit":       bool(payload.get("agentKit", False)),
                    "walletAddress":  wallet,
                    "telegramUserId": tg_id,
                    "wins":           0,
                    "losses":         0,
                    "fameScore":      0.0,
                    "status":         "queued",
                    "deployedAt":     datetime.now(timezone.utc).isoformat(),
                }

                STATE.setdefault("pfp_fighters", []).append(fighter)
                STATE["profile"]["myAgents"] = int(STATE["profile"].get("myAgents") or 0) + 1
                STATE["profile"]["queue"]    = int(STATE["profile"].get("queue") or 0) + 1

                _pfp_add_notif(wallet, {
                    "type":    "queue",
                    "title":   "Fighter entered the queue",
                    "message": f"{fighter['name']} has been deployed and is waiting for a match.",
                    "icon":    "⚔️",
                })
                # Telegram DM on queue entry (the DM helper reads telegramUserId from the fighter)
                if tg_id:
                    _send_telegram_dm(tg_id, f"⚔️ <b>{fighter['name']}</b> entered the arena queue! You'll be notified when a match is found.")

                save_state(STATE)

                # Pull the notification we just added so we can return it
                notif = STATE["notifications"][0]

            self.send_json({
                "ok":       True,
                "fighter":  fighter,
                "queue":    STATE["profile"]["queue"],
                "myAgents": STATE["profile"]["myAgents"],
                "notification": notif,
            })
            return
        self.send_json({"error": "Not found"}, 404)

    def do_PUT(self):
        path = urlparse(self.path).path
        if path == "/api/profile":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8") if length else "{}"
            payload = json.loads(body or "{}")
            profile = STATE["profile"]
            if "firstName" in payload:
                profile["firstName"] = payload["firstName"]
            if "lastName" in payload:
                profile["lastName"] = payload["lastName"]
            if "username" in payload:
                profile["username"] = payload["username"]
            if "bio" in payload:
                profile["bio"] = payload["bio"]
            if "profileImageUrl" in payload:
                profile["profileImageUrl"] = payload["profileImageUrl"]
            if "walletAddress" in payload:
                profile["walletAddress"] = payload["walletAddress"]
                profile["primaryWalletAddress"] = payload["walletAddress"]
            save_state(STATE)
            self.send_json(profile)
            return
        if path == "/api/users/me/wallet":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8") if length else "{}"
            payload = json.loads(body or "{}")
            profile = STATE["profile"]
            wallet = payload.get("walletAddress") or payload.get("address")
            if wallet:
                profile["walletAddress"] = wallet
                profile["primaryWalletAddress"] = wallet
                save_state(STATE)
            self.send_json({"success": True, "walletAddress": profile["walletAddress"]})
            return
        self.send_json({"error": "Not found"}, 404)

    def do_PATCH(self):
        path = urlparse(self.path).path
        if path == "/api/notifications/read-all":
            for notification in STATE["notifications"]:
                notification["read"] = True
            save_state(STATE)
            self.send_json({"success": True})
            return
        parts = path.split("/")
        if len(parts) == 4 and parts[1] == "api" and parts[2] == "notifications" and parts[3] == "read":
            self.send_json({"error": "Invalid route"}, 404)
            return
        if len(parts) == 5 and parts[1] == "api" and parts[2] == "notifications" and parts[4] == "read":
            notification_id = parts[3]
            for notification in STATE["notifications"]:
                if notification.get("id") == notification_id:
                    notification["read"] = True
                    break
            save_state(STATE)
            self.send_json({"success": True})
            return
        self.send_json({"error": "Not found"}, 404)

    def do_DELETE(self):
        path = urlparse(self.path).path
        parts = path.split("/")
        if len(parts) == 4 and parts[1] == "api" and parts[2] == "notifications":
            notification_id = parts[3]
            STATE["notifications"] = [n for n in STATE["notifications"] if n.get("id") != notification_id]
            save_state(STATE)
            self.send_json({"success": True})
            return
        if path == "/api/notifications/clear-all":
            STATE["notifications"] = []
            save_state(STATE)
            self.send_json({"success": True})
            return
        self.send_json({"error": "Not found"}, 404)

    def log_message(self, format, *args):
        pass

    def log_error(self, format, *args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def handle_error(self, request, client_address):
        pass


# ── Boot PFP matchmaker ───────────────────────────────────────────────────
threading.Thread(target=_pfp_matchmaker_loop, daemon=True, name="PFPMatchmaker").start()

def _onchain_submitter_loop():
    """Periodically run the TS script to submit PFP battles on-chain."""
    import subprocess, time, os
    while True:
        time.sleep(300) # Every 5 minutes
        try:
            print("[serve.py] Running onchain submitter for PFP battles...", flush=True)
            script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts", "record-pfp-battles-onchain.ts")
            server_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server")
            result = subprocess.run(["npx", "tsx", script_path], cwd=server_dir, capture_output=True, text=True)
            if result.stdout: print(f"[serve.py] onchain submitter: {result.stdout}", flush=True)
            if result.stderr: print(f"[serve.py] onchain submitter err: {result.stderr}", flush=True)
        except Exception as e:
            print(f"[serve.py] Error running onchain submitter: {e}", flush=True)

threading.Thread(target=_onchain_submitter_loop, daemon=True, name="OnchainSubmitter").start()


# ── Boot trending engine ───────────────────────────────────────────────────
if _HAS_TRENDING:
    def _boot_engine():
        time.sleep(2)
        try:
            _te.ensure_tables()
            _te.bootstrap_state_from_db()   # pre-fill state from last known DB data
            _te.start_background_refresh()
        except Exception as e:
            print(f"[serve.py] Engine boot error: {e}", flush=True)
    threading.Thread(target=_boot_engine, daemon=True, name="EngineBootstrap").start()

with Server(("0.0.0.0", PORT), Handler) as httpd:
    print(f"Serving at http://0.0.0.0:{PORT}", flush=True)
    httpd.serve_forever()
