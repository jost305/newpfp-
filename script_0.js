
  // ── Privy auth bootstrap ──────────────────────────────────────────────────
  // Versions are pinned so a Privy release cannot silently break compatibility.
  // React 19 is used throughout to match @privy-io/react-auth@3.33.1's peer dep.
  const PRIVY_REACT_VERSION  = '19.2.7';
  const PRIVY_PKG_VERSION    = '3.33.1';

  let React = null;
  let ReactDOM = null;
  let PrivyProvider = null;
  let useLogin = null;
  let usePrivy = null;
  let privyBootOk = false;

  try {
    const reactModule    = await import(`https://esm.sh/react@${PRIVY_REACT_VERSION}`);
    React = reactModule.default ?? reactModule;
    const reactDomModule = await import(`https://esm.sh/react-dom@${PRIVY_REACT_VERSION}/client`);
    ReactDOM = reactDomModule.default ?? reactDomModule;
    const privyModule    = await import(
      `https://esm.sh/@privy-io/react-auth@${PRIVY_PKG_VERSION}` +
      `?deps=react@${PRIVY_REACT_VERSION},react-dom@${PRIVY_REACT_VERSION}`
    );
    ({ PrivyProvider, useLogin, usePrivy } = privyModule);
    privyBootOk = true;
  } catch (err) {
    console.error('[Privy] Failed to load auth modules:', err);
    // Show a visible indicator on the LOGIN button so users know login is unavailable.
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
      authBtn.textContent = 'LOGIN UNAVAILABLE';
      authBtn.disabled = true;
      authBtn.title = 'Wallet login could not be loaded. Please refresh.';
      authBtn.style.opacity = '0.5';
      authBtn.style.cursor = 'not-allowed';
    }
  }

  const PRIVY_APP_ID = 'cm4winhli04jg1tvq07cb8942';
  let privyLoginHandler = null;

  function openPrivyAuthModal() {
    if (!privyBootOk) {
      alert('Wallet login is temporarily unavailable. Please refresh the page.');
      return;
    }
    if (privyLoginHandler) {
      privyLoginHandler({
        loginMethods: ['wallet', 'email', 'passkey', 'google', 'twitter', 'telegram', 'discord', 'github'],
      });
      return;
    }
    console.warn('Privy login handler is not ready yet.');
  }

  window.openPrivyAuthModal = openPrivyAuthModal;
  window.closePrivyAuthModal = () => {};

  if (privyBootOk) {
    function AuthButton() {
      const { ready, authenticated, user } = usePrivy();
      const { login } = useLogin({
        onComplete: () => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('privy-auth-complete'));
          }
        },
        onError: (error) => console.error('Privy login failed', error),
      });

      React.useEffect(() => {
        privyLoginHandler = login;
      }, [login]);

      // Expose wallet address and full user object globally
      React.useEffect(() => {
        if (authenticated && user) {
          const wallet = user.wallet?.address || user.linkedAccounts?.find(a => a.type === 'wallet')?.address || '';
          window.currentWalletAddress = wallet.toLowerCase();
          window.privyUser = user;          // expose so cpImportPFP & deploy can read linkedAccounts
        } else {
          window.currentWalletAddress = '';
          window.privyUser = null;
        }
      }, [authenticated, user]);

      // Sync the real nav button and profile icon to auth state
      React.useEffect(() => {
        const btn = document.getElementById('auth-btn');
        const profileIcon = document.getElementById('profile-icon-btn');
        if (!btn) return;

        if (!ready) {
          btn.textContent = 'LOADING…';
          btn.disabled = true;
          if (profileIcon) profileIcon.style.display = 'none';
          return;
        }

        if (authenticated) {
          btn.textContent = 'DASHBOARD';
          btn.disabled = false;
          btn.onclick = () => openProfileView();
          if (profileIcon) profileIcon.style.display = '';
          // Load live data now that we know the wallet
          setTimeout(() => {
            if (window.currentWalletAddress) {
              loadUserStats(window.currentWalletAddress);
              loadMyAgents(window.currentWalletAddress);
            }
          }, 200);
        } else {
          btn.textContent = 'LOGIN';
          btn.disabled = false;
          btn.onclick = () => window.openPrivyAuthModal ? window.openPrivyAuthModal() : null;
          if (profileIcon) profileIcon.style.display = 'none';
        }
      }, [ready, authenticated]);

      // This component only manages state; the visible button is in the real DOM
      return null;
    }

    function PrivyAuthShell() {
      return React.createElement(
        PrivyProvider,
        {
          appId: PRIVY_APP_ID,
          config: {
            loginMethods: ['wallet', 'email', 'passkey', 'google', 'twitter', 'telegram', 'discord', 'github'],
            appearance: {
              theme: 'dark',
              accentColor: '#f59e0b',
              logo: '/Arena/assets/bota-logo.jpg',
            },
          },
        },
        React.createElement(AuthButton)
      );
    }

    const authHost = document.getElementById('auth-button-host');
    if (authHost) {
      const root = ReactDOM.createRoot(authHost);
      root.render(React.createElement(PrivyAuthShell));
    }
  }

  function toggleSearchModal(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('search-modal');
    if (!modal) return;
    const willOpen = !modal.classList.contains('open');
    modal.classList.toggle('open', willOpen);
    if (willOpen) {
      const input = modal.querySelector('input');
      if (input) setTimeout(() => input.focus(), 40);
    }
  }

  function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) modal.classList.remove('open');
  }

    function setTab(el) {
    closeSearchModal();
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    // Add active class to both desktop and mobile nav tabs with this view
    const view = el.getAttribute('data-view');
    document.querySelectorAll('.nav-tab[data-view="' + view + '"]').forEach(t => t.classList.add('active'));

    document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');

    document.getElementById('notif-dropdown').classList.remove('open');
    if (view === 'pfpmode') loadPfpState();
    
    // Load data based on tab
    if (view === 'agents') {
      currentFightersTab = 'pumpfighters';
      loadPumpfighters();
    }
    
    // PFP Mode polling
    if (view === 'pfpmode') {
      startPFPPolling();
    } else {
      stopPFPPolling();
    }

    // Persist state in URL hash
    window.location.hash = view;
  }

  function openProfileView() {
    closeSearchModal();
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
    const profileView = document.getElementById('view-profile');
    if (profileView) profileView.classList.add('active');
    document.getElementById('notif-dropdown').classList.remove('open');
    loadProfile();
  }

  function toggleMobileMenu(e) {
    e.stopPropagation();
    document.getElementById('mobile-nav-dropdown').classList.toggle('open');
  }
  function closeMobileMenu() {
    document.getElementById('mobile-nav-dropdown').classList.remove('open');
  }
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('mobile-nav-dropdown');
    const btn = document.getElementById('mobile-menu-btn');
    if (dropdown && dropdown.classList.contains('open') && !dropdown.contains(e.target) && e.target !== btn) {
      dropdown.classList.remove('open');
    }
  });

  /* ── CHALLENGES ── */
  const challengeData = [
    { status: 'live', a: '🐸 PEPE', b: '🐕 DOGE', winner: null, pool: '128,450 BC', time: 'now' },
    { status: 'live', a: '🔨 BONK', b: '😺 MOG', winner: null, pool: '94,200 BC', time: 'now' },
    { status: 'live', a: '🦊 BRETT', b: '🐶 WIF', winner: null, pool: '61,900 BC', time: 'now' },
    { status: 'ended', a: '🤖 ROBOT V1', b: '🦾 FLOATROBO', winner: 'a', pool: '1,240,000 BC', time: '2 min ago' },
    { status: 'ended', a: '🐧 PUDGY PENGUIN', b: '🔨 BONK', winner: 'b', pool: '35,600 BC', time: '18 min ago' },
    { status: 'ended', a: '🐕 DOGWIFHAT', b: '🐸 PEPE', winner: 'a', pool: '210,000 BC', time: '1 hr ago' },
    { status: 'ended', a: '😺 MOG', b: '🐶 WIF', winner: 'b', pool: '48,300 BC', time: '3 hr ago' },
    { status: 'cancelled', a: '🦾 FLOATROBO', b: '🦊 BRETT', winner: null, pool: '—', time: '5 hr ago' },
    { status: 'cancelled', a: '🐸 PEPE', b: '🔨 BONK', winner: null, pool: '—', time: 'yesterday' },
  ];

  function renderChallenges(filter) {
    const list = filter === 'all' ? challengeData : challengeData.filter(c => c.status === filter);
    const container = document.getElementById('challenge-rows');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = '<div class="challenge-empty">No challenges in this category.</div>';
      return;
    }

    container.innerHTML = list.map(c => {
      const statusLabel = c.status === 'live' ? '● LIVE' : c.status === 'ended' ? 'ENDED' : 'CANCELLED';
      let aClass = '', bClass = '', resultText = '—';
      if (c.status === 'ended') {
        aClass = c.winner === 'a' ? 'winner' : 'loser';
        bClass = c.winner === 'b' ? 'winner' : 'loser';
        resultText = (c.winner === 'a' ? c.a : c.b).replace(/^\S+\s/, '') + ' won';
      } else if (c.status === 'live') {
        resultText = 'In progress';
      } else {
        resultText = 'Cancelled';
      }
      return `
        <div class="challenge-row">
          <div class="challenge-status ${c.status}">${statusLabel}</div>
          <div class="challenge-matchup">
            <span class="chal-fighter ${aClass}">${c.a}</span>
            <span class="chal-vs">vs</span>
            <span class="chal-fighter ${bClass}">${c.b}</span>
          </div>
          <div class="challenge-result">${resultText}</div>
          <div class="challenge-pool">${c.pool}</div>
          <div class="challenge-time">${c.time}</div>
        </div>`;
    }).join('');
  }

  function setChallengeTab(el) {
    document.querySelectorAll('.challenge-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    renderChallenges(el.getAttribute('data-ctab'));
  }

  function openChallenges() {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-challenges').classList.add('active');
    document.getElementById('notif-dropdown').classList.remove('open');
    renderChallenges('all');
  }

  window.setTab = setTab;

  // Hash-based tab routing (e.g. /#create)
  function activateTabByName(name) {
    const btn = document.querySelector(`.nav-tab[data-view="${name}"]`);
    if (btn) setTab(btn);
  }
  window.addEventListener('hashchange', () => {
    const h = location.hash.replace('#', '');
    if (h) activateTabByName(h);
  });
  // if (location.hash) activateTabByName(location.hash.replace('#', '')); // <-- causes TDZ crash, DOMContentLoaded handles this below
  window.openProfileView = openProfileView;
  window.toggleSearchModal = toggleSearchModal;
  window.closeSearchModal = closeSearchModal;
  window.toggleMobileMenu = toggleMobileMenu;
  window.closeMobileMenu = closeMobileMenu;
  window.setFightersTab = setFightersTab;
  window.openChallenges = openChallenges;
  window.toggleTheme = toggleTheme;
  window.toggleNotifications = toggleNotifications;
  window.markAllRead = markAllRead;
  window.sendMsgBtn = sendMsgBtn;
  window.sendMsg = sendMsg;

  async function api(path, options = {}) {
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    if (!response.ok) {
      let message = 'Request failed';
      try {
        const data = await response.clone().json();
        message = data.error || data.message || message;
      } catch (error) {}
      throw new Error(message);
    }
    return response.headers.get('content-type')?.includes('application/json') ? response.json() : response.text();
  }

  const profileState = { profile: null, notifications: [] };

  function formatRelativeTime(value) {
    if (!value) return 'just now';
    const parsed = new Date(value);
    const diff = Math.max(1, Math.round((Date.now() - parsed.getTime()) / 60000));
    if (diff < 60) return `${diff} min ago`;
    const hrs = Math.floor(diff / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  function renderProfile() {
    const profile = profileState.profile;
    if (!profile) return;
    document.getElementById('profile-pill-title').textContent = profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : 'Connected';
    document.getElementById('profile-wallet-label').textContent = profile.walletAddress ? `${profile.walletAddress.slice(0, 6)}…${profile.walletAddress.slice(-4)}` : 'Wallet connected';
  }

  function renderLiveStats(stats) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('profile-my-agents', (stats.myAgents ?? 0).toLocaleString());
    set('profile-queue', (stats.queue ?? 0).toLocaleString());
    set('profile-bantcredit', Math.round(stats.bantCredit ?? 0).toLocaleString());
    set('profile-bantc-claim', Math.round(stats.bantcClaim ?? 0).toLocaleString());
    set('profile-earned-usdc', `${Number(stats.earnedUsdc ?? 0).toLocaleString()}`);
    set('profile-status', stats.status || 'Ready');
  }

  async function loadUserStats(wallet) {
    if (!wallet) return;
    try {
      const stats = await api(`/api/stats?wallet=${encodeURIComponent(wallet)}`);
      renderLiveStats(stats);
    } catch (e) {
      console.warn('Stats unavailable', e);
    }
  }

  function agentSkeletonHTML(count = 4) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="agent-card skel-card">
          <div class="skel-avatar"></div>
          <div class="skel-name"></div>
          <div class="skel-level"></div>
          <div class="skel-record"></div>
          <div class="skel-btn"></div>
        </div>`;
    }
    return html;
  }

  let currentFightersTab = 'pumpfighters';

  function setFightersTab(el) {
    document.querySelectorAll('[data-fighters-tab]').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    currentFightersTab = el.getAttribute('data-fighters-tab');
    
    const wallet = window.currentWalletAddress || '';
    
    if (currentFightersTab === 'pumpfighters') {
      loadPumpfighters();
    } else if (currentFightersTab === 'pfp') {
      loadPFPFighters();
    } else if (currentFightersTab === 'all') {
      loadAllFighters();
    } else if (currentFightersTab === 'your') {
      loadUserAgents(wallet);
    }
  }

  async function loadPumpfighters() {
    const grid = document.getElementById('agents-grid');
    if (!grid) return;
    grid.innerHTML = agentSkeletonHTML(6);
    try {
      const res = await fetch('/api/pumpfighters/state');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (!data.fighters || !data.fighters.length) {
        grid.innerHTML = '<div class="agent-empty">No Pumpfighters available yet.</div>';
        return;
      }
      grid.innerHTML = data.fighters.map(f => {
        const avatar = f.processed_avatar && !f.processed_avatar.startsWith('http') === false
          ? `<img class="agent-avatar" src="${f.processed_avatar}" alt="${f.display_name}" style="width:56px;height:56px;border-radius:14px;object-fit:cover;border:2px solid hsl(var(--bb-primary));">`
          : `<div class="agent-avatar">${f.processed_avatar || '🚀'}</div>`;
        return `
          <div class="agent-card">
            ${avatar}
            <div class="agent-name">${f.display_name}</div>
            <div class="agent-level">${f.market_cap_usd ? '$' + (f.market_cap_usd / 1e6).toFixed(1) + 'M' : 'ACTIVE'}</div>
            <div class="agent-record"><span class="win">${f.wins || 0}W</span> · <span class="loss">${f.losses || 0}L</span></div>
          </div>`;
      }).join('');
    } catch (e) {
      grid.innerHTML = '<div class="agent-empty">Could not load Pumpfighters.</div>';
    }
  }

  async function loadPFPFighters() {
    const grid = document.getElementById('agents-grid');
    if (!grid) return;
    grid.innerHTML = agentSkeletonHTML(6);
    try {
      const agents = await api('/api/fighters');
      if (!agents || !agents.length) {
        grid.innerHTML = '<div class="agent-empty">No PFP fighters available yet.</div>';
        return;
      }
      grid.innerHTML = agents.map(a => {
        const isEmoji = a.avatarUrl && !a.avatarUrl.startsWith('http') && !a.avatarUrl.startsWith('/');
        const avatar = a.avatarUrl && !isEmoji
          ? `<img class="agent-avatar" src="${a.avatarUrl}" alt="${a.name}" style="width:56px;height:56px;border-radius:14px;object-fit:cover;border:2px solid hsl(var(--bb-primary));">`
          : `<div class="agent-avatar">${a.avatarUrl || '🖼'}</div>`;
        return `
          <div class="agent-card">
            ${avatar}
            <div class="agent-name">${a.name}</div>
            <div class="agent-level">${a.fameScore ? 'FAME: ' + Math.round(a.fameScore) : 'ACTIVE'}</div>
            <div class="agent-record"><span class="win">${a.wins}W</span> · <span class="loss">${a.losses}L</span></div>
          </div>`;
      }).join('');
    } catch (e) {
      grid.innerHTML = '<div class="agent-empty">Could not load PFP fighters.</div>';
    }
  }

  async function loadAllFighters() {
    const grid = document.getElementById('agents-grid');
    if (!grid) return;
    grid.innerHTML = agentSkeletonHTML(6);
    try {
      const agents = await api('/api/fighters');
      if (!agents || !agents.length) {
        grid.innerHTML = '<div class="agent-empty">No fighters available yet.</div>';
        return;
      }
      grid.innerHTML = agents.map(a => {
        const isEmoji = a.avatarUrl && !a.avatarUrl.startsWith('http') && !a.avatarUrl.startsWith('/');
        const avatar = a.avatarUrl && !isEmoji
          ? `<img class="agent-avatar" src="${a.avatarUrl}" alt="${a.name}" style="width:56px;height:56px;border-radius:14px;object-fit:cover;border:2px solid hsl(var(--bb-primary));">`
          : `<div class="agent-avatar">${a.avatarUrl || '⚔️'}</div>`;
        return `
          <div class="agent-card">
            ${avatar}
            <div class="agent-name">${a.name}</div>
            <div class="agent-level">${a.fameScore ? 'FAME: ' + Math.round(a.fameScore) : 'ACTIVE'}</div>
            <div class="agent-record"><span class="win">${a.wins}W</span> · <span class="loss">${a.losses}L</span></div>
          </div>`;
      }).join('');
    } catch (e) {
      grid.innerHTML = '<div class="agent-empty">Could not load fighters.</div>';
    }
  }

  async function loadUserAgents(wallet) {
    const grid = document.getElementById('agents-grid');
    if (!grid) return;
    grid.innerHTML = agentSkeletonHTML(6);
    if (!wallet) {
      grid.innerHTML = '<div class="agent-empty">Connect your wallet to see your agents.</div>';
      return;
    }
    try {
      const agents = await api(`/api/my-agents?wallet=${encodeURIComponent(wallet || '')}`);
      if (!agents || !agents.length) {
        grid.innerHTML = '<div class="agent-empty">No agents yet. <a onclick="document.querySelector(\'[data-view=create]\').click()">Create your first fighter →</a></div>';
        return;
      }
      grid.innerHTML = agents.map(a => {
        const avatar = a.avatarUrl && !a.avatarUrl.match(/^[\p{Emoji}]+$/u)
          ? `<img class="agent-avatar" src="${a.avatarUrl}" alt="${a.name}" style="width:56px;height:56px;border-radius:14px;object-fit:cover;border:2px solid hsl(var(--bb-primary));">`
          : `<div class="agent-avatar">${a.avatarUrl || '🤖'}</div>`;
        return `
          <div class="agent-card">
            ${avatar}
            <div class="agent-name">${a.name}</div>
            <div class="agent-level">${a.status ? a.status.toUpperCase() : 'ACTIVE'}</div>
            <div class="agent-record"><span class="win">${a.wins}W</span> · <span class="loss">${a.losses}L</span> · ${(a.points || 0).toLocaleString()} BC</div>
            <button class="agent-btn" onclick="openChallengeModal(${JSON.stringify(a)})">CHALLENGE</button>
          </div>`;
      }).join('');
    } catch (e) {
      grid.innerHTML = '<div class="agent-empty">Could not load your agents.</div>';
    }
  }

  /* ── Challenge modal ── */
  let _fighters = [];
  let _challengeAgent = null;
  let _selectedFighter = null;

  async function loadFighters() {
    if (_fighters.length) return _fighters;
    try { _fighters = await api('/api/fighters'); } catch (e) { _fighters = []; }
    return _fighters;
  }

  function openChallengeModal(agent) {
    _challengeAgent = agent;
    _selectedFighter = null;
    const overlay = document.getElementById('chal-modal-overlay');
    if (!overlay) return;

    // Your agent header
    const yourDiv = overlay.querySelector('#chal-your-agent-info');
    if (yourDiv) {
      const av = agent.avatarUrl
        ? `<img src="${agent.avatarUrl}" style="width:40px;height:40px;border-radius:10px;object-fit:cover;">`
        : `<div class="chal-your-avatar">🤖</div>`;
      yourDiv.innerHTML = `${av}<div class="chal-your-info"><strong>${agent.name}</strong>${agent.wins}W · ${agent.losses}L · ${(agent.points||0).toLocaleString()} BC</div>`;
    }

    // Reset confirm button
    const btn = document.getElementById('chal-confirm-btn');
    if (btn) { btn.textContent = 'SELECT A FIGHTER FIRST'; btn.classList.remove('ready'); }

    // Render fighters list
    const list = document.getElementById('chal-fighters-list');
    if (list) {
      if (!_fighters.length) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--bb-muted-foreground);font-size:12px;">Loading fighters…</div>';
        loadFighters().then(() => renderFightersList(list));
      } else {
        renderFightersList(list);
      }
    }

    overlay.classList.add('open');
  }

  function renderFightersList(list) {
    if (!_fighters.length) {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--bb-muted-foreground);font-size:12px;">No fighters available.</div>';
      return;
    }
    list.innerHTML = _fighters.map(f => {
      const av = f.avatarUrl
        ? `<img class="chal-fighter-avatar" src="${f.avatarUrl}" alt="${f.name}">`
        : `<div class="chal-fighter-avatar" style="background:var(--bb-muted);border-radius:8px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;">🤖</div>`;
      return `<div class="chal-fighter-row" data-id="${f.id}" onclick="selectFighter(this, ${JSON.stringify(f)})">
        ${av}
        <div class="chal-fighter-info">
          <strong>${f.name}</strong>
          <span><span style="color:var(--bb-secondary)">${f.wins}W</span> · <span style="color:var(--bb-destructive)">${f.losses}L</span> · ${Math.round(f.fameScore).toLocaleString()} pts</span>
        </div>
      </div>`;
    }).join('');
  }

  function selectFighter(el, fighter) {
    _selectedFighter = fighter;
    document.querySelectorAll('.chal-fighter-row').forEach(r => r.classList.remove('selected'));
    el.classList.add('selected');
    const btn = document.getElementById('chal-confirm-btn');
    if (btn) { btn.textContent = `⚔️ CHALLENGE ${fighter.name.toUpperCase()}`; btn.classList.add('ready'); }
  }

  function closeChallengeModal() {
    const overlay = document.getElementById('chal-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  function confirmChallenge() {
    if (!_selectedFighter || !_challengeAgent) return;
    const stake = parseInt(document.getElementById('chal-stake-input').value, 10) || 0;
    if (stake < 100) { alert('Minimum stake is 100 BC.'); return; }
    alert(`Challenge sent!\n${_challengeAgent.name} vs ${_selectedFighter.name}\nStake: ${stake.toLocaleString()} BC\n\n(Onchain integration coming soon)`);
    closeChallengeModal();
  }

  window.openChallengeModal = openChallengeModal;
  window.closeChallengeModal = closeChallengeModal;
  window.selectFighter = selectFighter;
  window.confirmChallenge = confirmChallenge;
  window.watchToEarn = watchToEarn;
  window.setLbTab = setLbTab;

  // ── Avatar Mode stubs ──
  function avJoinQueue() {
    const btn = document.getElementById('av-queue-btn');
    const info = document.getElementById('av-queue-info');
    if (btn) { btn.textContent = '⏳ SEARCHING…'; btn.disabled = true; }
    if (info) info.textContent = 'Finding your opponent…';
    // Future: call WebSocket queue endpoint
    setTimeout(() => {
      if (btn) { btn.textContent = '⚔️ JOIN QUEUE'; btn.disabled = false; }
      if (info) info.textContent = 'No opponent found. Try again.';
    }, 5000);
  }
  function avWatchToEarn() {
    // Future: subscribe as spectator via WebSocket
    const btn = document.querySelector('.av-watch2earn-btn');
    if (btn) { btn.textContent = '✅ WATCHING'; btn.style.background = 'linear-gradient(135deg,#059669,#10b981)'; }
  }
  window.avJoinQueue = avJoinQueue;
  window.avWatchToEarn = avWatchToEarn;

  function renderNotifications() {
    const list = document.getElementById('notif-list');
    const badge = document.querySelector('#notif-btn .badge');
    const unreadCount = profileState.notifications.filter(n => !n.read).length;
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    }
    if (!list) return;
    if (!profileState.notifications.length) {
      list.innerHTML = '<div class="notif-item"><div class="notif-body"><div class="notif-text">No notifications yet</div></div></div>';
      return;
    }
    list.innerHTML = profileState.notifications.map(notification => `
      <div class="notif-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
        <div class="notif-icon">${notification.icon || '🔔'}</div>
        <div class="notif-body">
          <div class="notif-text"><strong>${notification.title}</strong> ${notification.message}</div>
          <div class="notif-time">${formatRelativeTime(notification.createdAt)}</div>
        </div>
      </div>
    `).join('');
  }

  function updateFighterCount(total) {
    const el = document.getElementById('nav-fighter-count-value');
    if (el) el.textContent = Number(total || 0).toLocaleString();
  }

  async function refreshFighterCount() {
    try {
      const data = await api('/api/fighters/counts');
      updateFighterCount(data?.total ?? 0);
    } catch (error) {
      console.warn('Fighter count unavailable', error);
    }
  }

  async function loadProfile() {
    try {
      profileState.profile = await api('/api/profile');
      renderProfile();
    } catch (error) {
      console.warn('Profile API unavailable', error);
    }
    // Pull live stats from DB using the connected wallet
    const wallet = window.currentWalletAddress || profileState.profile?.walletAddress || '';
    if (wallet) {
      loadUserStats(wallet);
      
      // Auto-claim signup bonus & daily checkin
      api('/api/signup-bonus', { method: 'POST', body: JSON.stringify({ wallet }) })
        .then(res => { if (res.success) loadUserStats(wallet); })
        .catch(() => {});
      api('/api/daily-checkin', { method: 'POST', body: JSON.stringify({ wallet }) })
        .then(res => { if (res.success) loadUserStats(wallet); })
        .catch(() => {});
    }
    // Pre-fetch fighters for the challenge modal
    loadFighters();
  }

  async function loadNotifications() {
    try {
      profileState.notifications = await api('/api/notifications');
      renderNotifications();
    } catch (error) {
      console.warn('Notifications API unavailable', error);
    }
  }

  async function markAllRead() {
    try {
      await api('/api/notifications/read-all', { method: 'PATCH' });
      await loadNotifications();
    } catch (error) {
      console.warn('Could not mark notifications as read', error);
    }
  }

  async function toggleNotifications(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('notif-dropdown');
    if (!dropdown) return;
    const willOpen = !dropdown.classList.contains('open');
    dropdown.classList.toggle('open', willOpen);
    if (willOpen) {
      await loadNotifications();
    }
  }

  document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('notif-dropdown');
    const btn = document.getElementById('notif-btn');
    if (dropdown && dropdown.classList.contains('open') && !dropdown.contains(e.target) && e.target !== btn) {
      dropdown.classList.remove('open');
    }

    const modal = document.getElementById('search-modal');
    const searchBtn = document.querySelector('.search-btn');
    if (modal && modal.classList.contains('open') && !modal.contains(e.target) && e.target !== searchBtn) {
      modal.classList.remove('open');
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeSearchModal();
  });

  document.addEventListener('click', async function(e) {
    const item = e.target.closest('.notif-item[data-id]');
    if (!item) return;
    const notificationId = item.getAttribute('data-id');
    try {
      await api(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
      await loadNotifications();
    } catch (error) {
      console.warn('Could not mark notification as read', error);
    }
  });


  function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('theme-btn');
    const isDark = body.classList.toggle('dark');
    btn.textContent = isDark ? '🌙' : '☀️';
  }

  const cardFighters = {
    pepe: { emoji: '🐸', name: 'PEPE',  bc: '$12.5M MCAP' },
    doge: { emoji: '🐕', name: 'DOGE',  bc: '$8.3M MCAP'  },
    bonk: { emoji: '🔨', name: 'BONK',  bc: '$5.1M MCAP'  },
    mog:  { emoji: '😺', name: 'MOG',   bc: '$3.2M MCAP'  },
  };
  let nextArenaSlot = 'left';

  function watchToEarn(fighterId, btnEl) {
    if (!pfState || !pfState.fighters) return;
    
    // Support both string keys and numeric IDs
    let fighter = pfState.fighters.find(f => String(f.unique_id) === String(fighterId));
    if (!fighter) fighter = pfState.fighters.find(f => String(f.id) === String(fighterId));
    if (!fighter) fighter = pfState.fighters.find(f => f.name && f.name.toLowerCase() === String(fighterId).toLowerCase());
    if (!fighter) fighter = pfState.fighters[0];
    if (!fighter) return;

    // Show button loading state
    if (btnEl) {
      const original = btnEl.textContent;
      btnEl.textContent = '⚔️ SWITCHING...';
      btnEl.style.opacity = '0.6';
      setTimeout(() => { btnEl.textContent = original; btnEl.style.opacity = '1'; }, 1200);
    }

    // Ensure we're on the PumpFighters tab (the default homepage)
    const pfTab = document.querySelector('.nav-tab[data-view="pumpfighters"]');
    if (pfTab) setTab(pfTab);

    // Scroll to the arena at the top
    const arenaContainer = document.getElementById('pf-arena-container');
    if (arenaContainer) arenaContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Show loading overlay on the PF arena
    if (arenaContainer) {
      let overlay = document.getElementById('pf-arena-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pf-arena-overlay';
        overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:100;display:flex;align-items:center;justify-content:center;flex-direction:column;border-radius:24px;transition:opacity 0.3s;';
        overlay.innerHTML = '<div style="font-size:40px;margin-bottom:10px;animation:hitShake 0.5s infinite;">⚔️</div><div style="color:#14F195;font-weight:800;font-size:16px;">SWITCHING BATTLE...</div>';
        arenaContainer.style.position = 'relative';
        arenaContainer.appendChild(overlay);
      }
      overlay.style.opacity = '1';
      overlay.style.display = 'flex';
      setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => { overlay.style.display = 'none'; }, 300); }, 800);
    }

    // Pick a random opponent from different fighters
    const opponents = pfState.fighters.filter(f => String(f.unique_id) !== String(fighter.unique_id));
    const opponent = opponents[Math.floor(Math.random() * opponents.length)] || pfState.fighters[1] || fighter;

    // Stop the current battle animation
    if (pfBattleAnimTimer) { clearInterval(pfBattleAnimTimer); pfBattleAnimTimer = null; }

    // Update pfState.live_match so renderPumpLiveArena shows the new fighters
    pfState.live_match = { fighter_a: fighter, fighter_b: opponent };

    // Hide waiting, show live match
    const waiting = document.getElementById('pf-waiting');
    const liveEl = document.getElementById('pf-live-match');
    if (waiting) waiting.style.display = 'none';
    if (liveEl) liveEl.style.display = 'flex';

    // Update PF arena UI elements
    const setImg = (id, src) => {
      const el = document.querySelector('#' + id + ' img');
      if (el) el.src = src || '';
    };
    setImg('pf-fia-left', fighter.processed_avatar);
    setImg('pf-fia-right', opponent.processed_avatar);

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('pf-fin-left', fighter.display_name || fighter.name);
    setText('pf-fin-right', opponent.display_name || opponent.name);
    setText('pf-fic-left', (fighter.chain || '').toUpperCase());
    setText('pf-fic-right', (opponent.chain || '').toUpperCase());
    setText('pf-fib-left', fmtMcap(fighter.market_cap_usd));
    setText('pf-fib-right', fmtMcap(opponent.market_cap_usd));

    // Update big avatars
    const baLeft = document.getElementById('pf-ba-left-img');
    const baRight = document.getElementById('pf-ba-right-img');
    if (baLeft) baLeft.src = fighter.processed_avatar || '';
    if (baRight) baRight.src = opponent.processed_avatar || '';

    // Reset HP bars
    const hpBarL = document.getElementById('pf-hp-left');
    const hpBarR = document.getElementById('pf-hp-right');
    const valL = document.getElementById('pf-hp-left-val');
    const valR = document.getElementById('pf-hp-right-val');
    if (hpBarL) { hpBarL.style.width = '100%'; hpBarL.className = 'pf-hp-bar-fill green'; }
    if (hpBarR) { hpBarR.style.width = '100%'; hpBarR.className = 'pf-hp-bar-fill green'; }
    if (valL) valL.textContent = fighter.hp || 100;
    if (valR) valR.textContent = opponent.hp || 100;

    // Reset round
    setText('pf-round-label', 'ROUND 1');

    // Start the new battle animation after the overlay fades
    setTimeout(() => { startBattleAnimation(fighter, opponent); }, 900);
  }

  const ROUND_DURATION_SECONDS = 45; // 45 seconds per round (0.75 minutes)
  let secs = ROUND_DURATION_SECONDS;
  const renderRoundTimer = () => {
    const text = String(Math.floor(secs / 60)).padStart(2,'0') + ':' + String(secs % 60).padStart(2,'0');
    document.querySelectorAll('.pf-round-timer').forEach(el => el.textContent = text);
  };
  renderRoundTimer();
  setInterval(() => {
    secs = secs > 0 ? secs - 1 : ROUND_DURATION_SECONDS;
    renderRoundTimer();
  }, 1000);

  const mockMsgs = [
    ['kek_enjoyer','PEPE ARMY NO CAP 🐸'],
    ['degen420','LFG ROBOT V1 🤖'],
    ['whale_x','THIS IS INSANE 🤯'],
    ['moon_chaser','PUMP IT 🚀'],
    ['suchlow69','WAGMI 💪'],
    ['frog_lord','NGL this is wild'],
  ];
  let msgIdx = 0;
  setInterval(() => {
    const [user, msg] = mockMsgs[msgIdx++ % mockMsgs.length];
    const box = document.getElementById('trollbox');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'troll-msg';
    div.innerHTML = `<span class="troll-user">${user}:</span> ${msg}`;
    box.appendChild(div);
    if (box.children.length > 8) box.removeChild(box.children[0]);
  }, 3500);

  function sendMsg(e) { if (e.key === 'Enter') sendMsgBtn(); }
  function sendMsgBtn() {
    const inp = document.getElementById('troll-in');
    const box = document.getElementById('trollbox');
    if (!inp || !inp.value.trim() || !box) return;
    const div = document.createElement('div');
    div.className = 'troll-msg';
    div.innerHTML = `<span class="troll-user self">you:</span> ${inp.value.trim()}`;
    box.appendChild(div);
    if (box.children.length > 8) box.removeChild(box.children[0]);
    inp.value = '';
  }



  // -- CREATE VIEW LOGIC --
  function cpHandleFile(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const url = evt.target.result;
        document.getElementById('cp-image-url').value = '';
        _cpSetAvatar(url);
      };
      reader.readAsDataURL(file);
    }
  }

  function cpSyncImageUrl() {
    const url = document.getElementById('cp-image-url').value;
    if (url) _cpSetAvatar(url);
    else _cpSetAvatar('');
  }

  function _cpSetAvatar(url) {
    const cpImg = document.getElementById('cp-avatar-img');
    const cpEmoji = document.getElementById('cp-avatar-emoji');
    const prImg = document.getElementById('prev-img');
    const prEmoji = document.getElementById('prev-emoji');

    if (url) {
      cpImg.src = url; cpImg.style.display = 'block'; cpEmoji.style.display = 'none';
      prImg.src = url; prImg.style.display = 'block'; prEmoji.style.display = 'none';
    } else {
      cpImg.src = ''; cpImg.style.display = 'none'; cpEmoji.style.display = 'block';
      prImg.src = ''; prImg.style.display = 'none'; prEmoji.style.display = 'block';
    }
  }

  async function cpImportPFP(source) {
    const user = window.privyUser;
    if (!user) {
      alert('Please log in first to import your PFP.');
      return;
    }

    let imageUrl = '';
    let name     = '';

    if (source === 'twitter') {
      // Privy stores twitter_oauth linked accounts with profilePictureUrl
      const twAcc = user.linkedAccounts?.find(a =>
        a.type === 'twitter_oauth' || a.type === 'twitter'
      );
      if (!twAcc) {
        alert('No Twitter / X account linked. Link it via your Privy account first.');
        return;
      }
      // Use the highest-res variant if available (_normal → _400x400)
      imageUrl = (twAcc.profilePictureUrl || '').replace('_normal', '_400x400');
      name     = twAcc.name || twAcc.username || '@twitter';

    } else if (source === 'telegram') {
      // Privy stores telegram linked accounts with photoUrl / firstName
      const tgAcc = user.linkedAccounts?.find(a => a.type === 'telegram');
      if (!tgAcc) {
        alert('No Telegram account linked. Link it via your Privy account first.');
        return;
      }
      imageUrl = tgAcc.photoUrl || tgAcc.photo_url || '';
      name     = tgAcc.firstName || tgAcc.username || 'TG User';

    } else if (source === 'wallet') {
      const wallet = window.currentWalletAddress;
      if (!wallet) {
        alert('Connect a wallet first.');
        return;
      }
      // Proxy through our server so Alchemy key stays server-side
      const btn = event?.target;
      if (btn) { btn.textContent = '⏳ Fetching…'; btn.disabled = true; }
      try {
        const res  = await fetch(`/api/nfts?wallet=${encodeURIComponent(wallet)}`);
        const data = await res.json();
        if (data.error || !data.nfts?.length) {
          alert('No NFTs found for this wallet, or the lookup failed. Paste a URL manually.');
          return;
        }
        const nft  = data.nfts[0];
        imageUrl   = nft.imageUrl || '';
        name       = nft.name    || 'My NFT';
        // Populate collection field too
        const collEl = document.getElementById('cp-collection');
        if (collEl && nft.collection) collEl.value = nft.collection;
      } finally {
        if (btn) { btn.textContent = '👛 Wallet NFT'; btn.disabled = false; }
      }
    }

    if (!imageUrl) {
      alert('Could not retrieve an image. Try pasting a URL manually.');
      return;
    }

    document.getElementById('cp-image-url').value = imageUrl;
    document.getElementById('cp-name').value       = name;
    _cpSetAvatar(imageUrl);
    cpSync();
  }

  function cpSyncStat(stat, minV, maxV) {
    let val = parseInt(document.getElementById('cp-' + stat).value) || minV;
    val = Math.max(minV, Math.min(maxV, val));
    const pct = ((val - minV) / (maxV - minV)) * 100;

    document.getElementById('cp-' + stat).value = val;
    document.getElementById('cp-' + stat + '-bar').style.width = pct + '%';
    document.getElementById('prev-' + stat + '-bar').style.width = pct + '%';
    document.getElementById('prev-' + stat + '-val').textContent = val;
  }

  function cpReadStat(stat, minV, maxV) {
    let val = parseInt(document.getElementById('cp-' + stat).value, 10);
    if (isNaN(val)) val = minV;
    val = Math.max(minV, Math.min(maxV, val));
    document.getElementById('cp-' + stat).value = val;
    return val;
  }

  function cpSync() {
    const name = document.getElementById('cp-name').value.trim() || 'UNNAMED FIGHTER';
    document.getElementById('cp-preview-name-small').textContent = name.toUpperCase();
    document.getElementById('prev-name').textContent = name.toUpperCase();

    const coll = document.getElementById('cp-collection').value.trim() || '—';
    document.getElementById('prev-collection').textContent = coll;

    const cls = document.getElementById('cp-class').value;
    document.getElementById('cp-class-badge').textContent = cls;
    document.getElementById('prev-class').textContent = cls.toUpperCase();

    const traits = document.getElementById('cp-traits').value.trim() || 'No traits yet';
    document.getElementById('prev-traits').textContent = traits;

    cpSyncStat('hp', 60, 220);
    cpSyncStat('atk', 5, 45);
    cpSyncStat('def', 0, 35);
    cpSyncStat('spd', 5, 24);

    const persona = document.getElementById('cp-eliza-persona').value.trim();
    document.getElementById('prev-eliza-persona').textContent = persona || 'Custom persona pending...';
    
    const agentkitEnabled = document.getElementById('cp-agentkit-toggle').checked;
    const akStatus = document.getElementById('prev-agentkit-status');
    if (agentkitEnabled) {
      akStatus.textContent = 'Enabled';
      akStatus.style.color = '#14F195';
    } else {
      akStatus.textContent = 'Disabled';
      akStatus.style.color = '#ff4444';
    }
  }

  function cpLoadEliza(id) {
    const p = {
      degen: 'A highly aggressive crypto-native degenerate. Uses lots of slang (ngmi, wagmi, rekt). Taunts opponents relentlessly and focuses entirely on maximum damage and risk.',
      sniper: 'A cold, calculated onchain sniper. Speaks precisely. Analyzes the opponent\'s weaknesses before striking. Values speed and defense over brute force.',
      meme: 'An unpredictable chaotic force. Communicates mostly in internet culture references and absurd logic. Relies on trickery and confusing the enemy.'
    }[id];
    if(p) {
      document.getElementById('cp-eliza-persona').value = p;
      cpSync();
    }
  }

  function cpLoadPreset(id) {
    const p = {
      pepe: { name: 'Pepe', coll: 'Rare Pepes', url: 'https://i.seadn.io/gae/rS7Kx8Ett0G16rU2tJubv7qFwW41q4E6-D3wD_wL1N1yZ5zW8P6xV_N9rV0?auto=format&w=256', cls: 'trickster', traits: 'meme, legendary, toxic', hp:180, atk:35, def:10, spd:18 },
      doge: { name: 'Doge', coll: 'Doge Pound', url: 'https://i.seadn.io/gae/BdxvLseXcfl57BiuQcQYdJ64v-aI8din7eo5TIgMiOSB1_W-Mh-M9gT4K-V-n_sB6B-B-aA?auto=format&w=256', cls: 'striker', traits: 'fast, loyal, meme', hp:140, atk:40, def:15, spd:20 },
      bonk: { name: 'Bonk', coll: 'Solana Bonk', url: 'https://i.seadn.io/gcs/files/b498b36873528b9c658f89e27c191a0c.png?auto=format&w=256', cls: 'tank', traits: 'hammer, sturdy', hp:200, atk:25, def:30, spd:8 },
      mog:  { name: 'Mog',  coll: 'Mog Coin', url: 'https://i.seadn.io/gcs/files/6c2bb12b6f3ee8c8230b80e81c7ff083.png?auto=format&w=256', cls: 'blaster', traits: 'laser eyes, meme', hp:110, atk:45, def:5, spd:22 },
      wif:  { name: 'WIF',  coll: 'Dogwifhat', url: 'https://i.seadn.io/gcs/files/e9f3b7d159be432f80c65ab7574b6bd1.png?auto=format&w=256', cls: 'frost', traits: 'hat, chill', hp:150, atk:20, def:25, spd:12 }
    }[id];
    if(!p) return;

    document.getElementById('cp-name').value = p.name;
    document.getElementById('cp-collection').value = p.coll;
    document.getElementById('cp-image-url').value = p.url;
    document.getElementById('cp-class').value = p.cls;
    document.getElementById('cp-traits').value = p.traits;
    document.getElementById('cp-hp').value = p.hp;
    document.getElementById('cp-atk').value = p.atk;
    document.getElementById('cp-def').value = p.def;
    document.getElementById('cp-spd').value = p.spd;
    cpSyncImageUrl();
    cpSync();
  }


  function cpCurrentImage() {
    const img = document.getElementById('cp-avatar-img');
    const imageAttr = img && img.style.display !== 'none' ? (img.getAttribute('src') || '') : '';
    return imageAttr || document.getElementById('cp-image-url').value.trim();
  }

  function setImage(id, src) {
    const el = document.getElementById(id);
    if (el) el.src = src || '';
  }

  function setNestedImage(containerId, src) {
    const img = document.querySelector('#' + containerId + ' img');
    if (img) img.src = src || '';
  }

  function setPfpAvatarOnElement(el, image, fallback) {
    el.textContent = '';
    if (image) {
      const img = document.createElement('img');
      img.src = image;
      img.alt = '';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = 'inherit';
      el.appendChild(img);
    } else {
      el.textContent = fallback;
    }
  }

  function renderPfpMode(data) {
    if (!data || (!data.fighter && !data.battle)) return;
    const fighter = data.fighter || {};
    const battle = data.battle || {};
    const name = fighter.displayName || fighter.name || battle.p1Name || 'PFP FIGHTER';
    const image = fighter.avatarUrl || fighter.image || battle.p1AvatarUrl || '';
    const status = (battle.status || fighter.status || 'queued').toLowerCase();
    const opponentName = battle.p2Name || 'Arena Opponent';
    const queueLabel = status === 'queued'
      ? 'QUEUE #' + (battle.queuePosition || data.queue || 1)
      : 'LIVE IN ARENA';

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText('av-fin-left', name);
    setText('av-fic-left', fighter.className ? fighter.className.toUpperCase() : 'PFP');
    setText('av-fib-left', queueLabel);
    setText('av-fin-right', opponentName);
    setText('av-fic-right', 'ARENA');
    setText('av-fib-right', status === 'live' ? 'SIM OPPONENT' : 'MATCHMAKING');
    setText('av-match-label', status === 'live' ? 'PFP Battle Live' : 'PFP Fighter Queued');
    setText('av-round-energy', queueLabel);
    setText('av-hp-left-val', fighter.stats?.hp || 100);
    setText('av-hp-right-val', 100);
    setNestedImage('av-fia-left', image);
    setNestedImage('av-fia-right', battle.p2AvatarUrl || '');
    setImage('av-ba-left-img', image);
    setImage('av-ba-right-img', battle.p2AvatarUrl || '');

    const list = document.getElementById('av-fighters-list');
    if (list) {
      list.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'fighter-card';
      const header = document.createElement('div');
      header.className = 'fc-header';
      const avatar = document.createElement('div');
      avatar.className = 'fc-avatar';
      setPfpAvatarOnElement(avatar, image, 'PFP');
      const meta = document.createElement('div');
      meta.className = 'fc-meta';
      const cardName = document.createElement('div');
      cardName.className = 'fc-name';
      cardName.textContent = name;
      const sub = document.createElement('div');
      sub.className = 'fc-holders';
      sub.textContent = fighter.collection || 'Imported PFP';
      meta.appendChild(cardName);
      meta.appendChild(sub);
      header.appendChild(avatar);
      header.appendChild(meta);
      const rewards = document.createElement('div');
      rewards.className = 'fc-rewards';
      rewards.textContent = queueLabel;
      card.appendChild(header);
      card.appendChild(rewards);
      list.appendChild(card);
    }
  }

  async function loadPfpState() {
    const wallet = window.currentWalletAddress || profileState.profile?.walletAddress || '';
    try {
      const qs = wallet ? '?wallet=' + encodeURIComponent(wallet) : '';
      const data = await api('/api/pfp/state' + qs);
      renderPfpMode(data);
      return data;
    } catch (error) {
      console.warn('PFP state unavailable', error);
      return null;
    }
  }

  async function cpDeploy() {
    const btn = document.querySelector('.cp-deploy-btn');
    if (btn && btn.disabled) return;

    const name = document.getElementById('cp-name').value.trim();
    if (!name) {
      alert('Give your fighter a name first.');
      return;
    }

    const wallet = window.currentWalletAddress || profileState.profile?.walletAddress || '';
    if (!wallet) {
      alert('Connect your wallet first - click LOGIN in the top bar.');
      return;
    }

    cpSync();
    const payload = {
      name: name,
      collection: document.getElementById('cp-collection').value.trim(),
      className: document.getElementById('cp-class').value,
      traits: document.getElementById('cp-traits').value.split(',').map(t => t.trim()).filter(Boolean),
      image: cpCurrentImage(),
      stats: {
        hp: cpReadStat('hp', 60, 220),
        attack: cpReadStat('atk', 5, 45),
        defense: cpReadStat('def', 0, 35),
        speed: cpReadStat('spd', 5, 24),
      },
      wallet: wallet,
      elizaPersona: document.getElementById('cp-eliza-persona').value.trim(),
      agentkitEnabled: document.getElementById('cp-agentkit-toggle').checked,
    };

    const oldText = btn ? btn.innerHTML : '';
    const oldOpacity = btn ? btn.style.opacity : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'QUEUEING...';
      btn.style.opacity = '0.7';
    }

    try {
      const result = await api('/api/pfp/deploy', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      renderPfpMode(result);
      await Promise.all([loadNotifications(), loadUserStats(wallet), loadMyAgents(wallet)]);
      const pfpTab = document.querySelector('.nav-tab[data-view="pfpmode"]');
      if (pfpTab) setTab(pfpTab);
      const status = (result.battle?.status || 'queued').toLowerCase();
      alert(status === 'live'
        ? 'Fighter deployed. Your PFP battle is live.'
        : 'Fighter deployed. You are in the PFP queue.');
    } catch (error) {
      console.error('PFP deploy failed', error);
      alert(error.message || 'Could not deploy fighter.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldText || 'DEPLOY FIGHTER';
        btn.style.opacity = oldOpacity;
      }
    }
  }

  window.cpLoadEliza = cpLoadEliza;
  window.cpImportPFP = cpImportPFP;
  window.cpHandleFile = cpHandleFile;
  window.cpSyncImageUrl = cpSyncImageUrl;
  window.cpSyncStat = cpSyncStat;
  window.cpSync = cpSync;
  window.cpLoadPreset = cpLoadPreset;
  window.cpDeploy = cpDeploy;
  window.loadPfpState = loadPfpState;

  // ── PFP MODE — live state polling & rendering ──────────────────────────
  let _pfpPollTimer   = null;
  let _pfpAnimTimer   = null;
  let _pfpLastMatchId = null;

  function startPFPPolling() {
    if (_pfpPollTimer) return;
    fetchPFPState();
    _pfpPollTimer = setInterval(fetchPFPState, 3000);
  }

  function stopPFPPolling() {
    if (_pfpPollTimer) { clearInterval(_pfpPollTimer); _pfpPollTimer = null; }
    if (_pfpAnimTimer) { clearInterval(_pfpAnimTimer); _pfpAnimTimer = null; }
  }

  async function fetchPFPState() {
    try {
      const res  = await fetch('/api/pfp/state');
      const data = await res.json();
      renderPFPState(data);
    } catch (e) { /* silent — arena still shows waiting state */ }
  }

  function renderPFPState(data) {
    window.lastPfpData = data;
    const waiting  = document.getElementById('av-waiting');
    const liveEl   = document.getElementById('av-live-match');
    if (!liveEl) return;

    const matches = (data && data.live_matches) ? data.live_matches : ((data && data.live_match) ? [data.live_match] : []);
    const match = matches[current_match_index] || matches[0];

    // ── Waiting / no match ─────────────────────────────────────────────
    if (!match || match.status === 'finished') {
      if (waiting) waiting.style.display = 'flex';
      liveEl.style.display = 'none';
      if (_pfpAnimTimer) { clearInterval(_pfpAnimTimer); _pfpAnimTimer = null; }

      // Show queued count as a hint
      const qEl = document.getElementById('av-queue-info');
      if (qEl && data) {
        const q = data.queued_count || 0;
        qEl.textContent = q === 0
          ? 'Deploy a fighter to enter the queue.'
          : q === 1
          ? '1 fighter queued — need 1 more to start.'
          : `${q} fighters queued — match incoming!`;
      }

      // If a recent battle just finished, show result in trollbox
      if (data && data.recent_battles && data.recent_battles.length) {
        const last = data.recent_battles[0];
        if (last && last.match_id !== _pfpLastMatchId) {
          _pfpLastMatchId = last.match_id;
          _appendTrollboxEntry(`🏆 <b>${last.winner_name}</b> won vs ${last.fighter_a_name === last.winner_name ? last.fighter_b_name : last.fighter_a_name} in ${last.rounds} rounds`);
        }
      }
      return;
    }

    // ── Live match ─────────────────────────────────────────────────────
    if (waiting) waiting.style.display = 'none';
    liveEl.style.display = 'flex';

    const fa  = match.fighter_a;
    const fb  = match.fighter_b;
    const log = match.rounds_log || [];

    // Avatars — info bar
    const setImg = (id, src) => {
      const el = document.querySelector('#' + id + ' img');
      if (el) { el.src = src || ''; el.style.display = src ? 'block' : 'none'; }
    };
    setImg('av-fia-left',  fa.avatarUrl);
    setImg('av-fia-right', fb.avatarUrl);
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('av-fin-left',  fa.name);
    setText('av-fin-right', fb.name);
    setText('av-fic-left',  fa.collection || fa.class || 'PFP');
    setText('av-fic-right', fb.collection || fb.class || 'PFP');

    // Big battle avatars
    const imgL = document.getElementById('av-ba-left-img');
    const imgR = document.getElementById('av-ba-right-img');
    if (imgL) imgL.src = fa.avatarUrl || '';
    if (imgR) imgR.src = fb.avatarUrl || '';

    // BC pool
    setText('av-round-energy', `\uD83E\uDE99 ${(match.bc_pool || 576).toLocaleString()} BC Pool`);

    // Detect new match
    if (match.match_id !== _pfpLastMatchId) {
      _pfpLastMatchId = match.match_id;
      if (_pfpAnimTimer) { clearInterval(_pfpAnimTimer); _pfpAnimTimer = null; }
      _appendTrollboxEntry(`\u2694\uFE0F PFP Battle: <b>${fa.name}</b> vs <b>${fb.name}</b>`);
    }

    // Derive current round from elapsed time
    const elapsed       = data.elapsed_secs || 0;
    const secsPerRound  = match.secs_per_round || 2;
    const currentRound  = Math.min(Math.floor(elapsed / secsPerRound), log.length - 1);
    const entry         = log[currentRound] || log[log.length - 1] || {};
    const maxHpA        = match.max_hp_a || fa.hp || 120;
    const maxHpB        = match.max_hp_b || fb.hp || 120;
    const hpA           = entry.hp_a != null ? entry.hp_a : maxHpA;
    const hpB           = entry.hp_b != null ? entry.hp_b : maxHpB;
    const pctA          = Math.max(0, Math.round(hpA / maxHpA * 100));
    const pctB          = Math.max(0, Math.round(hpB / maxHpB * 100));

    // HP bars
    const barL = document.getElementById('av-hp-left');
    const barR = document.getElementById('av-hp-right');
    const valL = document.getElementById('av-hp-left-val');
    const valR = document.getElementById('av-hp-right-val');
    if (barL) { barL.style.width = pctA + '%'; barL.className = 'pf-hp-bar-fill ' + (pctA > 50 ? 'green' : pctA > 25 ? 'yellow' : 'red'); }
    if (barR) { barR.style.width = pctB + '%'; barR.className = 'pf-hp-bar-fill ' + (pctB > 50 ? 'green' : pctB > 25 ? 'yellow' : 'red'); }
    if (valL) valL.textContent = hpA;
    if (valR) valR.textContent = hpB;

    // Round label
    setText('av-round-label', `ROUND ${currentRound + 1}`);
  }

  function _appendTrollboxEntry(html) {
    const box = document.getElementById('trollbox-entries');
    if (!box) return;
    const el  = document.createElement('div');
    el.className = 'trollbox-msg system-msg';
    el.innerHTML = html;
    box.prepend(el);
  }

  // -- PUMPFIGHTERS LIVE DATA --
  let pfState = null;
  let lbTab = 'all';
  let pfBattleAnimTimer = null;
  let pendingArenaReset = null;

  async function fetchPumpState() {
    try {
      const res = await fetch('/api/pumpfighters/state');
      pfState = await res.json();
      renderPumpLiveArena();
      renderPumpFighters();
    renderLiveBattles();
    renderSidebarLiveBattles();
    renderSidebarLeaderboard();
    } catch (e) { console.error('fetchPumpState:', e); }
  }

  async function fetchPumpLeaderboard() {
    try {
      const res = await fetch('/api/pumpfighters/leaderboard?chain=' + lbTab);
      const data = await res.json();
      renderPumpLeaderboard(data);
    } catch (e) { console.error('fetchPumpLeaderboard:', e); }
  }

  function showWinnerModal(winnerName, loserName) {
    const overlay = document.getElementById('winner-modal-overlay');
    if (!overlay) return;
    const title = overlay.querySelector('.winner-modal-title');
    const body = overlay.querySelector('.winner-modal-body');
    if (title) title.textContent = '🏆 Winner!';
    if (body) {
      body.innerHTML = `
        <div class="winner-matchup">${winnerName}</div>
        <div class="winner-detail">defeated ${loserName} in the arena</div>
      `;
    }
    overlay.classList.add('open');
  }

  function closeWinnerModal() {
    const overlay = document.getElementById('winner-modal-overlay');
    if (overlay) overlay.classList.remove('open');
    if (typeof pendingArenaReset === 'function') {
      pendingArenaReset();
      pendingArenaReset = null;
    }
  }
  window.closeWinnerModal = closeWinnerModal;

  function fmtMcap(v) {
    if (!v) return '$0';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(v);
  }

  window.switchMatch = function(index) {
    current_match_index = index;
    if (pfBattleAnimTimer) clearInterval(pfBattleAnimTimer);
    pfBattleAnimTimer = null;
    
    // Check if we are in PFP mode or PumpFighters mode
    const isPFPMode = document.getElementById('pf-pfp-arena')?.style.display !== 'none';
    if (isPFPMode) {
      renderPFPState(window.lastPfpData);
    } else {
      renderPumpLiveArena();
    }
  };

  function renderPumpLiveArena() {
    const waiting = document.getElementById('pf-waiting');
    const liveEl  = document.getElementById('pf-live-match');
    if (!pfState || !liveEl) return;

    const matches = pfState.live_matches || (pfState.live_match ? [pfState.live_match] : []);
    const match = matches[current_match_index] || matches[0];

    if (!match) {
      if (waiting) {
        waiting.style.display = 'flex';
      }
      liveEl.style.display = 'none';
      return;
    }

    if (waiting) waiting.style.display = 'none';
    liveEl.style.display = 'flex';

    const fA = match.fighter_a;
    const fB = match.fighter_b;

    // Top info panels
    const setImg = (id, src) => {
      const el = document.querySelector('#' + id + ' img');
      if (el) el.src = src || '';
    };
    setImg('pf-fia-left', fA.processed_avatar || fA.image_uri);
    setImg('pf-fia-right', fB.processed_avatar || fB.image_uri);
    document.getElementById('pf-fin-left').textContent = fA.display_name;
    document.getElementById('pf-fin-right').textContent = fB.display_name;
    document.getElementById('pf-fic-left').textContent = (fA.chain || '').toUpperCase();
    document.getElementById('pf-fic-right').textContent = (fB.chain || '').toUpperCase();
    document.getElementById('pf-fib-left').textContent = fmtMcap(fA.market_cap_usd);
    document.getElementById('pf-fib-right').textContent = fmtMcap(fB.market_cap_usd);

    // Big avatars
    document.getElementById('pf-ba-left-img').src = fA.processed_avatar || fA.image_uri || '';
    document.getElementById('pf-ba-right-img').src = fB.processed_avatar || fB.image_uri || '';

    // Match label
    document.getElementById('pf-match-label').textContent = match.label || 'PumpFighters Battle';

    // Stats panel
    const sp = document.getElementById('pf-sp-fighters');
    if (sp && pfState.fighters) sp.textContent = pfState.fighters.length;
    const spM = document.getElementById('pf-sp-matches');
    if (spM && pfState.recent_battles) spM.textContent = pfState.recent_battles.length;

    // BC pool
    const bcPool = 576 + Math.round((fA.market_cap_usd || 0) / 5000);
    document.getElementById('pf-round-energy').textContent = '🪙 ' + bcPool.toLocaleString() + ' BC Pool';

    // Animate battle (HP bars simulation)
    if (!pfBattleAnimTimer) startBattleAnimation(fA, fB);

    // Battle log
    renderBattleLog();
  }

  function startBattleAnimation(fA, fB) {
    let hpA = fA.hp || 100;
    let hpB = fB.hp || 100;
    const maxA = hpA, maxB = hpB;
    let round = 1;
    let turnSide = 'left'; // alternates who attacks

    const combatants = document.querySelectorAll('#pf-live-match .pf-combatant');
    const leftCombatant = combatants[0];
    const rightCombatant = combatants[1];
    const spellCards = document.querySelectorAll('.pf-bottom-spell, .spell-icon');
    const hpBarL = document.getElementById('pf-hp-left');
    const hpBarR = document.getElementById('pf-hp-right');

    if (pfBattleAnimTimer) clearInterval(pfBattleAnimTimer);
    pfBattleAnimTimer = setInterval(() => {
      // Determine attacker & defender
      const isLeftAttacking = turnSide === 'left';
      const attacker = isLeftAttacking ? leftCombatant : rightCombatant;
      const defender = isLeftAttacking ? rightCombatant : leftCombatant;

      // Calculate damage smoothly over the remaining countdown (secs)
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
      round++;

      // ── Animate attacker lunging & projectile ──
      if (attacker) {
        attacker.classList.remove('attack-left', 'attack-right', 'melee-left', 'melee-right', 'spell-cast-rise', 'hit');
        void attacker.offsetWidth; // reflow

        const attackType = Math.random();

        if (attackType < 0.33) {
          // Melee
          if (defender) {
            const attRect = attacker.getBoundingClientRect();
            const defRect = defender.getBoundingClientRect();
            const distanceX = (defRect.left + defRect.width / 2) - (attRect.left + attRect.width / 2);
            // Move 80% of the way to collide visually without overlapping too much
            const targetX = distanceX * 0.8;
            
            attacker.animate([
              { transform: 'translateX(0) scale(1) rotate(0deg)' },
              { transform: `translateX(${targetX}px) scale(1.2) rotate(${isLeftAttacking ? 15 : -15}deg)`, offset: 0.4 },
              { transform: `translateX(${targetX * 0.8}px) scale(1.1) rotate(${isLeftAttacking ? 5 : -5}deg)`, offset: 0.6 },
              { transform: 'translateX(0) scale(1) rotate(0deg)' }
            ], {
              duration: 500,
              easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
            });

            setTimeout(() => {
              if (window.playExplosionAnimation) {
                window.playExplosionAnimation(defRect.left + defRect.width / 2, defRect.top + defRect.height / 2);
              }
              if (window.spawnDamageNumber) window.spawnDamageNumber(defRect.left + defRect.width / 2, defRect.top + defRect.height / 4, dmg);
              defender.classList.add('hit');
            }, 200);
          }
        } else if (attackType < 0.66) {
          // Thunder Strike
          attacker.classList.add('spell-cast-rise');
          if (defender) {
            setTimeout(() => {
              const attRect = attacker.getBoundingClientRect();
              const defRect = defender.getBoundingClientRect();
              const startX = attRect.left + attRect.width / 2;
              const startY = attRect.top + attRect.height / 2;
              const endX = defRect.left + defRect.width / 2;
              const endY = defRect.top + defRect.height / 2;
              
              if (window.playThunderAnimation) {
                window.playThunderAnimation(startX, startY, endX, endY, () => {
                  if (window.playThunderImpact) window.playThunderImpact(endX, endY);
                  if (window.spawnDamageNumber) window.spawnDamageNumber(defRect.left + defRect.width / 2, defRect.top + defRect.height / 4, dmg);
              defender.classList.add('hit');
                });
              }
            }, 300); // 300ms is the apex of the rise animation
          }
        } else {
          // Firearrow
          attacker.classList.add(isLeftAttacking ? 'attack-left' : 'attack-right');
          if (defender) {
            const attRect = attacker.getBoundingClientRect();
            const defRect = defender.getBoundingClientRect();
            const startX = attRect.left + attRect.width / 2;
            const startY = attRect.top + attRect.height / 2;
            const endX = defRect.left + defRect.width / 2;
            const endY = defRect.top + defRect.height / 2;
            
            if (window.playProjectileAnimation) {
              window.playProjectileAnimation(startX, startY, endX, endY, () => {
                if (window.playExplosionAnimation) window.playExplosionAnimation(endX, endY);
                if (window.spawnDamageNumber) window.spawnDamageNumber(defRect.left + defRect.width / 2, defRect.top + defRect.height / 4, dmg);
              defender.classList.add('hit');
              });
            }
          }
        }
      }

      const pctA = Math.round((hpA / maxA) * 100);
      const pctB = Math.round((hpB / maxB) * 100);
      const battleOver = hpA <= 0 || hpB <= 0;
      const winner = battleOver ? (hpA <= 0 ? rightCombatant : leftCombatant) : null;
      const winnerName = battleOver ? (hpA <= 0 ? fB.display_name : fA.display_name) : '';
      const loserName = battleOver ? (hpA <= 0 ? fA.display_name : fB.display_name) : '';

      if (hpBarL) {
        hpBarL.style.width = pctA + '%';
        hpBarL.className = 'pf-hp-bar-fill ' + (pctA > 40 ? 'green' : 'red');
        hpBarL.classList.add('pulse');
        setTimeout(() => hpBarL.classList.remove('pulse'), 220);
      }
      if (hpBarR) {
        hpBarR.style.width = pctB + '%';
        hpBarR.className = 'pf-hp-bar-fill ' + (pctB > 40 ? 'green' : 'red');
        hpBarR.classList.add('pulse');
        setTimeout(() => hpBarR.classList.remove('pulse'), 220);
      }
      const valL = document.getElementById('pf-hp-left-val');
      const valR = document.getElementById('pf-hp-right-val');
      if (valL) valL.textContent = Math.round(hpA);
      if (valR) valR.textContent = Math.round(hpB);

      const rl = document.getElementById('pf-round-label');
      if (rl) rl.textContent = 'ROUND 1';

      // Flip attacker for next turn
      if (!battleOver) {
        turnSide = isLeftAttacking ? 'right' : 'left';
      }

      // ── Animate active spell icon on the attacking side ──
      const spellGroups = document.querySelectorAll('.pf-spells-group');
      const activeGroup = isLeftAttacking ? spellGroups[0] : spellGroups[1];
      if (activeGroup && !battleOver) {
        const spells = activeGroup.querySelectorAll('.pf-bottom-spell');
        document.querySelectorAll('.pf-bottom-spell.spell-active').forEach(s => s.classList.remove('spell-active'));
        if (spells.length) {
          const picked = spells[Math.floor(Math.random() * spells.length)];
          picked.classList.add('spell-active');
          setTimeout(() => picked.classList.remove('spell-active'), 700);
        }
      }

      if (battleOver) {
        clearInterval(pfBattleAnimTimer);
        pfBattleAnimTimer = null;
        if (winner) winner.style.filter = 'drop-shadow(0 0 20px #14F195)';
        
        if (typeof showWinnerModal === 'function') {
          showWinnerModal(winnerName, loserName);
        }

        pendingArenaReset = () => {
          if (winner) winner.style.filter = '';
          if (leftCombatant) leftCombatant.classList.remove('attack-left', 'attack-right', 'melee-left', 'melee-right', 'spell-cast-rise', 'hit');
          if (rightCombatant) rightCombatant.classList.remove('attack-left', 'attack-right', 'melee-left', 'melee-right', 'spell-cast-rise', 'hit');
          spellCards.forEach(c => c.style.borderColor = '');
          if (hpBarL) { hpBarL.style.width = '100%'; hpBarL.className = 'pf-hp-bar-fill green'; }
          if (hpBarR) { hpBarR.style.width = '100%'; hpBarR.className = 'pf-hp-bar-fill green'; }
          if (rl) rl.textContent = 'ROUND 1';
          
          // Autonomous transition to next match
          current_match_index++;
          if (current_match_index >= 4) current_match_index = 0; // Wrap around
          
          // Switch match visually
          window.switchMatch(current_match_index);
        };

        setTimeout(() => {
          if (document.getElementById('winner-modal-overlay')?.classList.contains('open')) {
            closeWinnerModal(); // This will naturally call pendingArenaReset if we hook it up
          }
        }, 3500); // reduced to 3.5s for faster autonomous flow
      }
    }, 800);
  }

  // Track last rendered battle count to avoid duplicate trollbox entries
  let _lastBattleCount = 0;
  function renderBattleLog() {
    if (!pfState || !pfState.recent_battles) return;
    const recent = pfState.recent_battles;
    if (recent.length <= _lastBattleCount) return;
    // Only post new battles since last render
    const newBattles = recent.slice(_lastBattleCount);
    _lastBattleCount = recent.length;
    const box = document.getElementById('trollbox');
    if (!box) return;
    newBattles.forEach((b, i) => {
      const div = document.createElement('div');
      div.className = 'troll-msg';
      div.innerHTML = `<span class="troll-user" style="color:#F3BA2F">⚔️ Battle:</span> <span style="color:#14F195">${b.winner_name}</span> defeated <span style="color:#EF4444">${b.loser_name}</span> <span style="color:rgba(255,255,255,0.5)">(${b.rounds} rounds)</span>`;
      box.appendChild(div);
      if (box.children.length > 12) box.removeChild(box.children[0]);
    });
    box.scrollTop = box.scrollHeight;
  }

  
  function renderLiveBattles() {
    const list = document.getElementById('live-battles-list');
    if (!list || !pfState) return;

    const matches = pfState.live_matches || (pfState.live_match ? [pfState.live_match] : []);
    let html = '';
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const f1 = match.fighter_a;
      const f2 = match.fighter_b;
      const isActive = i === current_match_index ? 'border: 1px solid #14F195; box-shadow: 0 0 10px rgba(20,241,149,0.3);' : '';
      const aStyle = f1.processed_avatar ? `background-image:url(${f1.processed_avatar}); background-size:cover; background-position:center; font-size:0; color:transparent; display:inline-block; width:16px; height:16px; vertical-align:middle; border-radius:4px; margin-right:4px;` : '';
      const bStyle = f2.processed_avatar ? `background-image:url(${f2.processed_avatar}); background-size:cover; background-position:center; font-size:0; color:transparent; display:inline-block; width:16px; height:16px; vertical-align:middle; border-radius:4px; margin-right:4px;` : '';
      const aFallback = f1.processed_avatar ? '' : (f1.emoji || '🥊') + ' ';
      const bFallback = f2.processed_avatar ? '' : (f2.emoji || '🥊') + ' ';
      html += `
        <div class="pfpmode-item">
          <div class="pfpmode-match"><span style="${aStyle}">${aFallback}</span><span>${f1.name}</span> <span style="color:#666; font-size:10px;">VS</span> <span style="${bStyle}">${bFallback}</span><span>${f2.name}</span></div>
          <div class="pfpmode-badge">LIVE</div>
        </div>
      `;
    }
    list.innerHTML = html;
  }

  
  function renderSidebarLiveBattles() {
    const container = document.getElementById('sidebar-live-battles');
    if (!container || !pfState || !pfState.fighters) return;
    
    const fighters = pfState.fighters;
    let html = '';
    // Create battle pairs from real fighters
    for (let i = 0; i < fighters.length - 1 && i < 6; i += 2) {
      const fA = fighters[i];
      const fB = fighters[i + 1];
      const aStyle = fA.processed_avatar ? 'background-image:url(' + fA.processed_avatar + '); background-size:cover; background-position:center; font-size:0; color:transparent;' : '';
      const bStyle = fB.processed_avatar ? 'background-image:url(' + fB.processed_avatar + '); background-size:cover; background-position:center; font-size:0; color:transparent;' : '';
      const aFallback = fA.processed_avatar ? '' : (fA.emoji || '&#x1F94A;');
      const bFallback = fB.processed_avatar ? '' : (fB.emoji || '&#x1F94A;');
      html += '<div class="battle-item">' +
        '<div class="fighter-mini"><div class="avatar-sm" style="' + aStyle + '">' + aFallback + '</div><div class="fname">' + (fA.display_name || fA.name) + '</div></div>' +
        '<div class="vs-badge">VS</div>' +
        '<div class="fighter-mini"><div class="avatar-sm" style="' + bStyle + '">' + bFallback + '</div><div class="fname">' + (fB.display_name || fB.name) + '</div></div>' +
        '<span class="live-badge">LIVE</span>' +
      '</div>';
    }
    container.innerHTML = html;
  }

  
  function renderSidebarLeaderboard() {
    const container = document.getElementById('sidebar-leaderboard-list');
    if (!container || !pfState || !pfState.fighters) return;
    
    // Sort fighters by wins or rank
    const fighters = [...pfState.fighters].sort((a, b) => (b.wins || 0) - (a.wins || 0)).slice(0, 3);
    
    let html = '';
    fighters.forEach((f, i) => {
      const rankLabel = i === 0 ? '&#x1F947;' : i === 1 ? '&#x1F948;' : i === 2 ? '&#x1F949;' : (i + 1);
      const avatarStyle = f.processed_avatar ? 'background-image:url(' + f.processed_avatar + '); background-size:cover; background-position:center; font-size:0; color:transparent;' : '';
      const fallback = f.processed_avatar ? '' : (f.emoji || '&#x1F94A;');
      html += '<div class="lb-item" onclick="watchToEarn(\'' + f.unique_id + '\', null)">' +
        '<div class="lb-rank">' + rankLabel + '</div>' +
        '<div class="lb-avatar" style="' + avatarStyle + '">' + fallback + '</div>' +
        '<div class="lb-info">' +
          '<div class="lb-name">' + (f.display_name || f.name) + '</div>' +
          '<div class="lb-meta"><span class="wins lb-wins-val">' + (f.wins || 0) + ' W</span> &bull; <span class="lb-bc">' + (f.market_cap_usd ? '$' + (f.market_cap_usd/1000).toFixed(1) + 'K' : '0 BC') + '</span></div>' +
        '</div>' +
      '</div>';
    });
    container.innerHTML = html;
  }

  function renderPumpFighters() {

    const list = document.getElementById('pf-fighters-list');
    const avList = document.getElementById('av-fighters-list');
    if ((!list && !avList) || !pfState || !pfState.fighters) return;

    const html = pfState.fighters.slice(0, 4).map((f, i) => {
      let chainEmoji = '&#x1F680;';
      let badgeClass = '';
      if (f.chain === 'solana') { chainEmoji = '&#x1F7E3;'; badgeClass = 'secondary'; }
      if (f.chain === 'bsc') { chainEmoji = '&#x1F7E1;'; badgeClass = 'orange'; }
      if (f.chain === 'base') { chainEmoji = '&#x1F535;'; badgeClass = 'destructive'; }
      if (f.chain === 'robinhood') { chainEmoji = '&#x1F985;'; badgeClass = 'secondary'; }

      const avatarSrc = f.processed_avatar || f.image_uri;
      const avatarStyle = avatarSrc
        ? 'background-image:url(' + avatarSrc + '); background-size:cover; background-position:center; font-size:0;'
        : '';

      return '<div class="fighter-card">' +
        '<div class="rank-badge ' + badgeClass + '">' + (i + 1) + '</div>' +
        '<div class="fc-header">' +
          '<div class="fc-avatar" style="' + avatarStyle + '">' + (avatarSrc ? '' : chainEmoji) + '</div>' +
          '<div class="fc-meta"><div class="fc-name">' + f.display_name + '</div>' +
          '<div class="fc-holders">' + (f.full_name || '') + '</div></div>' +
        '</div>' +
        '<div class="fc-stats">' +
          '<div class="fc-stat">MCAP <span class="fc-mcap-val">' + fmtMcap(f.market_cap_usd) + '</span></div>' +
          '<div class="fc-stat">CHAIN <span class="pos">' + chainEmoji + ' ' + (f.chain || '').toUpperCase() + '</span></div>' +
        '</div>' +
        '<div class="fc-rewards">HP: ' + (f.hp||100) + ' | ATK: ' + (f.aggression||50) + ' | DEF: ' + (f.defense||50) + ' | W/L: ' + (f.wins||0) + '/' + (f.losses||0) + '</div>' +
        '<button class="watch-btn' + (i === 0 ? ' primary' : '') + '" onclick="watchToEarn(\'' + f.unique_id + '\', this)">WATCH 2 EARN</button>' +
      '</div>';
    }).join('');

    if (list) list.innerHTML = html;
    if (avList) avList.innerHTML = html;
  }

  function lbSkeletonHTML(n) {
    return Array.from({length: n}, () =>
      '<div class="full-lb-row skel-row">' +
        '<div class="skel skel-rank"></div>' +
        '<div class="skel skel-avatar"></div>' +
        '<div class="full-lb-info">' +
          '<div class="skel skel-name"></div>' +
          '<div class="skel skel-meta"></div>' +
        '</div>' +
        '<div class="skel skel-bc"></div>' +
      '</div>'
    ).join('');
  }

  function renderPumpLeaderboard(data) {
    const container = document.getElementById('full-lb-list');
    if (!container) return;

    if (!data || data.length === 0) {
      if (!container.querySelector('.skel-row')) container.innerHTML = lbSkeletonHTML(8);
      return;
    }

    container.innerHTML = data.map((s, i) => {
      const rankLabel = i === 0 ? '&#x1F947;' : i === 1 ? '&#x1F948;' : i === 2 ? '&#x1F949;' : (i + 1);
      const lbAvatarSrc = s.processed_avatar || s.image_uri;
      const avatarStyle = lbAvatarSrc
        ? 'background-image:url(' + lbAvatarSrc + '); background-size:cover; background-position:center; border-radius:50%; width:32px; height:32px; display:inline-block;'
        : 'font-size:20px;';
      return '<div class="full-lb-row">' +
        '<div class="full-lb-rank">' + rankLabel + '</div>' +
        '<div class="full-lb-avatar" style="' + avatarStyle + '">' + (lbAvatarSrc ? '' : '&#x1F680;') + '</div>' +
        '<div class="full-lb-info"><div class="full-lb-name">' + s.display_name + '</div>' +
        '<div class="full-lb-meta">' + (s.wins||0) + 'W / ' + (s.losses||0) + 'L</div></div>' +
        '<div class="full-lb-bc">' + (s.chain || '').toUpperCase() + '</div></div>';
    }).join('');
  }

  function setLbTab(el) {
    document.querySelectorAll('#view-leaderboard .challenge-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    lbTab = el.getAttribute('data-lbtab');
    const c = document.getElementById('full-lb-list');
    if (c) c.innerHTML = lbSkeletonHTML(8);
    fetchPumpLeaderboard();
  }

  setInterval(fetchPumpState, 5000);
  setInterval(fetchPumpLeaderboard, 10000);
  fetchPumpState();
  (function(){ const c = document.getElementById('full-lb-list'); if(c) c.innerHTML = lbSkeletonHTML(8); })();
  fetchPumpLeaderboard();
  loadProfile();
  loadNotifications();
  refreshFighterCount();
  setInterval(loadNotifications, 15000);
  setInterval(refreshFighterCount, 20000);

  // ── Market Energy Polling ──────────────────────────────────────────────────
  let _pumpBannerTimeout = null;

  function updatePumpEnergyUI(energyStates) {
    if (!pfState || !pfState.live_match) return;
    const fA = pfState.live_match.fighter_a;
    const fB = pfState.live_match.fighter_b;
    if (!fA || !fB) return;

    function applyEnergy(uid, barId, readyId, avatarId) {
      const es = energyStates[uid];
      if (!es) return;
      const bar    = document.getElementById(barId);
      const ready  = document.getElementById(readyId);
      const avatar = document.getElementById(avatarId);
      if (!bar || !ready) return;

      const pct = Math.min(100, es.energy || 0);
      bar.style.width = pct + '%';

      if (pct >= 100) {
        ready.classList.add('active');
        if (avatar) avatar.classList.add('pump-charged');
        // Show arena banner
        const banner = document.getElementById('pf-pump-banner');
        if (banner) {
          const name = avatar ? avatar.getAttribute('alt') : '???';
          banner.textContent = `\u26a1 ${name.toUpperCase()} PUMP READY!`;
          banner.classList.add('show');
          clearTimeout(_pumpBannerTimeout);
          _pumpBannerTimeout = setTimeout(() => banner.classList.remove('show'), 2500);
        }
      } else {
        ready.classList.remove('active');
        if (avatar) avatar.classList.remove('pump-charged');
      }
    }

    applyEnergy(fA.unique_id, 'pf-pump-left',  'pf-pump-ready-left',  'pf-ba-left-img');
    applyEnergy(fB.unique_id, 'pf-pump-right', 'pf-pump-ready-right', 'pf-ba-right-img');
  }

  async function fetchMarketEnergy() {
    try {
      const res  = await fetch('/api/pumpfighters/market-energy');
      if (!res.ok) return;
      const data = await res.json();
      updatePumpEnergyUI(data);
    } catch (e) { /* silent fail */ }
  }

  setInterval(fetchMarketEnergy, 5000);
  fetchMarketEnergy();





  // Restore tab from URL hash on load
  window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const btn = document.querySelector(`.nav-tab[data-view="${hash}"]`);
      if (btn) setTab(btn);
    } else {
      // Default to pumpfighters if no hash
      const defaultBtn = document.querySelector(`.nav-tab[data-view="pumpfighters"]`);
      if (defaultBtn) setTab(defaultBtn);
    }
  });

  // ── Audio & Animation Engine ──
  let isAudioPlaying = false;
  window.toggleAudio = function() {
    const audio = document.getElementById('ambient-audio');
    const btn = document.getElementById('audio-toggle');
    const btnMob = document.getElementById('audio-toggle-mobile');
    if (!audio) return;
    if (isAudioPlaying) {
      audio.pause();
      isAudioPlaying = false;
      if (btn) btn.innerHTML = '🔊 Sound: OFF';
      if (btnMob) btnMob.innerHTML = '🔊 Sound: OFF';
    } else {
      audio.play().then(() => {
        isAudioPlaying = true;
        if (btn) btn.innerHTML = '🔊 Sound: ON';
        if (btnMob) btnMob.innerHTML = '🔊 Sound: ON';
      }).catch(e => console.error("Audio play failed:", e));
    }
  };

  const FIRE_ARROW_FRAMES = 8;
  const EXPLOSION_FRAMES = 10;
  
  window.playProjectileAnimation = function(startX, startY, endX, endY, onComplete) {
    const proj = document.createElement('div');
    proj.className = 'projectile';
    proj.style.left = startX + 'px';
    proj.style.top = startY + 'px';
    
    // rotation to face target, with chaos jitter
    const jitterX = (Math.random() - 0.5) * 80;
    const jitterY = (Math.random() - 0.5) * 80;
    const dx = (endX + jitterX) - startX;
    const dy = (endY + jitterY) - startY;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    // apply translate first, then rotate (arrow points right by default, so no offset is needed)
    proj.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    
    document.body.appendChild(proj);
    
    let frame = 1;
    let projInterval = setInterval(() => {
      proj.style.backgroundImage = `url('/Arena/assets/firearrow/Fire_Arrow_Frame_0${frame}.png')`;
      frame++;
      if (frame > FIRE_ARROW_FRAMES) frame = 1;
    }, 50); // 20fps
    
    // Animate movement (0.4s CSS transition matches transition definition)
    setTimeout(() => {
      proj.style.left = (endX + jitterX) + 'px';
      proj.style.top = (endY + jitterY) + 'px';
    }, 50);
    
    setTimeout(() => {
      clearInterval(projInterval);
      if (proj.parentNode) proj.remove();
      if (onComplete) onComplete();
    }, 400); 
  };

  
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

  window.playExplosionAnimation = function(x, y) {
    const expl = document.createElement('div');
    expl.className = 'explosion';
    expl.style.left = x + 'px';
    expl.style.top = y + 'px';
    document.body.appendChild(expl);
    
    let frame = 1;
    let explInterval = setInterval(() => {
      expl.style.backgroundImage = `url('/Arena/assets/explosions/Explosion_${frame}.png')`;
      frame++;
      if (frame > EXPLOSION_FRAMES) {
        clearInterval(explInterval);
        if (expl.parentNode) expl.remove();
      }
    }, 50); // 20fps
  };

  window.playThunderAnimation = function(startX, startY, endX, endY, onComplete) {
    const proj = document.createElement('div');
    proj.className = 'projectile';
    // 256x128 aspect ratio for the horizontal thunder beam
    proj.style.width = '200px';
    proj.style.height = '100px';
    proj.style.left = startX + 'px';
    proj.style.top = startY + 'px';
    
    const jitterX = (Math.random() - 0.5) * 80;
    const jitterY = (Math.random() - 0.5) * 80;
    const dx = (endX + jitterX) - startX;
    const dy = (endY + jitterY) - startY;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Straight thunder points horizontally right, so no +90deg offset needed.
    proj.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    
    document.body.appendChild(proj);
    
    let frame = 1;
    let projInterval = setInterval(() => {
      proj.style.backgroundImage = `url('/Arena/assets/thunder/lightning_skill2_frame${frame}.png')`;
      frame++;
      if (frame > 4) frame = 1;
    }, 50); // 20fps
    
    setTimeout(() => {
      proj.style.left = (endX + jitterX) + 'px';
      proj.style.top = (endY + jitterY) + 'px';
    }, 50);
    
    setTimeout(() => {
      clearInterval(projInterval);
      if (proj.parentNode) proj.remove();
      if (onComplete) onComplete();
    }, 400); 
  };

  window.playThunderImpact = function(x, y) {
    const expl = document.createElement('div');
    expl.className = 'explosion';
    // 128x256 aspect ratio for the vertical lightning strike
    expl.style.width = '120px';
    expl.style.height = '240px';
    expl.style.left = x + 'px';
    expl.style.top = y + 'px';
    // Strike the ground at the defender's feet rather than perfectly center
    expl.style.transform = `translate(-50%, -80%)`;
    document.body.appendChild(expl);
    
    let frame = 1;
    let explInterval = setInterval(() => {
      expl.style.backgroundImage = `url('/Arena/assets/thunder_impact/lightning_skill4_frame${frame}.png')`;
      frame++;
      if (frame > 5) {
        clearInterval(explInterval);
        if (expl.parentNode) expl.remove();
      }
    }, 50);
  };

  // Handle browser back/forward buttons
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1) || 'pumpfighters';
    const btn = document.querySelector(`.nav-tab[data-view="${hash}"]`);
    if (btn) setTab(btn);
  });

