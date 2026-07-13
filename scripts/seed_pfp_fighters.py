import json
import os
import uuid
import random
from datetime import datetime, timezone

STATE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app_state.json")

TG_PREFIXES = ["Degen", "Based", "Crypto", "Meme", "Pepe", "Chad", "Giga", "Satoshi", "Whale"]
TG_SUFFIXES = ["Lord", "King", "Ape", "Maxi", "God", "Trader", "Hunter", "Sniper", "Boy"]

TW_PREFIXES = ["@nft", "@punk", "@bored", "@azuki", "@mfer", "@pudgy", "@milady", "@goblin", "@laser"]
TW_SUFFIXES = ["_eth", "_sol", "_nft", "vault", "dao", "hodl", ".eth", ".sol"]

POPULAR_PFPS = [
    "https://cryptologos.cc/logos/pepe-pepe-logo.png",
    "https://cryptologos.cc/logos/dogecoin-doge-logo.png",
    "https://cryptologos.cc/logos/shiba-inu-shib-logo.png",
    "https://cryptologos.cc/logos/bonk1-bonk-logo.png",
    "https://s2.coinmarketcap.com/static/img/coins/200x200/28752.png",
    "https://i.seadn.io/gae/Ju9CkWtV-1Okvf45wo8UctR-M9He2PjILP0oOvxE89AiyiZ5YEdtgRomRwjARG1I4eVA6sq4VDWPFmIGPSDBBkRkXW-kE0bS5w?auto=format&dpr=1&w=1000",
    "https://cryptopunks.app/public/images/cryptopunks/punk0001.png",
    "https://i.seadn.io/gae/yNi-XdGxsgQCPpqSio4o31ygAV6wjcndhqwgqUDIEG5_48qZ6O27mYvW3P-PEX4t27sB3ZzBheK27mB3ZzBheK?auto=format&dpr=1&w=1000",
    "https://i.seadn.io/gcs/files/e9f3b7d159be432f80c65ab7574b6bd1.png",
    "https://cryptologos.cc/logos/floki-inu-floki-logo.png",
    "https://s2.coinmarketcap.com/static/img/coins/200x200/29743.png",
    "https://s2.coinmarketcap.com/static/img/coins/200x200/24478.png",
    "https://i.seadn.io/gae/a_frplnavZA9g4vN3SEXO0CBpzCwfAwv1o-W_4h3B3ZzBheK27mB3ZzBheK?auto=format&dpr=1&w=1000",
    "https://i.seadn.io/gae/BdxvLseXcfl57BiuQcQYdJ64v-aI8din7eit5F4dtV2csZWe2_B4AItq817RjOksqY8wzE_N2N5k-zM8FvD9kG4?auto=format&dpr=1&w=1000",
]

def generate_fighter(platform, index):
    fighter_id = f"fighter-{uuid.uuid4().hex[:8]}"
    
    if platform == "telegram":
        name = f"{random.choice(TG_PREFIXES)}{random.choice(TG_SUFFIXES)}{random.randint(1,99)}"
        avatarUrl = random.choice(POPULAR_PFPS)
        collection = "Telegram OGs"
    else:
        name = f"{random.choice(TW_PREFIXES)}{random.choice(TW_SUFFIXES)}"
        avatarUrl = random.choice(POPULAR_PFPS)
        collection = "Crypto Twitter"

    return {
        "id": fighter_id,
        "name": name,
        "avatarUrl": avatarUrl,
        "collection": collection,
        "class": random.choice(["Brawler", "Mage", "Assassin", "Tank", "Rogue"]),
        "traits": random.choice(["Diamond Hands", "Paper Hands", "FUD Immunity", "Laser Eyes", "Moon Boy"]),
        "hp": random.randint(100, 150),
        "atk": random.randint(15, 35),
        "def": random.randint(10, 25),
        "spd": random.randint(8, 20),
        "agentKit": False,
        "walletAddress": f"0x{uuid.uuid4().hex[:16]}",
        "telegramUserId": random.randint(10000000, 99999999) if platform == "telegram" else None,
        "wins": random.randint(0, 10),
        "losses": random.randint(0, 10),
        "fameScore": round(random.uniform(0.1, 5.0), 2),
        "status": "queued",
        "deployedAt": datetime.now(timezone.utc).isoformat()
    }

def main():
    if not os.path.exists(STATE_PATH):
        print(f"State file {STATE_PATH} not found.")
        return

    with open(STATE_PATH, "r", encoding="utf-8") as f:
        state = json.load(f)
    
    pfp_fighters = state.get("pfp_fighters", [])
    
    print("Seeding 100 new PFP fighters...")
    
    for i in range(50):
        pfp_fighters.append(generate_fighter("telegram", i))
    
    for i in range(50):
        pfp_fighters.append(generate_fighter("twitter", i))
        
    state["pfp_fighters"] = pfp_fighters
    
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)
        
    print(f"Successfully seeded {len(pfp_fighters)} fighters to {STATE_PATH}.")

if __name__ == "__main__":
    main()
