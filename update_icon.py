with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('>🔈 Sound: OFF<', '>🔇<')
html = html.replace("'🔈 Sound: OFF'", "'🔇'")
html = html.replace("'🔊 Sound: ON'", "'🔊'")

# Also make the floating button a bit more square/circular since it's just an icon now.
old_css = '''    .audio-toggle-floating {
      position: absolute;
      top: 15px;
      right: 15px;
      z-index: 100;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      padding: 6px 12px;'''
new_css = '''    .audio-toggle-floating {
      position: absolute;
      top: 15px;
      right: 15px;
      z-index: 100;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      padding: 8px 10px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;'''
html = html.replace(old_css, new_css)

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated icons!")
