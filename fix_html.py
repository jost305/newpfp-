with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('style=width: 85%; height: 85%; object-fit: contain; image-rendering: pixelated;>', 'style="width: 85%; height: 85%; object-fit: contain; image-rendering: pixelated;">')

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Fixed HTML syntax!')
