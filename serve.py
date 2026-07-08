import http.server
import socketserver
import os
import json
import threading
import time
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
_BOTA_TABLES_READY = False


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
        return None

<<<<<<< HEAD

def exec_db(sql, params=(), fetchone=False):
    if not _HAS_DB or not DATABASE_URL:
        return None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(sql, params)
        result = cur.fetchone() if fetchone and cur.description else None
        conn.commit()
        conn.close()
        return result
    except Exception as e:
        print(f"DB exec error: {e}", flush=True)
        return None


def ensure_bota_tables():
    global _BOTA_TABLES_READY
    if _BOTA_TABLES_READY:
        return True
    if not _HAS_DB or not DATABASE_URL:
        return False

    exec_db("""
        CREATE TABLE IF NOT EXISTS bota_fighter_profiles (
            agent_id VARCHAR(180) PRIMARY KEY NOT NULL,
            display_name VARCHAR(120) NOT NULL,
            origin VARCHAR(32) NOT NULL DEFAULT 'bota',
            origin_id VARCHAR(180),
            agent_class VARCHAR(40) NOT NULL DEFAULT 'striker',
            archetype VARCHAR(40) NOT NULL DEFAULT 'signal_striker',
            league VARCHAR(80) NOT NULL DEFAULT 'Open League',
            rank INTEGER,
            avatar_url TEXT,
            badge_label VARCHAR(80),
            ens_name VARCHAR(160),
            wallet_address VARCHAR(128),
            external_url TEXT,
            token_symbol VARCHAR(64),
            token_name VARCHAR(160),
            chain_id VARCHAR(64),
            wins INTEGER NOT NULL DEFAULT 0,
            losses INTEGER NOT NULL DEFAULT 0,
            current_streak INTEGER NOT NULL DEFAULT 0,
            fame_score NUMERIC(12, 2) NOT NULL DEFAULT 0,
            watchers INTEGER NOT NULL DEFAULT 0,
            challenge_volume INTEGER NOT NULL DEFAULT 0,
            titles JSONB NOT NULL DEFAULT '[]'::jsonb,
            tags JSONB NOT NULL DEFAULT '[]'::jsonb,
            last_battle_id VARCHAR(255),
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            imported_at TIMESTAMP DEFAULT NOW(),
            last_seen_at TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            is_pfp BOOLEAN DEFAULT false
        )
    """)
    exec_db("ALTER TABLE bota_fighter_profiles ADD COLUMN IF NOT EXISTS is_pfp BOOLEAN DEFAULT false")
    exec_db("""
        CREATE TABLE IF NOT EXISTS bota_arena_battles (
            id SERIAL PRIMARY KEY,
            p1_wallet VARCHAR(100),
            p1_agent VARCHAR(180),
            p2_wallet VARCHAR(100),
            p2_agent VARCHAR(180),
            status VARCHAR(20) DEFAULT 'queued',
            winner VARCHAR(100),
            is_pfp BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    exec_db("ALTER TABLE bota_arena_battles ADD COLUMN IF NOT EXISTS is_pfp BOOLEAN DEFAULT false")
    exec_db("""
        CREATE TABLE IF NOT EXISTS bota_notifications (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(100),
            title VARCHAR(100),
            message TEXT,
            type VARCHAR(50),
            icon VARCHAR(10),
            read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    exec_db("ALTER TABLE bota_notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false")
    _BOTA_TABLES_READY = True
    return True


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def slugify(value):
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value or "pfp"))
    cleaned = "-".join(part for part in cleaned.split("-") if part)
    return cleaned[:48] or "pfp"


def clamp_int(value, min_value, max_value, fallback):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = fallback
    return max(min_value, min(max_value, parsed))


PFP_OPPONENTS = [
    {"id": "arena:robopepe", "name": "Robo Pepe", "avatarUrl": ""},
    {"id": "arena:floatrobo", "name": "Floatrobo", "avatarUrl": ""},
    {"id": "arena:crimsonbot", "name": "Crimsonbot", "avatarUrl": ""},
    {"id": "arena:voidbot", "name": "Voidbot", "avatarUrl": ""},
]

