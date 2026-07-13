with open('trending_engine.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace initial state dict
code = code.replace('"live_match": None,', '"live_matches": [],')

# Replace the match selection logic
old_select = '''        live_match = None

        for match in match_queue:
            result = simulate_battle(match["fighter_a"], match["fighter_b"])'''

new_select = '''        live_matches = []

        for match in match_queue:
            result = simulate_battle(match["fighter_a"], match["fighter_b"])'''
code = code.replace(old_select, new_select)

old_logic = '''        # Pick one match as the "live" display match (prefer chain rivalry)
        if match_queue:
            priority = ["KING_CLASH", "SOL_VS_BSC", "BSC_VS_BASE", "SOL_VS_BASE", "BALANCED"]
            for ptype in priority:
                m = next((m for m in match_queue if m["match_type"] == ptype), None)
                if m:
                    live_match = {
                        "fighter_a":  m["fighter_a"],
                        "fighter_b":  m["fighter_b"],
                        "match_type": m["match_type"],
                        "label":      m["label"],
                    }
                    break'''

new_logic = '''        # Pick up to 4 matches for the "live" display (prefer chain rivalry)
        if match_queue:
            priority = ["KING_CLASH", "SOL_VS_BSC", "BSC_VS_BASE", "SOL_VS_BASE", "BALANCED"]
            picked = []
            for ptype in priority:
                for m in match_queue:
                    if m["match_type"] == ptype and m not in picked:
                        picked.append(m)
                    if len(picked) >= 4:
                        break
                if len(picked) >= 4:
                    break
            
            for m in match_queue:
                if len(picked) >= 4: break
                if m not in picked:
                    picked.append(m)
            
            live_matches = [{
                "fighter_a":  m["fighter_a"],
                "fighter_b":  m["fighter_b"],
                "match_type": m["match_type"],
                "label":      m["label"],
            } for m in picked]'''
code = code.replace(old_logic, new_logic)

# Replace the assignment to _state
code = code.replace('_state["live_match"]     = live_match', '_state["live_matches"] = live_matches')

# Replace the bootstrap fallback
old_bootstrap = '''        live_match = match_queue[0] if match_queue else None

        with _lock:
            _state["fighters"]       = clean
            _state["live_match"]     = live_match'''

new_bootstrap = '''        live_matches = match_queue[:4] if match_queue else []

        with _lock:
            _state["fighters"]       = clean
            _state["live_matches"]   = live_matches'''
code = code.replace(old_bootstrap, new_bootstrap)

with open('trending_engine.py', 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated trending_engine.py")
