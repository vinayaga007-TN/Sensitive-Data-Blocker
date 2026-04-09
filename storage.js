/**
 * DataShield Pro — storage.js
 * ONE key: "dsp" stores everything. Simple and reliable.
 */
(function () {
  'use strict';

  var DEFAULTS = {
    enabled: true,
    categories: {
      financial: true, identity: true,
      credentials: true, contact: true, personal: true
    },
    perSite: {
      'chat.openai.com': true, 'chatgpt.com': true,
      'gemini.google.com': true, 'deepseek.com': true,
      'platform.deepseek.com': true, 'chat.deepseek.com': true,
      'www.google.com': true, 'google.com': true
    },
    customPatterns: [],
    whitelistedDomains: [],
    blockedToday: 0,
    blockedTotal: 0,
    lastDate: ''
  };

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function load(cb) {
    try {
      chrome.storage.local.get('dsp', function(r) {
        var data = (r && r.dsp) ? r.dsp : {};
        // Merge with defaults
        var out = {};
        for (var k in DEFAULTS) out[k] = DEFAULTS[k];
        for (var k in data) out[k] = data[k];
        // Deep merge categories and perSite
        out.categories = {};
        for (var k in DEFAULTS.categories) out.categories[k] = DEFAULTS.categories[k];
        if (data.categories) for (var k in data.categories) out.categories[k] = data.categories[k];
        out.perSite = {};
        for (var k in DEFAULTS.perSite) out.perSite[k] = DEFAULTS.perSite[k];
        if (data.perSite) for (var k in data.perSite) out.perSite[k] = data.perSite[k];
        cb(out);
      });
    } catch(e) { cb(DEFAULTS); }
  }

  function save(data, cb) {
    try {
      chrome.storage.local.set({ dsp: data }, function() {
        if (cb) cb();
      });
    } catch(e) { if (cb) cb(); }
  }

  // Promise wrappers
  function getSettings() {
    return new Promise(function(resolve) { load(resolve); });
  }

  function saveSettings(s) {
    return new Promise(function(resolve) { save(s, resolve); });
  }

  function getStats() {
    return new Promise(function(resolve) {
      load(function(s) {
        resolve({
          blockedToday: s.blockedToday || 0,
          blockedTotal: s.blockedTotal || 0,
          lastDate: s.lastDate || ''
        });
      });
    });
  }

  function incrementBlockCount() {
    return new Promise(function(resolve) {
      load(function(s) {
        var t = todayStr();
        if (s.lastDate !== t) {
          s.blockedToday = 0;
          s.lastDate = t;
        }
        s.blockedToday = (s.blockedToday || 0) + 1;
        s.blockedTotal = (s.blockedTotal || 0) + 1;
        save(s, resolve);
      });
    });
  }

  function resetStats() {
    return new Promise(function(resolve) {
      load(function(s) {
        s.blockedToday = 0;
        s.blockedTotal = 0;
        s.lastDate = todayStr();
        save(s, resolve);
      });
    });
  }

  function toggleExtension(bool) {
    return new Promise(function(resolve) {
      load(function(s) {
        s.enabled = bool;
        save(s, resolve);
      });
    });
  }

  function initializeDefaults() {
    return new Promise(function(resolve) {
      try {
        chrome.storage.local.get('dsp', function(r) {
          if (!r || !r.dsp) {
            save(DEFAULTS, resolve);
          } else {
            resolve();
          }
        });
      } catch(e) { resolve(); }
    });
  }

  function getCustomPatterns() {
    return new Promise(function(resolve) {
      load(function(s) { resolve(s.customPatterns || []); });
    });
  }

  function saveCustomPatterns(patterns) {
    return new Promise(function(resolve) {
      load(function(s) { s.customPatterns = patterns; save(s, resolve); });
    });
  }

  function getWhitelistedDomains() {
    return new Promise(function(resolve) {
      load(function(s) { resolve(s.whitelistedDomains || []); });
    });
  }

  function saveWhitelistedDomains(domains) {
    return new Promise(function(resolve) {
      load(function(s) { s.whitelistedDomains = domains; save(s, resolve); });
    });
  }

  window.__DSP_Storage = {
    DEFAULTS: DEFAULTS,
    DEFAULT_SETTINGS: DEFAULTS,
    getSettings: getSettings,
    saveSettings: saveSettings,
    getStats: getStats,
    incrementBlockCount: incrementBlockCount,
    resetStats: resetStats,
    toggleExtension: toggleExtension,
    initializeDefaults: initializeDefaults,
    getCustomPatterns: getCustomPatterns,
    saveCustomPatterns: saveCustomPatterns,
    getWhitelistedDomains: getWhitelistedDomains,
    saveWhitelistedDomains: saveWhitelistedDomains
  };

})();
