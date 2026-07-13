with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Inject playSFX
sfx_code = '''  //  Audio & Animation Engine 
  let isAudioPlaying = false;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  window.playSFX = function(type) {
    if (!isAudioPlaying) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'hit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'melee_swing') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(400, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'thunder_cast') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.3);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'thunder_impact') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'fireball_cast') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.3);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'fireball_impact') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    }
  };'''

html = html.replace('  //  Audio & Animation Engine \n  let isAudioPlaying = false;', sfx_code)

# 2. Inject melee sound
old_melee = '''            attacker.animate([
              { transform: 'translateX(0) scale(1) rotate(0deg)' },
              { transform: 	ranslateX(px) scale(1.2) rotate(deg), offset: 0.4 },'''
new_melee = '''            if (window.playSFX) window.playSFX('melee_swing');
            attacker.animate([
              { transform: 'translateX(0) scale(1) rotate(0deg)' },
              { transform: 	ranslateX(px) scale(1.2) rotate(deg), offset: 0.4 },'''
html = html.replace(old_melee, new_melee)

old_melee_hit = '''              if (window.playExplosionAnimation) {
                window.playExplosionAnimation(defRect.left + defRect.width / 2, defRect.top + defRect.height / 2);
              }
              if (window.spawnDamageNumber) window.spawnDamageNumber(defRect.left + defRect.width / 2, defRect.top + defRect.height / 4, dmg);
              defender.classList.add('hit');
            }, 200);'''
new_melee_hit = '''              if (window.playExplosionAnimation) {
                window.playExplosionAnimation(defRect.left + defRect.width / 2, defRect.top + defRect.height / 2);
              }
              if (window.playSFX) window.playSFX('hit');
              if (window.spawnDamageNumber) window.spawnDamageNumber(defRect.left + defRect.width / 2, defRect.top + defRect.height / 4, dmg);
              defender.classList.add('hit');
            }, 200);'''
html = html.replace(old_melee_hit, new_melee_hit)

# 3. Inject thunder sound
old_thunder = '''        } else if (attackType < 0.66) {
          // Thunder Strike
          attacker.classList.add('spell-cast-rise');'''
new_thunder = '''        } else if (attackType < 0.66) {
          // Thunder Strike
          if (window.playSFX) window.playSFX('thunder_cast');
          attacker.classList.add('spell-cast-rise');'''
html = html.replace(old_thunder, new_thunder)

old_thunder_hit = '''                window.playThunderAnimation(startX, startY, endX, endY, () => {
                  if (window.playThunderImpact) window.playThunderImpact(endX, endY);
                  if (window.spawnDamageNumber) window.spawnDamageNumber(defRect.left + defRect.width / 2, defRect.top + defRect.height / 4, dmg);
              defender.classList.add('hit');
                });'''
new_thunder_hit = '''                window.playThunderAnimation(startX, startY, endX, endY, () => {
                  if (window.playSFX) window.playSFX('thunder_impact');
                  if (window.playThunderImpact) window.playThunderImpact(endX, endY);
                  if (window.spawnDamageNumber) window.spawnDamageNumber(defRect.left + defRect.width / 2, defRect.top + defRect.height / 4, dmg);
              defender.classList.add('hit');
                });'''
html = html.replace(old_thunder_hit, new_thunder_hit)

# 4. Inject firearrow sound
old_firearrow = '''          // Firearrow
          attacker.classList.add(isLeftAttacking ? 'attack-left' : 'attack-right');'''
new_firearrow = '''          // Firearrow
          if (window.playSFX) window.playSFX('fireball_cast');
          attacker.classList.add(isLeftAttacking ? 'attack-left' : 'attack-right');'''
html = html.replace(old_firearrow, new_firearrow)

old_firearrow_hit = '''            if (window.playProjectileAnimation) {
              window.playProjectileAnimation(startX, startY, endX, endY, () => {
                if (window.playExplosionAnimation) window.playExplosionAnimation(endX, endY);
                if (window.spawnDamageNumber) window.spawnDamageNumber(defRect.left + defRect.width / 2, defRect.top + defRect.height / 4, dmg);
              defender.classList.add('hit');
              });'''
new_firearrow_hit = '''            if (window.playProjectileAnimation) {
              window.playProjectileAnimation(startX, startY, endX, endY, () => {
                if (window.playSFX) window.playSFX('fireball_impact');
                if (window.playExplosionAnimation) window.playExplosionAnimation(endX, endY);
                if (window.spawnDamageNumber) window.spawnDamageNumber(defRect.left + defRect.width / 2, defRect.top + defRect.height / 4, dmg);
              defender.classList.add('hit');
              });'''
html = html.replace(old_firearrow_hit, new_firearrow_hit)

with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Injected procedural audio!")
