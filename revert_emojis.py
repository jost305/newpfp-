with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re

# 1. Revert spell-icons
html = html.replace('<div class="spell-icon"><img src="/Arena/assets/firearrow/Fire_Arrow_Frame_01.png" style="width: 85%; height: 85%; object-fit: contain; image-rendering: pixelated;"></div>', '<div class="spell-icon">✏️</div>')
html = html.replace('<div class="spell-icon"><img src="/Arena/assets/thunder_impact/lightning_skill4_frame2.png" style="width: 85%; height: 85%; object-fit: contain; image-rendering: pixelated;"></div>', '<div class="spell-icon">⚡</div>')

# 2. Revert #pf-battle-menu
html = html.replace('<div class="spell-btn"><div class="spell-circle"><img src="/Arena/assets/firearrow/Fire_Arrow_Frame_01.png" style="width: 85%; height: 85%; object-fit: contain; image-rendering: pixelated;"></div><div class="spell-label">Firearrow</div></div>', '<div class="spell-btn"><div class="spell-circle">🧪</div><div class="spell-label">Potion</div></div>')
html = html.replace('<div class="spell-btn"><div class="spell-circle"><img src="/Arena/assets/thunder_impact/lightning_skill4_frame2.png" style="width: 85%; height: 85%; object-fit: contain; image-rendering: pixelated;"></div><div class="spell-label">Thunder</div></div>', '<div class="spell-btn"><div class="spell-circle">⚡</div><div class="spell-label">Thunder</div></div>')

# 3. Revert .pf-bottom-spell Firearrow/HornCharge
html = html.replace('<div class="spell-circle border-gold"><img src="/Arena/assets/firearrow/Fire_Arrow_Frame_01.png" style="width: 85%; height: 85%; object-fit: contain; image-rendering: pixelated;"></div>', '<div class="spell-circle border-gold">⚔️</div>')
html = html.replace('<div class="spell-title">Firearrow</div>', '<div class="spell-title">HornCharge</div>')

# 4. Revert .pf-bottom-spell Thunder/WingDash
html = html.replace('<div class="spell-circle border-purple"><img src="/Arena/assets/thunder_impact/lightning_skill4_frame2.png" style="width: 85%; height: 85%; object-fit: contain; image-rendering: pixelated;"></div>', '<div class="spell-circle border-purple">🐾</div>')
html = html.replace('<div class="spell-title">Thunder Strike</div>', '<div class="spell-title">WingDash</div>')

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Reverted to emojis!')
