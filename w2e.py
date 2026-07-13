with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add global BC state
state_code = '''  let isAudioPlaying = false;
  let userBCBalance = 0; // Local Watch2Earn Balance
'''
html = html.replace('  let isAudioPlaying = false;', state_code)

# 2. Update showWinnerModal to award BC
old_modal = '''  function showWinnerModal(winnerName, loserName) {
    const overlay = document.getElementById('winner-modal-overlay');'''

new_modal = '''  function showWinnerModal(winnerName, loserName) {
    const overlay = document.getElementById('winner-modal-overlay');
    
    // Watch2Earn Logic: Award random BC for spectating
    const earned = Math.floor(Math.random() * 15) + 5; // 5 to 20 BC
    userBCBalance += earned;
    
    // Update Profile UI
    const earnedEl = document.getElementById('earned-bc');
    const totalEl = document.getElementById('total-bantcredit');
    if (earnedEl) earnedEl.textContent = userBCBalance.toLocaleString() + ' BC';
    if (totalEl) totalEl.textContent = userBCBalance.toLocaleString() + ' BC';
'''
html = html.replace(old_modal, new_modal)

# Also let's show a small +BC floating notification when the battle ends in the modal body!
old_body = '''      body.innerHTML = 
        <div class="winner-matchup"></div>
        <div class="winner-detail">defeated  in the arena</div>
      ;'''
new_body = '''      body.innerHTML = 
        <div class="winner-matchup"></div>
        <div class="winner-detail">defeated  in the arena</div>
        <div style="margin-top:15px; font-weight:800; color:#F3BA2F;">Watch2Earn: + BC</div>
      ;'''
html = html.replace(old_body, new_body)


with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Added Watch2Earn logic!")
