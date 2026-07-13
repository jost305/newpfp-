with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<div class="spell-icon">✏️</div>', '<div class="spell-icon"><img src="/Arena/assets/firearrow/Fire_Arrow_Frame_01.png" style="width: 14px; height: 14px; object-fit: contain; margin-top: 3px;"></div>')

html = html.replace('<div class="spell-circle">🧪</div><div class="spell-label">Potion</div>', '<div class="spell-circle"><img src="/Arena/assets/firearrow/Fire_Arrow_Frame_01.png" style="width: 24px; height: 24px; object-fit: contain;"></div><div class="spell-label">Firearrow</div>')

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Firearrow replaced!')
