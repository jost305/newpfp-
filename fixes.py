with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix CSS syntax error
old_css_error = '''    .winner-modal-btn {
      padding: 8px 16px;
      font-size: 14px;
    }
  .winner-modal-card-ignore {
      background: rgba(15,23,42,0.98); border: 1px solid rgba(255,255,255,0.12);'''

new_css_error = '''    .winner-modal-btn {
      padding: 8px 16px;
      font-size: 14px;
    }
    .winner-modal-card-ignore {
      background: rgba(15,23,42,0.98); border: 1px solid rgba(255,255,255,0.12);'''

html = html.replace(old_css_error, new_css_error)

# Fix .nav-tab font
old_nav_tab = '''.nav-tab {
      background: transparent; border: none; color: var(--bb-muted-foreground);
      font-size: 13px; font-weight: 700; padding: 6px 10px; border-radius: 6px; cursor: pointer; transition: 0.2s;
      white-space: nowrap; text-transform: uppercase; letter-spacing: 0.5px;
    }'''

new_nav_tab = '''.nav-tab {
      background: transparent; border: none; color: var(--bb-muted-foreground);
      font-family: inherit;
      font-size: 13px; font-weight: 700; padding: 6px 10px; border-radius: 6px; cursor: pointer; transition: 0.2s;
      white-space: nowrap; text-transform: uppercase; letter-spacing: 0.5px;
    }'''
html = html.replace(old_nav_tab, new_nav_tab)

# 2. Move sound to arena edge
# Add floating audio toggle
audio_css = '''
    .audio-toggle-floating {
      position: absolute;
      top: 15px;
      right: 15px;
      z-index: 100;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      padding: 6px 12px;
      border-radius: 20px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      backdrop-filter: blur(4px);
      transition: 0.2s;
    }
    .audio-toggle-floating:hover {
      background: rgba(255, 255, 255, 0.1);
    }
'''
if '.audio-toggle-floating' not in html:
    html = html.replace('</style>', audio_css + '\n  </style>')

# Remove old audio toggles
html = html.replace('<button class="nav-tab" id="audio-toggle" onclick="toggleAudio()" style="margin-left:auto; background:var(--bb-surface); border:1px solid var(--bb-border);">🔈 Sound: OFF</button>', '')
html = html.replace('<button class="nav-tab" id="audio-toggle-mobile" onclick="toggleAudio()" style="background:var(--bb-surface); border:1px solid var(--bb-border);">🔈 Sound: OFF</button>', '')

# Insert floating audio toggle into pf-arena-container and av-arena-container
old_pf_arena = '''<div class="pf-arena" id="pf-arena-container">
      <div class="pf-arena-grid"></div>'''
new_pf_arena = '''<div class="pf-arena" id="pf-arena-container">
      <button class="audio-toggle-floating" id="audio-toggle-pf" onclick="toggleAudio()">🔈 Sound: OFF</button>
      <div class="pf-arena-grid"></div>'''
html = html.replace(old_pf_arena, new_pf_arena)

old_av_arena = '''<div class="pf-arena" id="av-arena-container">
      <div class="pf-arena-grid"></div>'''
new_av_arena = '''<div class="pf-arena" id="av-arena-container">
      <button class="audio-toggle-floating" id="audio-toggle-av" onclick="toggleAudio()">🔈 Sound: OFF</button>
      <div class="pf-arena-grid"></div>'''
html = html.replace(old_av_arena, new_av_arena)

# Update JS toggleAudio to use the new IDs
old_toggle = '''    const btn = document.getElementById('audio-toggle');
    const btnMob = document.getElementById('audio-toggle-mobile');'''
new_toggle = '''    const btn = document.getElementById('audio-toggle-pf');
    const btnMob = document.getElementById('audio-toggle-av');'''
html = html.replace(old_toggle, new_toggle)

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Applied fixes!")
