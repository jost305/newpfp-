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

  const PRIVY_APP_ID = '__PRIVY_APP_ID__';
  let privyLoginHandler = null;

  function openPrivyAuthModal() {
    if (!privyBootOk) {
      alert('Wallet login is temporarily unavailable. Please refresh the page.');
      return;
    }
    if (privyLoginHandler) {
      privyLoginHandler({
        loginMethods: ['wallet', 'email', 'passkey', 'google', 'twitter', 'discord', 'github'],
      });
      return;
    }
    console.warn('Privy login handler is not ready yet.');
  }

  window.openPrivyAuthModal = openPrivyAuthModal;

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

      // Expose wallet address globally so other JS can use it for API calls
      React.useEffect(() => {
        if (authenticated && user) {
          const wallet = user.wallet?.address || user.linkedAccounts?.find(a => a.type === 'wallet')?.address || '';
          window.currentWalletAddress = wallet.toLowerCase();
        } else {
          window.currentWalletAddress = '';
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
            loginMethods: ['wallet', 'email', 'passkey', 'google', 'twitter', 'discord', 'github'],
            appearance: {
              theme: 'dark',
              accentColor: '#f59e0b',
              logo: '/newpfp/assets/bota-logo.jpg',
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
    el.classList.add('active');

    const view = el.getAttribute('data-view');
    document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');

    document.getElementById('notif-dropdown').classList.remove('open');
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
  if (location.hash) activateTabByName(location.hash.replace('#', ''));
  window.openProfileView = openProfileView;
  window.toggleSearchModal = toggleSearchModal;
  window.closeSearchModal = closeSearchModal;
  window.toggleMobileMenu = toggleMobileMenu;
  window.closeMobileMenu = closeMobileMenu;
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
      throw new Error('Request failed');
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

  async function loadMyAgents(wallet) {
    const grid = document.getElementById('agents-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="agent-empty">Loading…</div>';
    try {
      const agents = await api(`/api/my-agents?wallet=${encodeURIComponent(wallet || '')}`);
      if (!agents.length) {
        grid.innerHTML = '<div class="agent-empty">No agents yet. <a onclick="document.querySelector(\'[data-view=create]\').click()">Create your first fighter →</a></div>';
        return;
      }
      grid.innerHTML = agents.map(a => {
        const avatar = a.avatarUrl
          ? `<img class="agent-avatar" src="${a.avatarUrl}" alt="${a.name}" style="width:56px;height:56px;border-radius:14px;object-fit:cover;border:2px solid hsl(var(--bb-primary));">`
          : `<div class="agent-avatar">🤖</div>`;
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
      grid.innerHTML = '<div class="agent-empty">Could not load agents.</div>';
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
      loadMyAgents(wallet);
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

  function watchToEarn(key, btnEl) {
    const fighter = cardFighters[key];
    if (!fighter) return;

    const slot = nextArenaSlot;
    document.getElementById(slot + '-arena-avatar').textContent = fighter.emoji;
    document.getElementById(slot + '-arena-name').textContent = fighter.name;
    document.getElementById(slot + '-arena-bc').textContent = fighter.bc;

    nextArenaSlot = slot === 'left' ? 'right' : 'left';

    if (btnEl) {
      const original = btnEl.textContent;
      btnEl.textContent = '✓ IN ARENA';
      setTimeout(() => { btnEl.textContent = original; }, 1200);
    }
  }

  let secs = 45;
  setInterval(() => {
    secs = secs > 0 ? secs - 1 : 59;
    const el = document.getElementById('timer');
    if (el) el.textContent =
      String(Math.floor(secs / 60)).padStart(2,'0') + ':' +
      String(secs % 60).padStart(2,'0');
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

  function cpSyncStat(stat, minV, maxV) {
    let val = parseInt(document.getElementById('cp-' + stat).value) || minV;
    val = Math.max(minV, Math.min(maxV, val));
    const pct = ((val - minV) / (maxV - minV)) * 100;

    document.getElementById('cp-' + stat + '-bar').style.width = pct + '%';
    document.getElementById('prev-' + stat + '-bar').style.width = pct + '%';
    document.getElementById('prev-' + stat + '-val').textContent = val;
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

  function cpDeploy() {
    alert('Fighter ' + document.getElementById('cp-name').value + ' deployed to Arena!');
  }

  window.cpHandleFile = cpHandleFile;
  window.cpSyncImageUrl = cpSyncImageUrl;
  window.cpSyncStat = cpSyncStat;
  window.cpSync = cpSync;
  window.cpLoadPreset = cpLoadPreset;
  window.cpDeploy = cpDeploy;

  // -- PUMPFIGHTERS LIVE DATA --
  let pfState = null;
  let lbTab = 'all';
  let pfBattleAnimTimer = null;

  async function fetchPumpState() {
    try {
      const res = await fetch('/api/pumpfighters/state');
      pfState = await res.json();
      renderPumpLiveArena();
      renderPumpFighters();
    } catch (e) { console.error('fetchPumpState:', e); }
  }

  async function fetchPumpLeaderboard() {
    try {
      const res = await fetch('/api/pumpfighters/leaderboard?chain=' + lbTab);
      const data = await res.json();
      renderPumpLeaderboard(data);
    } catch (e) { console.error('fetchPumpLeaderboard:', e); }
  }

  function fmtMcap(v) {
    if (!v) return '$0';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(v);
  }

  function renderPumpLiveArena() {
    const waiting = document.getElementById('pf-waiting');
    const liveEl  = document.getElementById('pf-live-match');
    if (!pfState || !liveEl) return;

    if (!pfState.live_match) {
      if (waiting) {
        waiting.style.display = 'flex';
        if (pfState.is_refreshing) {
          waiting.querySelector('.pf-waiting-text').textContent = 'Fetching Trending Coins...';
        } else if (pfState.fighters && pfState.fighters.length > 0) {
          waiting.querySelector('.pf-waiting-text').textContent = 'Processing next match...';
        } else {
          waiting.querySelector('.pf-waiting-text').textContent = 'Waiting for coins from DexScreener...';
          waiting.querySelector('.pf-waiting-sub').textContent =
            pfState.next_refresh_in ? 'Next refresh in ' + pfState.next_refresh_in + 's' : '';
        }
      }
      liveEl.style.display = 'none';
      return;
    }

    if (waiting) waiting.style.display = 'none';
    liveEl.style.display = 'flex';

    const fA = pfState.live_match.fighter_a;
    const fB = pfState.live_match.fighter_b;
    const match = pfState.live_match;

    // Top info panels
    const setImg = (id, src) => {
      const el = document.querySelector('#' + id + ' img');
      if (el) el.src = src || '';
    };
    setImg('pf-fia-left', fA.processed_avatar);
    setImg('pf-fia-right', fB.processed_avatar);
    document.getElementById('pf-fin-left').textContent = fA.display_name;
    document.getElementById('pf-fin-right').textContent = fB.display_name;
    document.getElementById('pf-fic-left').textContent = (fA.chain || '').toUpperCase();
    document.getElementById('pf-fic-right').textContent = (fB.chain || '').toUpperCase();
    document.getElementById('pf-fib-left').textContent = fmtMcap(fA.market_cap_usd);
    document.getElementById('pf-fib-right').textContent = fmtMcap(fB.market_cap_usd);

    // Big avatars
    document.getElementById('pf-ba-left-img').src = fA.processed_avatar || '';
    document.getElementById('pf-ba-right-img').src = fB.processed_avatar || '';

    // Match label
    document.getElementById('pf-match-label').textContent = match.label || 'PumpFighters Battle';

    // Stats panel
    const sp = document.getElementById('pf-sp-fighters');
    if (sp && pfState.fighters) sp.textContent = pfState.fighters.length;
    const spM = document.getElementById('pf-sp-matches');
    if (spM && pfState.recent_battles) spM.textContent = pfState.recent_battles.length;

    // BC pool
    const bcPool = 576 + Math.round((fA.market_cap_usd || 0) / 5000);
    document.getElementById('pf-round-energy').textContent = bcPool.toLocaleString() + ' BC Pool';

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

    if (pfBattleAnimTimer) clearInterval(pfBattleAnimTimer);
    pfBattleAnimTimer = setInterval(() => {
      const dmgA = Math.random() * 8 + 2;
      const dmgB = Math.random() * 8 + 2;
      hpB = Math.max(0, hpB - dmgA);
      hpA = Math.max(0, hpA - dmgB);
      round++;

      const pctA = Math.round((hpA / maxA) * 100);
      const pctB = Math.round((hpB / maxB) * 100);

      const hpBarL = document.getElementById('pf-hp-left');
      const hpBarR = document.getElementById('pf-hp-right');
      if (hpBarL) {
        hpBarL.style.width = pctA + '%';
        hpBarL.className = 'pf-hp-bar-fill ' + (pctA > 40 ? 'green' : 'red');
      }
      if (hpBarR) {
        hpBarR.style.width = pctB + '%';
        hpBarR.className = 'pf-hp-bar-fill ' + (pctB > 40 ? 'green' : 'red');
      }
      const valL = document.getElementById('pf-hp-left-val');
      const valR = document.getElementById('pf-hp-right-val');
      if (valL) valL.textContent = Math.round(hpA);
      if (valR) valR.textContent = Math.round(hpB);

      const rl = document.getElementById('pf-round-label');
      const rt = document.getElementById('pf-round-turn');
      if (rl) rl.textContent = 'ROUND ' + Math.ceil(round / 5);
      if (rt) rt.textContent = 'TURN ' + round;

      if (hpA <= 0 || hpB <= 0) {
        clearInterval(pfBattleAnimTimer);
        pfBattleAnimTimer = null;
        // Reset after 3s
        setTimeout(() => {
          hpA = maxA; hpB = maxB;
          if (hpBarL) { hpBarL.style.width = '100%'; hpBarL.className = 'pf-hp-bar-fill green'; }
          if (hpBarR) { hpBarR.style.width = '100%'; hpBarR.className = 'pf-hp-bar-fill green'; }
          if (valL) valL.textContent = maxA;
          if (valR) valR.textContent = maxB;
          if (rl) rl.textContent = 'ROUND 1';
          if (rt) rt.textContent = 'TURN 1';
          if (pfState && pfState.live_match) startBattleAnimation(pfState.live_match.fighter_a, pfState.live_match.fighter_b);
        }, 3000);
      }
    }, 600);
  }

  function renderBattleLog() {
    const el = document.getElementById('pf-bl-entries');
    if (!el || !pfState || !pfState.recent_battles) return;
    const recent = pfState.recent_battles.slice(-5).reverse();
    if (recent.length === 0) {
      el.innerHTML = '<div class="pf-bl-entry"><span class="pf-bl-turn">No battles yet</span></div>';
      return;
    }
    el.innerHTML = recent.map((b, i) =>
      '<div class="pf-bl-entry">' +
        '<span class="pf-bl-turn">Match ' + (i + 1) + '</span>' +
        '<span class="pf-bl-action">' + b.winner_name + '</span> defeated ' +
        '<span class="pf-bl-dmg">' + b.loser_name + '</span> (' + b.rounds + ' rounds)' +
      '</div>'
    ).join('');
  }

  function renderPumpFighters() {
    const list = document.getElementById('pf-fighters-list');
    if (!list || !pfState || !pfState.fighters) return;

    list.innerHTML = pfState.fighters.map((f, i) => {
      let chainEmoji = '&#x1F680;';
      let badgeClass = '';
      if (f.chain === 'solana') { chainEmoji = '&#x1F7E3;'; badgeClass = 'secondary'; }
      if (f.chain === 'bsc') { chainEmoji = '&#x1F7E1;'; badgeClass = 'orange'; }
      if (f.chain === 'base') { chainEmoji = '&#x1F535;'; badgeClass = 'destructive'; }

      const avatarStyle = f.processed_avatar
        ? 'background-image:url(' + f.processed_avatar + '); background-size:cover; background-position:center; font-size:0;'
        : '';

      return '<div class="fighter-card">' +
        '<div class="rank-badge ' + badgeClass + '">' + (i + 1) + '</div>' +
        '<div class="fc-header">' +
          '<div class="fc-avatar" style="' + avatarStyle + '">' + (f.processed_avatar ? '' : chainEmoji) + '</div>' +
          '<div class="fc-meta"><div class="fc-name">' + f.display_name + '</div>' +
          '<div class="fc-holders">' + (f.full_name || '') + '</div></div>' +
        '</div>' +
        '<div class="fc-stats">' +
          '<div class="fc-stat">MCAP <span class="fc-mcap-val">' + fmtMcap(f.market_cap_usd) + '</span></div>' +
          '<div class="fc-stat">CHAIN <span class="pos">' + chainEmoji + ' ' + (f.chain || '').toUpperCase() + '</span></div>' +
        '</div>' +
        '<div class="fc-rewards">HP: ' + (f.hp||100) + ' | ATK: ' + (f.aggression||50) + ' | DEF: ' + (f.defense||50) + ' | W/L: ' + (f.wins||0) + '/' + (f.losses||0) + '</div>' +
        '<button class="watch-btn' + (i === 0 ? ' primary' : '') + '">WATCH 2 EARN</button>' +
      '</div>';
    }).join('');
  }

  function renderPumpLeaderboard(data) {
    const container = document.getElementById('full-lb-list');
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--bb-muted-foreground);">No fighters yet. Waiting for DexScreener data...</div>';
      return;
    }

    container.innerHTML = data.map((s, i) => {
      const rankLabel = i === 0 ? '&#x1F947;' : i === 1 ? '&#x1F948;' : i === 2 ? '&#x1F949;' : (i + 1);
      const avatarStyle = s.processed_avatar
        ? 'background-image:url(' + s.processed_avatar + '); background-size:cover; background-position:center; border-radius:50%; width:32px; height:32px; display:inline-block;'
        : 'font-size:20px;';
      return '<div class="full-lb-row">' +
        '<div class="full-lb-rank">' + rankLabel + '</div>' +
        '<div class="full-lb-avatar" style="' + avatarStyle + '">' + (s.processed_avatar ? '' : '&#x1F680;') + '</div>' +
        '<div class="full-lb-info"><div class="full-lb-name">' + s.display_name + '</div>' +
        '<div class="full-lb-meta">' + (s.wins||0) + 'W / ' + (s.losses||0) + 'L</div></div>' +
        '<div class="full-lb-bc">' + (s.chain || '').toUpperCase() + '</div></div>';
    }).join('');
  }

  function setLbTab(el) {
    document.querySelectorAll('#view-leaderboard .challenge-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    lbTab = el.getAttribute('data-lbtab');
    fetchPumpLeaderboard();
  }

  setInterval(fetchPumpState, 5000);
  setInterval(fetchPumpLeaderboard, 10000);
  fetchPumpState();
  fetchPumpLeaderboard();
  loadProfile();
  loadNotifications();
  setInterval(tickMarket, 2500);
  setInterval(tickLeaderboard, 4000);
  setInterval(loadNotifications, 15000);