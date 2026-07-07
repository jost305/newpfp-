"""
Market Energy Engine - PumpFighters
=====================================
Converts live market events from DexScreener into combat energy.

Player-facing name : Pump Energy / PUMP READY / Pump Ability
Code names         : MarketEnergyEngine, marketEnergy, marketEnergyEvents

Architecture:
    Market snapshot (DexScreener poll)
        -> MarketEventEngine  (diff snapshots -> generate events)
        -> MarketEnergyEngine (apply events -> update energy per fighter)
        -> PumpAbilityQueue   (energy=100 -> ability unlocked)
        -> AI Battle Engine   (decides when to cast)
"""

import random
import threading
from typing import Dict, List, Optional

# =============================================================================
# PUMP ABILITIES  (player-facing name; unique per coin)
# =============================================================================

_KNOWN_ABILITIES = {
    "PEPE":    {"name": "Meme Tsunami",   "effect": "stun",      "damage_mult": 1.8, "emoji": "wave"},
    "DOGE":    {"name": "Lunar Bark",     "effect": "shield",    "damage_mult": 1.5, "emoji": "rocket"},
    "BONK":    {"name": "Bonk Barrage",   "effect": "multi_hit", "damage_mult": 1.3, "emoji": "hammer"},
    "FLOKI":   {"name": "Viking Fury",    "effect": "rage",      "damage_mult": 2.0, "emoji": "bolt"},
    "SHIB":    {"name": "Shiba Swarm",    "effect": "multi_hit", "damage_mult": 1.4, "emoji": "paw"},
    "WIF":     {"name": "Hat Trick",      "effect": "dodge",     "damage_mult": 1.6, "emoji": "hat"},
    "POPCAT":  {"name": "Pop Burst",      "effect": "stun",      "damage_mult": 1.7, "emoji": "burst"},
    "TRUMP":   {"name": "Deal Breaker",   "effect": "shield",    "damage_mult": 1.9, "emoji": "flag"},
    "MAGA":    {"name": "Rally Surge",    "effect": "rage",      "damage_mult": 1.8, "emoji": "fire"},
    "BRETT":   {"name": "Base Slam",      "effect": "stun",      "damage_mult": 1.6, "emoji": "blue"},
    "TOSHI":   {"name": "Paw Strike",     "effect": "multi_hit", "damage_mult": 1.4, "emoji": "paw"},
    "PONKE":   {"name": "Monkey Rage",    "effect": "rage",      "damage_mult": 1.7, "emoji": "monkey"},
}

_ABILITY_TEMPLATES = [
    {"name_tmpl": "{name} Surge",    "effect": "rage",      "damage_mult": 1.5, "emoji": "bolt"},
    {"name_tmpl": "{name} Blast",    "effect": "stun",      "damage_mult": 1.6, "emoji": "burst"},
    {"name_tmpl": "{name} Shield",   "effect": "shield",    "damage_mult": 1.4, "emoji": "shield"},
    {"name_tmpl": "{name} Barrage",  "effect": "multi_hit", "damage_mult": 1.3, "emoji": "hammer"},
    {"name_tmpl": "{name} Moonshot", "effect": "dodge",     "damage_mult": 1.7, "emoji": "rocket"},
    {"name_tmpl": "{name} Frenzy",   "effect": "rage",      "damage_mult": 1.8, "emoji": "fire"},
]


def get_pump_ability(display_name):
    key = display_name.upper().strip()
    if key in _KNOWN_ABILITIES:
        return dict(_KNOWN_ABILITIES[key])
    idx = sum(ord(c) for c in key) % len(_ABILITY_TEMPLATES)
    tmpl = _ABILITY_TEMPLATES[idx]
    short = key[:8]
    return {
        "name":        tmpl["name_tmpl"].format(name=short),
        "effect":      tmpl["effect"],
        "damage_mult": tmpl["damage_mult"],
        "emoji":       tmpl["emoji"],
    }


# =============================================================================
# MARKET EVENT DEFINITIONS
# =============================================================================

MARKET_EVENTS = {
    "MARKET_CAP_UP_5":   +20,
    "MARKET_CAP_UP_10":  +30,
    "VOLUME_SPIKE":      +15,
    "HOLDER_GROWTH":     +10,
    "WHALE_BUY":         +30,
    "TRENDING_RANK_UP":  +15,
    "NEW_ALL_TIME_HIGH": +40,
    "KING_OF_HILL":      +50,
    "MARKET_CAP_DOWN_5": -15,
    "MARKET_CAP_DOWN_10":-25,
    "WHALE_SELL":        -20,
    "LIQUIDITY_REMOVED": -30,
    "NEW_ALL_TIME_LOW":  -20,
}


def generate_market_events(prev, curr):
    events = []
    prev_mcap = float(prev.get("market_cap_usd") or 0)
    curr_mcap = float(curr.get("market_cap_usd") or 0)
    prev_vol  = float(prev.get("volume_24h_usd") or 0)
    curr_vol  = float(curr.get("volume_24h_usd") or 0)

    if prev_mcap > 0:
        mcap_pct = (curr_mcap - prev_mcap) / prev_mcap * 100
        if mcap_pct >= 10:
            events.append("MARKET_CAP_UP_10")
        elif mcap_pct >= 5:
            events.append("MARKET_CAP_UP_5")
        elif mcap_pct <= -10:
            events.append("MARKET_CAP_DOWN_10")
        elif mcap_pct <= -5:
            events.append("MARKET_CAP_DOWN_5")

    if prev_vol > 0 and curr_vol > 0:
        vol_pct = (curr_vol - prev_vol) / prev_vol * 100
        if vol_pct >= 50:
            events.append("VOLUME_SPIKE")

    if curr.get("is_king") and not prev.get("is_king"):
        events.append("KING_OF_HILL")

    return events


