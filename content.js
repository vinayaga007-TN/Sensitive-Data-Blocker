/**
 * DataShield Pro — content.js
 *
 * Architecture:
 * - Settings loaded into a sync in-memory cache (SYNC) so event handlers
 *   can check enabled state without any await.
 * - runDetection() is fully synchronous.
 * - preventDefault only called when actually blocking.
 * - Send button: remove listener → real click → re-add listener.
 */
(function () {
  'use strict';

  var SITE_SELECTORS = {
    'chatgpt.com':           ['#prompt-textarea','textarea',"[contenteditable='true']"],
    'chat.openai.com':       ['#prompt-textarea','textarea',"[contenteditable='true']"],
    'gemini.google.com':     ['rich-textarea','.ql-editor','textarea','[contenteditable]'],
    'deepseek.com':          ['textarea','#chat-input',"[contenteditable='true']"],
    'platform.deepseek.com': ['textarea',"[contenteditable='true']"],
    'chat.deepseek.com':     ['textarea',"[contenteditable='true']"],
    'www.google.com':        ["input[name='q']","textarea[name='q']","[aria-label='Search']"],
    'google.com':            ["input[name='q']","textarea[name='q']","[aria-label='Search']"]
  };

  // ── Synchronous settings cache ─────────────────────────────────────────────
  var SYNC = { enabled: true, siteEnabled: true, cats: {}, patterns: [], loaded: false };

  function refreshCache() {
    if (!window.__DSP_Storage) return;
    window.__DSP_Storage.getSettings().then(function(s) {
      var h = location.hostname;
      var siteOn = true;
      var wl = s.whitelistedDomains || [];
      for (var i=0; i<wl.length; i++) {
        if (h === wl[i] || h.endsWith('.'+wl[i])) { siteOn = false; break; }
      }
      if (siteOn && s.perSite) {
        var ps = s.perSite;
        for (var site in ps) {
          if (h === site || h.endsWith('.'+site)) { siteOn = ps[site] !== false; break; }
        }
      }
      SYNC.enabled     = s.enabled !== false;
      SYNC.siteEnabled = siteOn;
      SYNC.cats        = s.categories || {};
      SYNC.patterns    = s.customPatterns || [];
      SYNC.loaded      = true;
    }).catch(function(){});
  }

  // Refresh cache whenever storage changes (popup toggle, options change)
  try {
    chrome.storage.onChanged.addListener(function() { refreshCache(); });
  } catch(e) {}

  function isActive() {
    return SYNC.loaded && SYNC.enabled && SYNC.siteEnabled;
  }

  // ── Detection (fully synchronous) ─────────────────────────────────────────
  function detect(text) {
    if (!text || text.trim().length < 3) return [];
    if (!window.__DSP_detectSensitiveData) return [];
    try {
      return window.__DSP_detectSensitiveData(text, SYNC.cats, SYNC.patterns);
    } catch(e) { return []; }
  }

  function getElementText(el) {
    if (typeof el.value === 'string') return el.value;
    return (el.textContent || el.innerText || '').trim();
  }

  function debounce(fn, ms) {
    var t; return function() { var a=arguments,ctx=this; clearTimeout(t); t=setTimeout(function(){fn.apply(ctx,a);},ms); };
  }

  function getSelectors() {
    var h = location.hostname;
    for (var p in SITE_SELECTORS) {
      if (h === p || h.endsWith('.'+p)) return SITE_SELECTORS[p];
    }
    return ['textarea',"input[type='text']","[contenteditable='true']"];
  }

  // ── Block handler ──────────────────────────────────────────────────────────
  function handleBlock(threats, el, onAllow) {
    // Count the block
    try { window.__DSP_Storage.incrementBlockCount(); } catch(e) {}
    // Notify background for badge update
    try { chrome.runtime.sendMessage({ action: 'blocked', ruleIds: threats.map(function(t){return t.ruleId;}) }); } catch(e) {}
    // Show banner
    if (window.__DSP_Banner && window.__DSP_Banner.showBanner) {
      window.__DSP_Banner.showBanner(threats, el, onAllow, function() {
        try { el.focus(); } catch(e) {}
      });
    }
  }

  // ── Attached tracking ──────────────────────────────────────────────────────
  var attached = new WeakSet();

  // ── Keydown (Enter) ────────────────────────────────────────────────────────
  function makeKeydown(el) {
    function handler(e) {
      if (e.key !== 'Enter' || e.shiftKey) return;
      if (!isActive()) return;  // guard is off — let it through

      var text = getElementText(el);
      var threats = detect(text);
      if (threats.length === 0) return;  // safe — let it through

      // Block it
      e.preventDefault();
      e.stopImmediatePropagation();

      handleBlock(threats, el, function() {
        // Allow Once: remove handler, dispatch Enter, re-add
        el.removeEventListener('keydown', handler, true);
        try {
          el.dispatchEvent(new KeyboardEvent('keydown',{
            key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true
          }));
        } catch(ex) {}
        setTimeout(function() { el.addEventListener('keydown', handler, true); }, 300);
      });
    }
    return handler;
  }

  // ── Paste ──────────────────────────────────────────────────────────────────
  function makePaste(el) {
    return function(e) {
      if (!isActive()) return;
      var pasted = e.clipboardData ? e.clipboardData.getData('text') : '';
      if (!pasted) return;
      var threats = detect(pasted);
      if (threats.length === 0) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      handleBlock(threats, el, function() {
        insertText(el, pasted);
      });
    };
  }

  function insertText(el, text) {
    try {
      if (typeof el.value === 'string') {
        var s = el.selectionStart||0, e2 = el.selectionEnd||0;
        el.value = el.value.slice(0,s) + text + el.value.slice(e2);
        el.selectionStart = el.selectionEnd = s + text.length;
        el.dispatchEvent(new Event('input',{bubbles:true}));
      } else {
        var sel = window.getSelection();
        if (sel && sel.rangeCount) {
          var r = sel.getRangeAt(0); r.deleteContents();
          r.insertNode(document.createTextNode(text)); r.collapse(false);
          el.dispatchEvent(new Event('input',{bubbles:true}));
        }
      }
    } catch(ex) {}
  }

  // ── Attach to input ────────────────────────────────────────────────────────
  function attach(el) {
    if (attached.has(el)) return;
    attached.add(el);
    el.addEventListener('keydown', makeKeydown(el), true);
    el.addEventListener('paste',   makePaste(el),   true);

    var form = el.closest ? el.closest('form') : null;
    if (form && !form.__dsp) {
      form.__dsp = true;
      form.addEventListener('submit', function onSub(e) {
        if (!isActive()) return;
        var threats = detect(getElementText(el));
        if (threats.length === 0) return;
        e.preventDefault(); e.stopImmediatePropagation();
        handleBlock(threats, el, function() {
          form.removeEventListener('submit', onSub, true);
          form.submit();
          setTimeout(function(){ form.addEventListener('submit', onSub, true); }, 300);
        });
      }, true);
    }
  }

  // ── Send buttons ───────────────────────────────────────────────────────────
  var SEND_SELS = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send" i]',
    'button[aria-label*="Submit" i]',
    'button[aria-label*="Search" i]',
    'button[type="submit"]',
    '[role="button"][aria-label*="send" i]',
    '[role="button"][aria-label*="search" i]'
  ];

  function findInput(btn) {
    var node = btn;
    for (var i=0; i<15; i++) {
      if (!node||!node.parentElement) break;
      node = node.parentElement;
      var found = node.querySelector('#prompt-textarea') ||
                  node.querySelector('textarea') ||
                  node.querySelector('[contenteditable="true"]') ||
                  node.querySelector("input[type='text']");
      if (found) return found;
    }
    var sels = getSelectors();
    for (var j=0; j<sels.length; j++) {
      try { var f=document.querySelector(sels[j]); if(f) return f; } catch(ex){}
    }
    return null;
  }

  function attachBtn(btn) {
    if (btn.__dspBtn) return;
    btn.__dspBtn = true;

    function onBtnClick(e) {
      if (!isActive()) return;
      var inputEl = findInput(btn);
      if (!inputEl) return;
      var threats = detect(getElementText(inputEl));
      if (threats.length === 0) return;

      e.preventDefault(); e.stopImmediatePropagation();
      handleBlock(threats, inputEl, function() {
        btn.removeEventListener('click', onBtnClick, true);
        btn.click();
        setTimeout(function(){ btn.addEventListener('click', onBtnClick, true); }, 200);
      });
    }
    btn.addEventListener('click', onBtnClick, true);
  }

  // ── Scan DOM ───────────────────────────────────────────────────────────────
  function scan() {
    var sels = getSelectors();
    for (var i=0; i<sels.length; i++) {
      try {
        var els = document.querySelectorAll(sels[i]);
        for (var j=0; j<els.length; j++) attach(els[j]);
      } catch(ex){}
    }
    for (var k=0; k<SEND_SELS.length; k++) {
      try {
        var btns = document.querySelectorAll(SEND_SELS[k]);
        for (var m=0; m<btns.length; m++) attachBtn(btns[m]);
      } catch(ex){}
    }
  }

  var dScan = debounce(scan, 300);
  var obs = null;

  function startObs() {
    if (obs) return;
    obs = new MutationObserver(dScan);
    obs.observe(document.body || document.documentElement, { childList:true, subtree:true });
  }

  // SPA nav
  ['pushState','replaceState'].forEach(function(m) {
    try {
      var orig = history[m];
      history[m] = function() { orig.apply(this, arguments); setTimeout(scan, 700); };
    } catch(ex) {}
  });
  window.addEventListener('popstate', function(){ setTimeout(scan, 400); });

  // ── Boot ───────────────────────────────────────────────────────────────────
  function boot() {
    if (!window.__DSP_Storage) return;
    window.__DSP_Storage.initializeDefaults().then(function() {
      refreshCache();
      setInterval(refreshCache, 2000);  // Keep cache fresh

      function run() { scan(); startObs(); }
      if (document.body) {
        run();
      } else {
        document.addEventListener('DOMContentLoaded', run);
        setTimeout(run, 800);
      }
      setTimeout(scan, 1500);
      setTimeout(scan, 4000);
    }).catch(function(){});
  }

  window.addEventListener('unload', function() {
    try { if(obs) obs.disconnect(); } catch(ex){} 
  });

  boot();
})();
