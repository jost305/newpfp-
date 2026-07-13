with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Introduce current_match_index
if 'let current_match_index = 0;' not in html:
    html = html.replace('let _pfpPollTimer = null;', 'let _pfpPollTimer = null;\n  let current_match_index = 0;')

# Update renderPumpLiveArena
old_rpa = '''  function renderPumpLiveArena() {
    const waiting = document.getElementById('pf-waiting');
    const liveEl  = document.getElementById('pf-live-match');
    if (!pfState || !liveEl) return;

    if (!pfState.live_match) {'''

new_rpa = '''  window.switchMatch = function(index) {
    current_match_index = index;
    if (pfBattleAnimTimer) clearInterval(pfBattleAnimTimer);
    pfBattleAnimTimer = null;
    
    // Check if we are in PFP mode or PumpFighters mode
    const isPFPMode = document.getElementById('pf-pfp-arena')?.style.display !== 'none';
    if (isPFPMode) {
      renderPFPState(window.lastPfpData);
    } else {
      renderPumpLiveArena();
    }
  };

  function renderPumpLiveArena() {
    const waiting = document.getElementById('pf-waiting');
    const liveEl  = document.getElementById('pf-live-match');
    if (!pfState || !liveEl) return;

    const matches = pfState.live_matches || (pfState.live_match ? [pfState.live_match] : []);
    const match = matches[current_match_index] || matches[0];

    if (!match) {'''
html = html.replace(old_rpa, new_rpa)

# Replace fA and fB assignment in renderPumpLiveArena
old_fA = '''    const fA = pfState.live_match.fighter_a;
    const fB = pfState.live_match.fighter_b;
    const match = pfState.live_match;'''
new_fA = '''    const fA = match.fighter_a;
    const fB = match.fighter_b;'''
html = html.replace(old_fA, new_fA)

# Do the same for renderPFPState
old_pfp = '''  function renderPFPState(data) {
    const waiting  = document.getElementById('av-waiting');
    const liveEl   = document.getElementById('av-live-match');
    if (!liveEl) return;

    const match = data && data.live_match;'''

new_pfp = '''  function renderPFPState(data) {
    window.lastPfpData = data;
    const waiting  = document.getElementById('av-waiting');
    const liveEl   = document.getElementById('av-live-match');
    if (!liveEl) return;

    const matches = (data && data.live_matches) ? data.live_matches : ((data && data.live_match) ? [data.live_match] : []);
    const match = matches[current_match_index] || matches[0];'''
html = html.replace(old_pfp, new_pfp)

# In pendingArenaReset (inside startBattleAnimation), remove auto start
# wait, actually we want to implement autonomous transitioning!
# Instead of pendingArenaReset waiting for backend, it should advance current_match_index!

# Replace pendingArenaReset block:
old_reset = '''        pendingArenaReset = () => {
          if (winner) winner.style.filter = '';
          if (leftCombatant) leftCombatant.classList.remove('attack-left', 'attack-right', 'melee-left', 'melee-right', 'spell-cast-rise', 'hit');
          if (rightCombatant) rightCombatant.classList.remove('attack-left', 'attack-right', 'melee-left', 'melee-right', 'spell-cast-rise', 'hit');
          spellCards.forEach(c => c.style.borderColor = '');
          hpA = maxA; hpB = maxB;
          if (hpBarL) { hpBarL.style.width = '100%'; hpBarL.className = 'pf-hp-bar-fill green'; }
          if (hpBarR) { hpBarR.style.width = '100%'; hpBarR.className = 'pf-hp-bar-fill green'; }
          if (valL) valL.textContent = maxA;
          if (valR) valR.textContent = maxB;
          if (rl) rl.textContent = 'ROUND 1';
          // Wait for backend to push the next live_match instead of looping the same battle instantly.
        };

        setTimeout(() => {
          if (document.getElementById('winner-modal-overlay')?.classList.contains('open')) {
            closeWinnerModal();
          }
        }, 5000);'''

new_reset = '''        pendingArenaReset = () => {
          if (winner) winner.style.filter = '';
          if (leftCombatant) leftCombatant.classList.remove('attack-left', 'attack-right', 'melee-left', 'melee-right', 'spell-cast-rise', 'hit');
          if (rightCombatant) rightCombatant.classList.remove('attack-left', 'attack-right', 'melee-left', 'melee-right', 'spell-cast-rise', 'hit');
          spellCards.forEach(c => c.style.borderColor = '');
          if (hpBarL) { hpBarL.style.width = '100%'; hpBarL.className = 'pf-hp-bar-fill green'; }
          if (hpBarR) { hpBarR.style.width = '100%'; hpBarR.className = 'pf-hp-bar-fill green'; }
          if (rl) rl.textContent = 'ROUND 1';
          
          // Autonomous transition to next match
          current_match_index++;
          if (current_match_index >= 4) current_match_index = 0; // Wrap around
          
          // Switch match visually
          window.switchMatch(current_match_index);
        };

        setTimeout(() => {
          if (document.getElementById('winner-modal-overlay')?.classList.contains('open')) {
            closeWinnerModal(); // This will naturally call pendingArenaReset if we hook it up
          }
        }, 3500); // reduced to 3.5s for faster autonomous flow'''
html = html.replace(old_reset, new_reset)

# Wait, closeWinnerModal() triggers pendingArenaReset().
# Let's ensure closeWinnerModal calls it!
old_close = '''  function closeWinnerModal() {
    const overlay = document.getElementById('winner-modal-overlay');
    if (overlay) overlay.classList.remove('open');
    if (pendingArenaReset) {
      pendingArenaReset();
      pendingArenaReset = null;
    }
  }'''
# This is already perfect in index.html!

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated index.html logic")
