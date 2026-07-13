with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
import re
html = re.sub(r'style=\"width: \d+px; height: \d+px; object-fit: contain;[^\"]*\"', r'style=\"width: 85%; height: 85%; object-fit: contain; image-rendering: pixelated;\"', html)

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Fixed sizes and pixelation!')
