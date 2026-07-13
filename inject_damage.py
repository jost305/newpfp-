with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# For Melee (around line 4789)
html = html.replace("              defender.classList.add('hit');", 
                    "              if (window.spawnDamageNumber) window.spawnDamageNumber(defRect.left + defRect.width / 2, defRect.top + defRect.height / 4, dmg);\n              defender.classList.add('hit');")

# The others use endX and endY
html = html.replace("                  defender.classList.add('hit');", 
                    "                  if (window.spawnDamageNumber) window.spawnDamageNumber(endX, endY - 30, dmg);\n                  defender.classList.add('hit');")

html = html.replace("                defender.classList.add('hit');", 
                    "                if (window.spawnDamageNumber) window.spawnDamageNumber(endX, endY - 30, dmg);\n                defender.classList.add('hit');")

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Injected damage spawning!')
