import re

with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace HornCharge -> Firearrow and its circle
html = html.replace('HornCharge', 'Firearrow')
html = re.sub(r'<div class=\"spell-circle border-gold\">.*?</div>', r'<div class=\"spell-circle border-gold\"><img src=\"/Arena/assets/firearrow/Fire_Arrow_Frame_01.png\" style=\"width: 24px; height: 24px; object-fit: contain;\"></div>', html)

# 2. Replace WingDash -> Thunder Strike and its circle
html = html.replace('WingDash', 'Thunder Strike')
html = re.sub(r'<div class=\"spell-circle border-purple\">.*?</div>', r'<div class=\"spell-circle border-purple\"><img src=\"/Arena/assets/thunder_impact/lightning_skill4_frame2.png\" style=\"width: 24px; height: 24px; object-fit: contain;\"></div>', html)

# 3. Replace in spell-icons under the fighter names
html = re.sub(r'<div class=\"spell-icon\">??</div>', r'<div class=\"spell-icon\"><img src=\"/Arena/assets/firearrow/Fire_Arrow_Frame_01.png\" style=\"width: 14px; height: 14px; object-fit: contain; margin-top: 3px;\"></div>', html)
html = re.sub(r'<div class=\"spell-icon\">?</div>', r'<div class=\"spell-icon\"><img src=\"/Arena/assets/thunder_impact/lightning_skill4_frame2.png\" style=\"width: 14px; height: 14px; object-fit: contain; margin-top: 3px;\"></div>', html)

# 4. Replace in #pf-battle-menu
html = re.sub(r'<div class=\"spell-circle\">?</div>', r'<div class=\"spell-circle\"><img src=\"/Arena/assets/thunder_impact/lightning_skill4_frame2.png\" style=\"width: 18px; height: 18px; object-fit: contain;\"></div>', html)

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Done!')
