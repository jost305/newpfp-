with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

css = '''
    .floating-damage {
      position: absolute;
      color: #ff4444;
      font-size: 26px;
      font-weight: 900;
      text-shadow: 0 0 6px #000, 2px 2px 0 #000, -1px -1px 0 #000;
      pointer-events: none;
      z-index: 1000;
      animation: dmgFloatUp 1s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }
    @keyframes dmgFloatUp {
      0% { transform: translate(-50%, 0) scale(0.5); opacity: 1; }
      20% { transform: translate(-50%, -30px) scale(1.3); opacity: 1; }
      100% { transform: translate(-50%, -80px) scale(1); opacity: 0; }
    }
'''

if 'dmgFloatUp' not in html:
    html = html.replace('</style>', css + '\n  </style>')

js_func = '''
  window.spawnDamageNumber = function(x, y, amount) {
    if (amount <= 0) return;
    const el = document.createElement('div');
    el.className = 'floating-damage';
    el.textContent = '-' + amount;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    
    // Slight random jitter for x so numbers don't perfectly stack
    const jitter = (Math.random() - 0.5) * 40;
    el.style.marginLeft = jitter + 'px';
    
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 1000);
  };
'''

if 'window.spawnDamageNumber' not in html:
    html = html.replace('window.playExplosionAnimation = function', js_func + '\n  window.playExplosionAnimation = function')

import re

# We need to replace the dmg calculation block in startBattleAnimation
new_dmg_calc = '''      // Calculate damage smoothly over the remaining countdown (secs)
      let dmg = 0;
      if (typeof secs !== 'undefined') {
        const targetHp = isLeftAttacking ? hpB : hpA;
        const remainingAttacks = Math.max(1, (secs / 0.8) / 2);
        
        // Deal proportional damage with 20% variance
        const baseDmg = (targetHp / remainingAttacks) * (Math.random() * 0.4 + 0.8);
        dmg = Math.round(baseDmg * 10) / 10;
        
        if (secs <= 1) {
          // Timer is up, finish the fight!
          if (hpA > hpB) {
             if (isLeftAttacking) dmg = hpB; else dmg = 0;
          } else {
             if (!isLeftAttacking) dmg = hpA; else dmg = 0;
          }
        }
      }

      if (isLeftAttacking) {
        hpB = Math.max(0, hpB - dmg);
      } else {
        hpA = Math.max(0, hpA - dmg);
      }
      round++;'''

# Use regex to find the old dmg calc block and replace it
html = re.sub(r'      // Calculate damage based on the remaining countdown \(secs\).*?round\+\+;', new_dmg_calc, html, flags=re.DOTALL)

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Applied floating damage and fixed logic!')
