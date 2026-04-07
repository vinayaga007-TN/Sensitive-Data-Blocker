/**
 * DataShield Pro — popup.js v1.1
 */
(function() {
  'use strict';

  var S = window.__DSP_Storage;
  var Checker = window.__DSP_SiteChecker;
  if (!S) { return; }

  var SITES = [
    { name:'ChatGPT',       domain:'chat.openai.com' },
    { name:'ChatGPT',       domain:'chatgpt.com' },
    { name:'Google Gemini', domain:'gemini.google.com' },
    { name:'DeepSeek',      domain:'deepseek.com' },
    { name:'Google Search', domain:'www.google.com' }
  ];

  var CATS = [
    { id:'financial',   label:'Financial',   icon:'💳' },
    { id:'identity',    label:'Identity',    icon:'🪪' },
    { id:'credentials', label:'Credentials', icon:'🔑' },
    { id:'contact',     label:'Contact',     icon:'📞' },
    { id:'personal',    label:'Personal',    icon:'👤' }
  ];

  // ── Toggle helpers ─────────────────────────────────────────────────────────
  function setToggle(track, thumb, isOn) {
    if (isOn) { track.classList.add('on'); thumb.classList.add('on'); }
    else       { track.classList.remove('on'); thumb.classList.remove('on'); }
  }

  // ── Master toggle ──────────────────────────────────────────────────────────
  var masterEl    = document.getElementById('masterToggle');
  var masterTrack = document.getElementById('masterTrack');
  var masterThumb = document.getElementById('masterThumb');
  var statusLbl   = document.getElementById('statusLabel');
  var masterIsOn  = true;

  function setMaster(isOn) {
    masterIsOn = isOn;
    setToggle(masterTrack, masterThumb, isOn);
    statusLbl.textContent = isOn ? 'Protection Active' : 'Disabled';
    statusLbl.className = 'status' + (isOn ? ' on' : '');
  }

  masterEl.addEventListener('click', function() {
    var v = !masterIsOn;
    setMaster(v);
    S.toggleExtension(v).then(function() {
      try { chrome.runtime.sendMessage({ action:'settingsChanged' }); } catch(e){}
    });
  });
  masterEl.addEventListener('keydown', function(e) {
    if (e.key===' '||e.key==='Enter'){ e.preventDefault(); masterEl.click(); }
  });

  // ── Site Security Card ─────────────────────────────────────────────────────
  function renderSecurityCard(tab) {
    var card      = document.getElementById('secCard');
    var icon      = document.getElementById('secIcon');
    var title     = document.getElementById('secTitle');
    var domain    = document.getElementById('secDomain');
    var score     = document.getElementById('secScore');
    var reasons   = document.getElementById('secReasons');
    var brandWarn = document.getElementById('secBrandWarn');
    var attackTag = document.getElementById('secAttackTag');

    title.classList.remove('loading');

    if (!tab || !tab.url || tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      card.className = 'security-card unknown';
      icon.textContent = '🛡️';
      title.textContent = 'Extension page or new tab';
      title.className = 'sec-title unknown';
      domain.textContent = '—';
      score.textContent = '—'; score.className = 'sec-score unknown';
      return;
    }

    if (!Checker) {
      title.textContent = 'Checker unavailable';
      return;
    }

    var result = Checker.analyzeUrl(tab.url);
    var levelIcons  = { safe:'🔒', caution:'⚠️', danger:'🚨' };
    var levelTitles = {
      safe:   'Site Appears Safe',
      caution:'Proceed With Caution',
      danger: 'Dangerous Site Detected!'
    };
    var scoreLabels = { safe:'LOW RISK', caution:'MEDIUM RISK', danger:'HIGH RISK' };

    card.className = 'security-card ' + result.level;
    icon.textContent = levelIcons[result.level] || '🛡️';
    title.textContent = levelTitles[result.level];
    title.className = 'sec-title ' + result.level;
    domain.textContent = result.hostname || new URL(tab.url).hostname;
    score.textContent = scoreLabels[result.level];
    score.className = 'sec-score ' + result.level;

    // Spoofed brand warning
    if (result.spoofedBrand) {
      brandWarn.style.display = 'block';
      brandWarn.className = 'sec-brand-warn';
      brandWarn.textContent = '🎭 Possibly impersonating: ' + result.spoofedBrand;
    } else {
      brandWarn.style.display = 'none';
    }

    // Attack type tag
    if (result.attackType && result.level !== 'safe') {
      attackTag.style.display = 'block';
      var tagInner = document.createElement('span');
      tagInner.className = 'attack-tag ' + result.attackType;
      var typeLabels = {
        phishing:   '🎣 Phishing',
        spoofing:   '🪞 Website Spoofing',
        suspicious: '⚠️ Suspicious'
      };
      tagInner.textContent = typeLabels[result.attackType] || result.attackType;
      attackTag.innerHTML = '';
      attackTag.appendChild(tagInner);
    } else {
      attackTag.style.display = 'none';
    }

    // Reasons list
    reasons.innerHTML = '';
    var shown = result.reasons.slice(0, 4);
    shown.forEach(function(r) {
      var s = document.createElement('span');
      s.className = 'sec-reason';
      s.textContent = r;
      reasons.appendChild(s);
    });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  function updateStats() {
    S.getStats().then(function(stats) {
      document.getElementById('statToday').textContent = stats.blockedToday || 0;
      document.getElementById('statTotal').textContent = stats.blockedTotal || 0;
    }).catch(function(){
      document.getElementById('statToday').textContent = 0;
      document.getElementById('statTotal').textContent = 0;
    });
  }

  // ── Sites ──────────────────────────────────────────────────────────────────
  function buildSites(settings) {
    var list = document.getElementById('sitesList');
    list.innerHTML = '';
    SITES.forEach(function(site) {
      var row = document.createElement('div');
      row.className = 'site-row';
      var info = document.createElement('div');
      info.className = 'site-info';
      var nm = document.createElement('div'); nm.className = 'site-name'; nm.textContent = site.name;
      var dm = document.createElement('div'); dm.className = 'site-dom';  dm.textContent = site.domain;
      info.appendChild(nm); info.appendChild(dm);

      var tog = document.createElement('div');
      tog.className = 'toggle stoggle';
      tog.setAttribute('role','switch'); tog.setAttribute('tabindex','0');
      var track = document.createElement('div'); track.className = 'toggle-track';
      var thumb = document.createElement('div'); thumb.className = 'toggle-thumb';
      tog.appendChild(track); tog.appendChild(thumb);
      setToggle(track, thumb, settings.perSite[site.domain] !== false);

      tog.addEventListener('click', function() {
        var newVal = !track.classList.contains('on');
        setToggle(track, thumb, newVal);
        S.getSettings().then(function(s) {
          s.perSite[site.domain] = newVal;
          return S.saveSettings(s);
        }).catch(function(){});
      });
      tog.addEventListener('keydown', function(e) {
        if (e.key===' '||e.key==='Enter'){ e.preventDefault(); tog.click(); }
      });

      row.appendChild(info); row.appendChild(tog);
      list.appendChild(row);
    });
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  function buildCats(settings) {
    var grid = document.getElementById('catGrid');
    grid.innerHTML = '';
    CATS.forEach(function(cat) {
      var pill = document.createElement('button');
      var isOn = settings.categories[cat.id] !== false;
      pill.className = 'cat' + (isOn ? ' on' : '');
      pill.textContent = cat.icon + ' ' + cat.label;
      pill.addEventListener('click', function() {
        var nowOn = pill.classList.contains('on');
        if (nowOn) pill.classList.remove('on'); else pill.classList.add('on');
        S.getSettings().then(function(s) {
          s.categories[cat.id] = !nowOn;
          return S.saveSettings(s);
        }).catch(function(){});
      });
      grid.appendChild(pill);
    });
  }

  // ── Options + version ──────────────────────────────────────────────────────
  document.getElementById('optBtn').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  try {
    var mf = chrome.runtime.getManifest();
    document.getElementById('ver').textContent = 'v' + mf.version;
  } catch(e){}

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    // Load settings
    S.getSettings().then(function(settings) {
      setMaster(settings.enabled !== false);
      buildSites(settings);
      buildCats(settings);
    }).catch(function(e) { console.error('[DSP popup]', e); });

    updateStats();

    // Analyze current tab
    try {
      chrome.tabs.query({ active:true, currentWindow:true }, function(tabs) {
        if (tabs && tabs[0]) renderSecurityCard(tabs[0]);
        else renderSecurityCard(null);
      });
    } catch(e) { renderSecurityCard(null); }
  }

  init();

  // Refresh stats every 2s
  setInterval(updateStats, 2000);

  // Re-render security card if tab changes
  try {
    chrome.storage.onChanged.addListener(function() { updateStats(); });
  } catch(e){}

})();
