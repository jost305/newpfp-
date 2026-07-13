import json
with open('serve.py', 'r', encoding='utf-8') as f:
    serve_content = f.read()

# 1. Inject POST endpoint in serve.py
old_post = '''        if path == "/api/signup-bonus":'''
new_post = '''        if path == "/api/watch2earn/claim":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8") if length else "{}"
            payload = json.loads(body or "{}")
            amount = payload.get("amount", 0)
            wallet = payload.get("wallet") or STATE["profile"].get("primaryWalletAddress")

            if amount > 0:
                # Update mock state
                STATE["profile"]["bantCredit"] = STATE["profile"].get("bantCredit", 0) + amount
                STATE["profile"]["totalBantCredit"] = STATE["profile"].get("totalBantCredit", 0) + amount
                
                # Push real notification
                import uuid, datetime
                STATE["notifications"].insert(0, {
                    "id": f"notif-w2e-{uuid.uuid4().hex[:8]}",
                    "type": "reward",
                    "title": "Watch 2 Earn payout",
                    "message": f"You earned {amount} BC from spectating a live battle.",
                    "icon": "💰",
                    "read": False,
                    "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
                })
                save_state(STATE)

                # Update database ledger if active
                if wallet:
                    award_bantcredit(wallet, amount, "watch2earn")
                
                self.send_json({"success": True, "reward": amount})
            else:
                self.send_json({"error": "Invalid amount"}, 400)
            return

        if path == "/api/signup-bonus":'''

if "/api/watch2earn/claim" not in serve_content:
    serve_content = serve_content.replace(old_post, new_post)
    with open('serve.py', 'w', encoding='utf-8') as f:
        f.write(serve_content)


# 2. Inject fetch call in index.html
with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_w2e = '''    // Watch2Earn Logic: Award random BC for spectating
    const earned = Math.floor(Math.random() * 15) + 5; // 5 to 20 BC
    userBCBalance += earned;
    
    // Update Profile UI
    const earnedEl = document.getElementById('earned-bc');
    const totalEl = document.getElementById('total-bantcredit');
    if (earnedEl) earnedEl.textContent = userBCBalance.toLocaleString() + ' BC';
    if (totalEl) totalEl.textContent = userBCBalance.toLocaleString() + ' BC';'''

new_w2e = '''    // Watch2Earn Logic: Claim real BC from backend API
    const earned = Math.floor(Math.random() * 15) + 5; // 5 to 20 BC
    fetch('/api/watch2earn/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: earned })
    }).then(r => r.json()).then(data => {
      if (data.success) {
        // Fetch new profile state and notifications to automatically populate UI
        if (window.fetchProfile) window.fetchProfile();
        if (window.fetchNotifications) window.fetchNotifications();
      }
    }).catch(console.error);'''

if "fetch('/api/watch2earn/claim" not in html:
    html = html.replace(old_w2e, new_w2e)
    with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
        f.write(html)

print("Backend endpoint and frontend integration complete!")
