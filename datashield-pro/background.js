/**
 * DataShield Pro — background.js v1.1
 * Handles badge state including site security level.
 */
'use strict';

function sget(keys, cb) {
  try { chrome.storage.local.get(keys, cb); } catch(e) { cb({}); }
}
function sset(items, cb) {
  try { chrome.storage.local.set(items, function(){ if(cb) cb(); }); } catch(e){ if(cb) cb(); }
}

var DEFAULTS = {
  enabled: true,
  categories: { financial:true, identity:true, credentials:true, contact:true, personal:true },
  perSite: {
    'chat.openai.com':true,'chatgpt.com':true,'gemini.google.com':true,
    'deepseek.com':true,'platform.deepseek.com':true,'chat.deepseek.com':true,
    'www.google.com':true,'google.com':true
  },
  customPatterns:[], whitelistedDomains:[],
  blockedToday:0, blockedTotal:0, lastDate:'',
  siteCheckerEnabled: true
};

function getEnabled(cb) {
  sget('dsp', function(r) {
    var s = (r && r.dsp) ? r.dsp : DEFAULTS;
    cb(s.enabled !== false);
  });
}

// Site-level badge colors: green=safe, yellow=caution, red=danger, gray=off
var currentSiteLevel = 'safe';

function updateBadge() {
  getEnabled(function(on) {
    try {
      if (!on) {
        chrome.action.setBadgeBackgroundColor({ color:'#555555' });
        chrome.action.setBadgeText({ text:'OFF' });
        return;
      }
      var colors = { safe:'#00C853', caution:'#FFB300', danger:'#FF3B30' };
      var texts  = { safe:'',        caution:'⚠',       danger:'🚨' };
      chrome.action.setBadgeBackgroundColor({ color: colors[currentSiteLevel] || '#00C853' });
      chrome.action.setBadgeText({ text: texts[currentSiteLevel] || '' });
    } catch(e){}
  });
}

chrome.runtime.onInstalled.addListener(function() {
  sget('dsp', function(r) {
    if (!r || !r.dsp) sset({ dsp: DEFAULTS });
    updateBadge();
  });
});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (!msg) return false;
  switch(msg.action) {
    case 'siteAnalysis':
      // Update badge color based on current page security level
      currentSiteLevel = msg.level || 'safe';
      updateBadge();
      sendResponse({ ok:true });
      return false;
    case 'blocked':
    case 'settingsChanged':
      updateBadge();
      sendResponse({ ok:true });
      return false;
  }
  return false;
});

// Reset site level when user navigates to a new tab
chrome.tabs.onActivated.addListener(function() {
  currentSiteLevel = 'safe';
  updateBadge();
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
  if (changeInfo.status === 'loading') {
    currentSiteLevel = 'safe';
    updateBadge();
  }
});

chrome.storage.onChanged.addListener(updateBadge);