PORT = 8080
=======
PORT = int(os.environ.get("PORT", 3000))
>>>>>>> ecb13e850dee9185b563f001d16fcfd40b27d39d
GAME_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "game")
INDEX_PATH = os.path.join(GAME_DIR, "Arena", "index.html")
PRIVY_APP_ID = os.environ.get("PRIVY_APP_ID", "")
STATE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app_state.json")

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
    if not os.path.exists(STATE_PATH):
        return {
            "profile": dict(DEFAULT_PROFILE),
            "notifications": [dict(n) for n in DEFAULT_NOTIFICATIONS],
            "pfpFighters": [],
            "pfpBattles": [],
        }
    try:
        with open(STATE_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return {
            "profile": {**DEFAULT_PROFILE, **(data.get("profile") or {})},
            "notifications": data.get("notifications") or [dict(n) for n in DEFAULT_NOTIFICATIONS],
            "pfpFighters": data.get("pfpFighters") or [],
            "pfpBattles": data.get("pfpBattles") or [],
        }
    except Exception:
        return {
            "profile": dict(DEFAULT_PROFILE),
            "notifications": [dict(n) for n in DEFAULT_NOTIFICATIONS],
            "pfpFighters": [],
            "pfpBattles": [],
        }


def save_state(state):
    with open(STATE_PATH, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2)


STATE = load_state()


def pfp_rows_for_wallet(wallet):
    wallet = (wallet or "").strip().lower()
    if not wallet:
        return list(STATE.get("pfpFighters", []))
    return [
        fighter for fighter in STATE.get("pfpFighters", [])
        if str(fighter.get("wallet") or "").lower() == wallet
    ]


def pfp_battles_for_wallet(wallet):
    wallet = (wallet or "").strip().lower()
    if not wallet:
        return list(STATE.get("pfpBattles", []))
    return [
        battle for battle in STATE.get("pfpBattles", [])
        if str(battle.get("p1Wallet") or "").lower() == wallet
    ]


def local_pfp_state(wallet):
    battles = sorted(
        pfp_battles_for_wallet(wallet),
        key=lambda battle: battle.get("createdAt") or "",
        reverse=True,
    )
    fighters = pfp_rows_for_wallet(wallet)
    latest_battle = battles[0] if battles else None
    latest_fighter = None
    if latest_battle:
        latest_fighter = next(
            (fighter for fighter in fighters if fighter.get("id") == latest_battle.get("p1Agent")),
            None,
        )
    if not latest_fighter and fighters:
        latest_fighter = sorted(fighters, key=lambda fighter: fighter.get("createdAt") or "", reverse=True)[0]
    return {
        "fighter": latest_fighter,
        "battle": latest_battle,
        "queue": sum(1 for battle in battles if battle.get("status") == "queued"),
        "fighters": fighters,
        "battles": battles[:10],
    }


def build_pfp_deploy(payload):
    name = str(payload.get("name") or "").strip()
    if not name:
        return None, "Fighter name is required"

    wallet = str(
        payload.get("wallet")
        or payload.get("walletAddress")
        or STATE.get("profile", {}).get("walletAddress")
        or ""
    ).strip()
    collection = str(payload.get("collection") or "").strip()
    class_name = str(payload.get("className") or payload.get("class") or "striker").strip() or "striker"
    image = str(payload.get("image") or payload.get("avatarUrl") or "").strip()
    raw_traits = payload.get("traits") or []
    if isinstance(raw_traits, str):
        traits = [item.strip() for item in raw_traits.split(",") if item.strip()]
    elif isinstance(raw_traits, list):
        traits = [str(item).strip() for item in raw_traits if str(item).strip()]
    else:
        traits = []

    stats = payload.get("stats") if isinstance(payload.get("stats"), dict) else {}
    normalized_stats = {
        "hp": clamp_int(stats.get("hp"), 60, 220, 120),
        "attack": clamp_int(stats.get("attack") or stats.get("atk"), 5, 45, 25),
        "defense": clamp_int(stats.get("defense") or stats.get("def"), 0, 35, 15),
        "speed": clamp_int(stats.get("speed") or stats.get("spd"), 5, 24, 12),
    }

    created_at = now_iso()
    fighter_id = "pfp:%s:%s" % (slugify(wallet or collection or name), int(time.time() * 1000))
    display_name = name.upper()
    opponent = PFP_OPPONENTS[len(STATE.get("pfpBattles", [])) % len(PFP_OPPONENTS)]
    live_count = sum(1 for battle in STATE.get("pfpBattles", []) if battle.get("status") == "live")
    status = "live" if live_count < 3 else "queued"
    queue_position = (
        sum(1 for battle in STATE.get("pfpBattles", []) if battle.get("status") == "queued") + 1
        if status == "queued"
        else 0
    )

    fighter = {
        "id": fighter_id,
        "agentId": fighter_id,
        "name": display_name,
        "displayName": display_name,
        "collection": collection,
        "className": class_name,
        "traits": traits,
        "avatarUrl": image,
        "image": image,
        "wallet": wallet,
        "wins": 0,
        "losses": 0,
        "points": 0,
        "status": status,
        "isPfp": True,
        "stats": normalized_stats,
        "createdAt": created_at,
    }
    battle = {
        "id": "pfp-battle-%s" % int(time.time() * 1000),
        "p1Agent": fighter_id,
        "p1Name": display_name,
        "p1Wallet": wallet,
        "p1AvatarUrl": image,
        "p2Agent": opponent["id"],
        "p2Name": opponent["name"],
        "p2Wallet": "arena.sim",
        "p2AvatarUrl": opponent["avatarUrl"],
        "status": status,
        "isPfp": True,
        "queuePosition": queue_position,
        "createdAt": created_at,
        "updatedAt": created_at,
    }
    notification = {
        "id": "pfp-notif-%s" % int(time.time() * 1000),
        "type": "pfp_battle" if status == "live" else "pfp_queue",
        "title": "PFP battle live" if status == "live" else "PFP fighter queued",
        "message": "%s vs %s" % (display_name, opponent["name"]) if status == "live" else "%s is waiting for the arena." % display_name,
        "icon": "PFP",
        "read": False,
        "createdAt": created_at,
    }
    return {"fighter": fighter, "battle": battle, "notification": notification}, None


def persist_pfp_deploy(record):
    fighter = record["fighter"]
    battle = record["battle"]
    notification = record["notification"]
    if ensure_bota_tables():
        metadata = {
            "collection": fighter.get("collection"),
            "traits": fighter.get("traits") or [],
            "stats": fighter.get("stats") or {},
            "source": "pfp-create",
            "localBattleId": battle.get("id"),
        }
        exec_db("""
            INSERT INTO bota_fighter_profiles (
                agent_id, display_name, origin, origin_id, agent_class, archetype,
                league, avatar_url, badge_label, wallet_address, fame_score, tags,
                metadata, is_pfp, last_seen_at, updated_at
            ) VALUES (
                %s, %s, 'pfp', %s, %s, 'pfp_challenger',
                'PFP League', %s, 'PFP', %s, 50, %s::jsonb,
                %s::jsonb, true, NOW(), NOW()
            )
            ON CONFLICT (agent_id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                agent_class = EXCLUDED.agent_class,
                avatar_url = EXCLUDED.avatar_url,
                wallet_address = EXCLUDED.wallet_address,
                tags = EXCLUDED.tags,
                metadata = EXCLUDED.metadata,
                is_pfp = true,
                updated_at = NOW()
        """, (
            fighter["id"],
            fighter["displayName"],
            fighter["collection"] or fighter["id"],
            fighter["className"],
            fighter["avatarUrl"] or None,
            fighter["wallet"] or None,
            json.dumps(fighter.get("traits") or []),
            json.dumps(metadata),
        ))
        db_battle = exec_db("""
            INSERT INTO bota_arena_battles (
                p1_wallet, p1_agent, p2_wallet, p2_agent, status, is_pfp
            ) VALUES (%s, %s, %s, %s, %s, true)
            RETURNING id
        """, (
            battle.get("p1Wallet") or "pfp.guest",
            battle["p1Agent"],
            battle.get("p2Wallet") or "arena.sim",
            battle["p2Agent"],
            battle["status"],
        ), fetchone=True)
        if db_battle:
            battle["dbId"] = db_battle[0]
        exec_db("""
            INSERT INTO bota_notifications (title, message, type, icon, read)
            VALUES (%s, %s, %s, %s, false)
        """, (
            notification["title"],
            notification["message"],
            notification["type"],
            notification["icon"],
        ))

    STATE.setdefault("pfpFighters", []).append(fighter)
    STATE.setdefault("pfpBattles", []).append(battle)
    STATE.setdefault("notifications", []).insert(0, notification)
    save_state(STATE)

    queue_count = sum(
        1 for queued_battle in STATE.get("pfpBattles", [])
        if queued_battle.get("status") == "queued"
        and (
            not fighter.get("wallet")
            or str(queued_battle.get("p1Wallet") or "").lower() == str(fighter.get("wallet") or "").lower()
        )
    )
    return {
        "success": True,
        "fighter": fighter,
        "battle": battle,
        "notification": notification,
        "queue": queue_count,
    }


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
            self.send_json(STATE["notifications"])
            return
        if path == "/api/notifications/unread-count":
            unread_count = sum(1 for notification in STATE["notifications"] if not notification.get("read", False))
            self.send_json({"unreadCount": unread_count})
            return
        if path == "/api/health":
            self.send_json({"ok": True})
            return
        if path == "/api/pfp/state":
            qs = parse_qs(urlparse(self.path).query)
            wallet = (qs.get("wallet") or [""])[0].strip().lower()
            self.send_json(local_pfp_state(wallet))
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

                r = query_db(
                    "SELECT COUNT(*) FROM bota_fighter_profiles WHERE LOWER(wallet_address)=%s AND COALESCE(is_pfp, false)=true",
                    (wallet,),
                    fetchone=True,
                )
                if r: stats["myAgents"] = max(stats["myAgents"], int(r[0]))

                r = query_db(
                    "SELECT COUNT(*) FROM bota_arena_battles WHERE LOWER(p1_wallet)=%s AND status='queued' AND COALESCE(is_pfp, false)=true",
                    (wallet,),
                    fetchone=True,
                )
                if r: stats["queue"] = max(stats["queue"], int(r[0]))

                local_agents = pfp_rows_for_wallet(wallet)
                local_queue = sum(1 for battle in pfp_battles_for_wallet(wallet) if battle.get("status") == "queued")
                stats["myAgents"] = max(stats["myAgents"], len(local_agents))
                stats["queue"] = max(stats["queue"], local_queue)
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
                rows = query_db(
                    "SELECT agent_id, display_name, avatar_url, wins, losses, fame_score "
                    "FROM bota_fighter_profiles "
                    "WHERE LOWER(wallet_address)=%s AND COALESCE(is_pfp, false)=true "
                    "ORDER BY created_at DESC",
                    (wallet,))
                if rows:
                    seen = {agent["id"] for agent in agents}
                    for r in rows:
                        if r[0] in seen:
                            continue
                        agents.append({"id": r[0], "name": r[1], "avatarUrl": r[2],
                                       "wins": r[3] or 0, "losses": r[4] or 0,
                                       "points": float(r[5] or 0), "status": "pfp"})
                seen = {agent["id"] for agent in agents}
                for fighter in pfp_rows_for_wallet(wallet):
                    if fighter["id"] not in seen:
                        agents.append({"id": fighter["id"], "name": fighter["name"],
                                       "avatarUrl": fighter.get("avatarUrl"),
                                       "wins": fighter.get("wins", 0), "losses": fighter.get("losses", 0),
                                       "points": fighter.get("points", 0), "status": fighter.get("status", "pfp")})
            self.send_json(agents)
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
<<<<<<< HEAD
            seen = {fighter["id"] for fighter in fighters}
            for fighter in STATE.get("pfpFighters", []):
                if fighter["id"] not in seen:
                    fighters.append({"id": fighter["id"], "name": fighter["name"],
                                     "avatarUrl": fighter.get("avatarUrl"),
                                     "wins": fighter.get("wins", 0),
                                     "losses": fighter.get("losses", 0),
                                     "fameScore": fighter.get("points", 0)})
=======
            
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
            
>>>>>>> ecb13e850dee9185b563f001d16fcfd40b27d39d
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
        if path == "/api/pfp/deploy":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length).decode("utf-8") if length else "{}"
                payload = json.loads(body or "{}")
            except Exception:
                self.send_json({"error": "Invalid JSON payload"}, 400)
                return

            record, error = build_pfp_deploy(payload)
            if error:
                self.send_json({"error": error}, 400)
                return

            self.send_json(persist_pfp_deploy(record))
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
