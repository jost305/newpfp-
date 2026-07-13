with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('\\"', '"')

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Fixed quotes!')
