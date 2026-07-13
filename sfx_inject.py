with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

sfx_code = '''  // --- Procedural Audio Engine ---
  let audioCtx;
  function initAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  window.playSFX = function(type) {
    if (!isAudioPlaying) return;
    initAudioCtx();
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
  };

  window.toggleAudio = function() {'''

if "Procedural Audio Engine" not in html:
    html = html.replace('  window.toggleAudio = function() {', sfx_code)

    # Add initAudioCtx inside toggleAudio play block
    old_toggle = '''      audio.play().then(() => {
        isAudioPlaying = true;
        if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }'''
    new_toggle = '''      audio.play().then(() => {
        isAudioPlaying = true;
        initAudioCtx();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }'''
    html = html.replace(old_toggle, new_toggle)

    with open('game/Arena/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Injected SFX successfully this time.")
else:
    print("Already injected.")
