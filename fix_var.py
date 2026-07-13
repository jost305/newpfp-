with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('let pendingArenaReset = null;', 'let pendingArenaReset = null;\n  let current_match_index = 0;')

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
