/**
 * DataShield Pro — popup.js
 * All toggle states controlled purely by JavaScript, no CSS tricks.
 */
(function() {
  'use strict';

  var S = window.__DSP_Storage;
  if (!S) { console.error('[DSP] Storage not loaded'); return; }

  var SITES = [
    { name: 'ChatGPT',        domain: 'chat.openai.com' },
    { name: 'ChatGPT',        domain: 'chatgpt.com' },
    { name: 'Google Gemini',  domain: 'gemini.google.com' },
    { name: 'DeepSeek',       domain: 'deepseek.com' },
    { name: 'Google Search',  domain: 'www.google.com' }
  ];

  var CATS = [
    { id: 'financial',    label: 'Financial',    icon: '💳' },
    { id: 'identity',     label: 'Identity',     icon: '🪪' },
    { id: 'credentials',  label: 'Credentials',  icon: '🔑' },
    { id: 'contact',      label: 'Contact',      icon: '📞' },
    { id: 'personal',     label: 'Personal',     icon: '👤' }
  ];

  // ── Toggle helper: set visual state ───────────────────────────────────────

  function setToggle(trackEl, thumbEl, isOn) {
    if (isOn) {
      trackEl.classList.add('on');
      thumbEl.classList.add('on');
    } else {
      trackEl.classList.remove('on');
      thumbEl.classList.remove('on');
    }
  }

  // ── Master toggle ─────────────────────────────────────────────────────────

  var masterToggleEl = document.getElementById('masterToggle');
  var masterTrack    = document.getElementById('masterTrack');
  var masterThumb    = document.getElementById('masterThumb');
  var statusLabel    = document.getElementById('statusLabel');
  var masterIsOn     = true;

  function setMaster(isOn) {
    masterIsOn = isOn;
    setToggle(masterTrack, masterThumb, isOn);
    statusLabel.textContent = isOn ? 'Protection Active' : 'Disabled';
    statusLabel.className = 'status' + (isOn ? ' on' : '');
  }

  masterToggleEl.addEventListener('click', function() {
    var newVal = !masterIsOn;
    setMaster(newVal);
    S.toggleExtension(newVal).then(function() {
      try { chrome.runtime.sendMessage({ action: 'settingsChanged' }); } catch(e){}
    });
  });

  masterToggleEl.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); masterToggleEl.click(); }
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  function updateStats() {
    S.getStats().then(function(stats) {
      document.getElementById('statToday').textContent = stats.blockedToday || 0;
      document.getElementById('statTotal').textContent = stats.blockedTotal || 0;
    }).catch(function() {
      document.getElementById('statToday').textContent = 0;
      document.getElementById('statTotal').textContent = 0;
    });
  }

  // ── Sites list ────────────────────────────────────────────────────────────

  function buildSites(settings) {
    var list = document.getElementById('sitesList');
    list.innerHTML = '';

    SITES.forEach(function(site) {
      var row = document.createElement('div');
      row.className = 'site-row';

      var info = document.createElement('div');
      info.className = 'site-info';
      var nm = document.createElement('div');
      nm.className = 'site-name';
      nm.textContent = site.name;
      var dm = document.createElement('div');
      dm.className = 'site-dom';
      dm.textContent = site.domain;
      info.appendChild(nm);
      info.appendChild(dm);

      // Site toggle
      var tog = document.createElement('div');
      tog.className = 'toggle stoggle';
      tog.setAttribute('role', 'switch');
      tog.setAttribute('tabindex', '0');
      var track = document.createElement('div'); track.className = 'toggle-track';
      var thumb = document.createElement('div'); thumb.className = 'toggle-thumb';
      tog.appendChild(track); tog.appendChild(thumb);

      var isOn = settings.perSite[site.domain] !== false;
      setToggle(track, thumb, isOn);

      tog.addEventListener('click', function() {
        var newVal = !track.classList.contains('on');
        setToggle(track, thumb, newVal);
        S.getSettings().then(function(s) {
          s.perSite[site.domain] = newVal;
          return S.saveSettings(s);
        }).catch(function(){});
      });

      tog.addEventListener('keydown', function(e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tog.click(); }
      });

      row.appendChild(info);
      row.appendChild(tog);
      list.appendChild(row);
    });
  }

  // ── Category pills ────────────────────────────────────────────────────────

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
        var newVal = !nowOn;
        if (newVal) pill.classList.add('on'); else pill.classList.remove('on');
        S.getSettings().then(function(s) {
          s.categories[cat.id] = newVal;
          return S.saveSettings(s);
        }).catch(function(){});
      });

      grid.appendChild(pill);
    });
  }

  // ── Options button ────────────────────────────────────────────────────────

  document.getElementById('optBtn').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });

  // ── Version ────────────────────────────────────────────────────────────────

  try {
    var mf = chrome.runtime.getManifest();
    document.getElementById('ver').textContent = 'v' + mf.version;
  } catch(e) {}

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    S.getSettings().then(function(settings) {
      setMaster(settings.enabled !== false);
      buildSites(settings);
      buildCats(settings);
    }).catch(function(e) {
      console.error('[DSP popup] getSettings failed:', e);
    });
    updateStats();
  }

  init();

  // Refresh stats every 2s
  setInterval(updateStats, 2000);

  // Refresh full UI when storage changes (e.g. content script increments count)
  chrome.storage.onChanged.addListener(function() {
    updateStats();
  });

})();
