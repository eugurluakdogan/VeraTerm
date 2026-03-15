// nav.js — Tüm sayfalarda ortak kullanılan navigasyon
// Her HTML sayfası bu dosyayı include eder

(function() {
  const NAV_HTML = `
<div class="topbar">
  <a href="/index.html" class="logo"><div class="logo-dot"></div>Vera<span>Term</span></a>
  <nav class="nav">
    <div class="nav-item dropdown">
      <a class="nav-link">Sektörler <span class="arrow">▾</span></a>
      <div class="dropdown-menu">
        <div class="dropdown-section">
          <div class="dropdown-label">Rafineri</div>
          <a href="/tuprs.html" class="dropdown-item">
            <span class="di-ticker">TUPRS</span>
            <span class="di-name">Tüpraş</span>
          </a>
        </div>
        <div class="dropdown-divider"></div>
        <div class="dropdown-section">
          <div class="dropdown-label">Petrokimya</div>
          <a href="/petkm.html" class="dropdown-item">
            <span class="di-ticker">PETKM</span>
            <span class="di-name">Petkim</span>
          </a>
        </div>
      </div>
    </div>
  </nav>
  <div class="topbar-right">
    <div class="search-wrap">
      <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input class="search-input" id="globalSearch" type="text" placeholder="Şirket veya sembol ara...">
      <div class="search-results" id="searchResults"></div>
    </div>
    <span class="badge-premium">PREMIUM</span>
    <button class="btn btn-ghost">Giriş Yap</button>
    <button class="btn btn-primary">Üye Ol</button>
  </div>
</div>`;

  const NAV_CSS = `
  .topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 32px;display:flex;align-items:center;justify-content:space-between;height:52px;position:sticky;top:0;z-index:200}
  .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:18px;letter-spacing:-.5px;display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--text)}
  .logo span{color:var(--accent)}
  .logo-dot{width:6px;height:6px;background:var(--accent);border-radius:50%;animation:pulse 2s infinite}

  /* NAV */
  .nav{display:flex;align-items:center;gap:4px}
  .nav-item{position:relative}
  .nav-link{color:var(--text2);text-decoration:none;padding:6px 12px;border-radius:6px;font-size:13px;font-weight:500;transition:all .15s;cursor:pointer;display:flex;align-items:center;gap:4px;user-select:none}
  .nav-link:hover,.nav-link.active{color:var(--text);background:var(--surface2)}
  .arrow{font-size:10px;transition:transform .2s}
  .nav-item:hover .arrow{transform:rotate(180deg)}

  /* DROPDOWN */
  .dropdown-menu{position:absolute;top:calc(100% + 8px);left:0;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px;min-width:180px;opacity:0;pointer-events:none;transform:translateY(-4px);transition:all .15s;z-index:300;box-shadow:0 8px 32px rgba(0,0,0,.4)}
  .nav-item:hover .dropdown-menu{opacity:1;pointer-events:all;transform:translateY(0)}
  .dropdown-section{padding:4px 0}
  .dropdown-label{font-size:10px;font-weight:700;color:var(--text3);letter-spacing:1.2px;text-transform:uppercase;padding:4px 10px 6px;font-family:'IBM Plex Mono',monospace}
  .dropdown-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;cursor:pointer;text-decoration:none;transition:background .15s}
  .dropdown-item:hover{background:var(--surface2)}
  .di-ticker{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;color:var(--accent);background:rgba(0,212,168,.1);padding:1px 6px;border-radius:3px;min-width:44px;text-align:center}
  .di-name{font-size:13px;color:var(--text2)}
  .dropdown-item:hover .di-name{color:var(--text)}
  .dropdown-divider{height:1px;background:var(--border);margin:4px 0}

  /* SEARCH */
  .topbar-right{display:flex;align-items:center;gap:12px}
  .search-wrap{position:relative}
  .search-input{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 12px 6px 34px;color:var(--text);font-size:13px;width:220px;outline:none;transition:all .2s;font-family:'Inter',sans-serif}
  .search-input:focus{border-color:var(--accent);width:280px}
  .search-input::placeholder{color:var(--text3)}
  .search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text3);pointer-events:none}
  .search-results{position:absolute;top:calc(100% + 6px);left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;display:none;z-index:300;box-shadow:0 8px 24px rgba(0,0,0,.4)}
  .search-result-item{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;text-decoration:none;transition:background .15s}
  .search-result-item:hover{background:var(--surface2)}
  .sri-ticker{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;color:var(--accent);background:rgba(0,212,168,.1);padding:1px 6px;border-radius:3px;min-width:48px;text-align:center}
  .sri-info{display:flex;flex-direction:column;gap:1px}
  .sri-name{font-size:13px;color:var(--text)}
  .sri-sector{font-size:10px;color:var(--text3)}

  .badge-premium{background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;font-family:'IBM Plex Mono',monospace}
  .btn{padding:7px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;border:none;transition:all .15s}
  .btn-primary{background:var(--accent);color:#000;font-weight:600}
  .btn-ghost{background:transparent;color:var(--text2);border:1px solid var(--border)}`;

  // Şirket dizini — arama için
  const COMPANIES = [
    { ticker: 'TUPRS', name: 'Tüpraş',  sector: 'Rafineri & Petrol',  url: '/tuprs.html' },
    { ticker: 'PETKM', name: 'Petkim',  sector: 'Petrokimya',          url: '/petkm.html' },
  ];

  // CSS enjekte et
  const style = document.createElement('style');
  style.textContent = NAV_CSS;
  document.head.appendChild(style);

  // HTML enjekte et
  const wrapper = document.createElement('div');
  wrapper.innerHTML = NAV_HTML;
  document.body.insertBefore(wrapper.firstElementChild, document.body.firstChild);

  // Arama fonksiyonu
  const searchInput = document.getElementById('globalSearch');
  const searchResults = document.getElementById('searchResults');

  searchInput.addEventListener('input', function() {
    const q = this.value.trim().toLowerCase();
    if (!q) { searchResults.style.display = 'none'; return; }
    const matches = COMPANIES.filter(c =>
      c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
    if (matches.length === 0) { searchResults.style.display = 'none'; return; }
    searchResults.innerHTML = matches.map(c => `
      <a class="search-result-item" href="${c.url}">
        <span class="sri-ticker">${c.ticker}</span>
        <div class="sri-info">
          <span class="sri-name">${c.name}</span>
          <span class="sri-sector">${c.sector}</span>
        </div>
      </a>
    `).join('');
    searchResults.style.display = 'block';
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-wrap')) searchResults.style.display = 'none';
  });

  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const first = COMPANIES.find(c =>
        c.ticker.toLowerCase().includes(this.value.toLowerCase()) ||
        c.name.toLowerCase().includes(this.value.toLowerCase())
      );
      if (first) window.location.href = first.url;
    }
  });
})();
