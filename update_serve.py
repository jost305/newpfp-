with open('serve.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Init state
code = code.replace('"pfp_live_match": None,', '"pfp_live_matches": [],')

# 2. Endpoint response
code = code.replace('"pfp_live_match": data.get("pfp_live_match"),', '"pfp_live_matches": data.get("pfp_live_matches", []),')

# 3. Matchmaker logic
old_mm = '''                live = STATE.get("pfp_live_match")

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
                    "xp_a":          result["xp_a"],
                    "xp_b":          result["xp_b"],
                    "status":        "live",
                    "started_at":    datetime.now(timezone.utc).isoformat()
                }'''

new_mm = '''                lives = STATE.get("pfp_live_matches", [])

                # ── 1. Finish any completed live match ─────────────────────
                active_lives = []
                for live in lives:
                    if live and live.get("status") == "live":
                        started = datetime.fromisoformat(
                            live["started_at"].replace("Z", "+00:00")
                        )
                        battle_duration = live.get("rounds_fought", 10) * _SECS_PER_ROUND
                        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
                        if elapsed >= battle_duration:
                            live["status"] = "finished"
                            _pfp_finish_battle(live)
                        else:
                            active_lives.append(live)
                
                STATE["pfp_live_matches"] = active_lives

                # ── 2. Start a new match if queue has ≥ 2 fighters ────────
                while len(STATE["pfp_live_matches"]) < 4:
                    queued = [f for f in STATE.get("pfp_fighters", [])
                              if f.get("status") == "queued"]
                    if len(queued) < 2:
                        break

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
                    STATE["pfp_live_matches"].append({
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
                        "xp_a":          result["xp_a"],
                        "xp_b":          result["xp_b"],
                        "status":        "live",
                        "started_at":    datetime.now(timezone.utc).isoformat()
                    })'''
code = code.replace(old_mm, new_mm)

# API endpoint fix
code = code.replace('live = STATE.get("pfp_live_match")', 'live = STATE.get("pfp_live_matches")')

with open('serve.py', 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated serve.py")