def generate_simulated_events(fighter):
    """Fallback: weighted random events when no prev snapshot."""
    events = []
    roll = random.random()
    if roll < 0.35:
        events.append(random.choice(["MARKET_CAP_UP_5", "VOLUME_SPIKE", "HOLDER_GROWTH"]))
    elif roll < 0.55:
        events.append("WHALE_BUY")
    elif roll < 0.65:
        events.append("MARKET_CAP_DOWN_5")
    elif roll < 0.72:
        events.append("WHALE_SELL")
    if fighter.get("is_king") and random.random() < 0.2:
        events.append("KING_OF_HILL")
    return events


# =============================================================================
# MARKET ENERGY ENGINE
# =============================================================================

class MarketEnergyEngine:
    def __init__(self):
        self._lock = threading.Lock()
        self._state = {}
        self._prev_snapshots = {}

    def _ensure(self, uid, display_name):
        if uid not in self._state:
            self._state[uid] = {
                "energy":        0,
                "ability_ready": False,
                "ability":       get_pump_ability(display_name),
                "events_this_tick": [],
            }

    def update(self, fighter):
        uid          = fighter["unique_id"]
        display_name = fighter.get("display_name", "")
        prev         = self._prev_snapshots.get(uid)

        events = generate_market_events(prev, fighter) if prev else generate_simulated_events(fighter)

        self._prev_snapshots[uid] = {
            "market_cap_usd": fighter.get("market_cap_usd", 0),
            "volume_24h_usd": fighter.get("volume_24h_usd", 0),
            "is_king":        fighter.get("is_king", False),
        }

        delta = sum(MARKET_EVENTS.get(e, 0) for e in events)

        with self._lock:
            self._ensure(uid, display_name)
            s = self._state[uid]
            s["energy"]           = max(0, min(100, s["energy"] + delta))
            s["ability_ready"]    = s["energy"] >= 100
            s["events_this_tick"] = events
            return dict(s)

    def get(self, uid):
        with self._lock:
            return dict(self._state.get(uid, {}))

    def consume_ability(self, uid):
        with self._lock:
            if uid in self._state:
                self._state[uid]["energy"]        = 0
                self._state[uid]["ability_ready"] = False

    def all_states(self):
        with self._lock:
            return {uid: dict(s) for uid, s in self._state.items()}


# =============================================================================
# AI ABILITY DECISION
# =============================================================================

def ai_should_cast_ability(energy_state, fighter_hp_pct, opponent_hp_pct,
                            is_last_round, opponent_is_stunned=False):
    if not energy_state.get("ability_ready"):
        return False
    if fighter_hp_pct < 0.35:
        return True
    if opponent_is_stunned:
        return True
    if is_last_round:
        return True
    if fighter_hp_pct > 0.70 and opponent_hp_pct < 0.40:
        return True
    if fighter_hp_pct > 0.60 and random.random() < 0.25:
        return True
    return False


def apply_pump_ability(ability, attacker_hp, defender_hp):
    effect      = ability.get("effect", "rage")
    mult        = ability.get("damage_mult", 1.5)
    name        = ability.get("name", "Pump Ability")
    emoji_key   = ability.get("emoji", "bolt")

    EMOJI = {
        "wave":"🌊","rocket":"🚀","hammer":"🔨","bolt":"⚡","paw":"🐾",
        "hat":"🎩","burst":"💥","flag":"🇺🇸","fire":"🔥","blue":"🔵",
        "monkey":"🐒","shield":"🛡️",
    }
    emoji = EMOJI.get(emoji_key, "⚡")

    extra_dmg   = 0.0
    shield_heal = 0.0
    log_entry   = f"PUMP {emoji} {name.upper()} ACTIVATED!"

    if effect == "stun":
        extra_dmg = 15.0 * mult
        log_entry += f" STUN — {int(extra_dmg)} BONUS DMG"
    elif effect == "rage":
        extra_dmg = 20.0 * mult
        log_entry += f" RAGE — {int(extra_dmg)} DMG"
    elif effect == "multi_hit":
        extra_dmg = 10.0 * mult * 2
        log_entry += f" MULTI — {int(extra_dmg)} TOTAL DMG"
    elif effect == "shield":
        shield_heal = 15.0
        log_entry += f" SHIELD — +{int(shield_heal)} HP"
    elif effect == "dodge":
        shield_heal = 10.0
        log_entry += f" DODGE — +{int(shield_heal)} HP"

    new_defender_hp = max(0, defender_hp - extra_dmg)
    new_attacker_hp = min(100, attacker_hp + shield_heal)

    return new_defender_hp, new_attacker_hp, effect, log_entry


# Singleton
market_energy_engine = MarketEnergyEngine()
