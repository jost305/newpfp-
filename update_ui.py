with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Update renderLiveBattles (PumpFighters mode)
old_rlb = '''  function renderLiveBattles() {
    const list = document.getElementById('live-battles-list');
    if (!list || !pfState || !pfState.fighters) return;

    let html = '';
    const fighters = pfState.fighters;
    // Create pairs for battles
    for (let i = 0; i < fighters.length - 1; i += 2) {
      if (i >= 6) break; // Limit to 3 battles max
      const f1 = fighters[i];
      const f2 = fighters[i+1];'''

new_rlb = '''  function renderLiveBattles() {
    const list = document.getElementById('live-battles-list');
    if (!list || !pfState) return;

    const matches = pfState.live_matches || (pfState.live_match ? [pfState.live_match] : []);
    let html = '';
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const f1 = match.fighter_a;
      const f2 = match.fighter_b;
      const isActive = i === current_match_index ? 'border: 1px solid #14F195; box-shadow: 0 0 10px rgba(20,241,149,0.3);' : '';'''
html = html.replace(old_rlb, new_rlb)

# Add onclick to the item and apply isActive
old_rlb_item = '''      html += 
        <div class="pfpmode-item">
          <div class="pfpmode-match"><span style=""></span><span></span> <span style="color:#666; font-size:10px;">VS</span> <span style=""></span><span></span></div>
          <div class="pfpmode-badge">LIVE</div>
        </div>
      ;'''
new_rlb_item = '''      html += 
        <div class="pfpmode-item" style=" cursor:pointer;" onclick="window.switchMatch()">
          <div class="pfpmode-match"><span style=""></span><span></span> <span style="color:#666; font-size:10px;">VS</span> <span style=""></span><span></span></div>
          <div class="pfpmode-badge">LIVE</div>
        </div>
      ;'''
html = html.replace(old_rlb_item, new_rlb_item)

# Update renderSidebarLiveBattles (PFP mode)
old_rslb = '''  function renderSidebarLiveBattles() {
    const sb = document.getElementById('sidebar-live-battles');
    if (!sb || !pfState || !pfState.fighters) return;

    let html = '';
    const fighters = pfState.fighters;
    for (let i = 4; i < fighters.length - 1; i += 2) {
      if (i >= 12) break; // Limit to 4 matches
      const f1 = fighters[i];
      const f2 = fighters[i+1];'''

new_rslb = '''  function renderSidebarLiveBattles() {
    const sb = document.getElementById('sidebar-live-battles');
    if (!sb || !window.lastPfpData) return;

    const data = window.lastPfpData;
    const matches = data.live_matches || (data.live_match ? [data.live_match] : []);
    let html = '';
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const f1 = match.fighter_a;
      const f2 = match.fighter_b;
      const isActive = i === current_match_index ? 'border: 1px solid #14F195; box-shadow: 0 0 10px rgba(20,241,149,0.3);' : '';'''
html = html.replace(old_rslb, new_rslb)

# Update the item for PFP side bar
old_rslb_item = '''      html += 
        <div class="av-sidebar-match">
          <div class="av-sidebar-vs">
            <div class="av-sidebar-fighter">
              <span style=""></span>
              <span></span>
            </div>
            <div class="av-sidebar-vs-text">VS</div>
            <div class="av-sidebar-fighter">
              <span style=""></span>
              <span></span>
            </div>
          </div>
          <div class="av-watch2earn-btn" onclick="window.avWatchToEarn()">? Watch2Earn</div>
        </div>
      ;'''
new_rslb_item = '''      html += 
        <div class="av-sidebar-match" style="">
          <div class="av-sidebar-vs">
            <div class="av-sidebar-fighter">
              <span style=""></span>
              <span></span>
            </div>
            <div class="av-sidebar-vs-text">VS</div>
            <div class="av-sidebar-fighter">
              <span style=""></span>
              <span></span>
            </div>
          </div>
          <div class="av-watch2earn-btn" onclick="window.switchMatch()">? Watch2Earn</div>
        </div>
      ;'''
html = html.replace(old_rslb_item, new_rslb_item)


# Shrink the Winner Modal via CSS
css = '''
    .winner-modal-card {
      width: 320px;
      padding: 20px;
      border-radius: 12px;
      background: #111;
      border: 1px solid #333;
      text-align: center;
      position: relative;
    }
    .winner-modal-title {
      font-size: 24px;
      margin-bottom: 15px;
    }
    .winner-modal-body {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .winner-modal-btn {
      padding: 8px 16px;
      font-size: 14px;
    }
'''
if '320px' not in html:
    html = html.replace('.winner-modal-card {', css + '  .winner-modal-card-ignore {')

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated UI logic")
