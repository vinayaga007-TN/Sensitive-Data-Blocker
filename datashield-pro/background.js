/**
 * DataShield Pro — background.js (MV3 service worker)
 */
'use strict';

function sget(keys, cb) {
  try { chrome.storage.local.get(keys, cb); } catch(e) { cb({}); }
}

function sset(items, cb) {
  try { chrome.storage.local.set(items, function() { if(cb) cb(); }); } catch(e) { if(cb) cb(); }
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
  blockedToday:0, blockedTotal:0, lastDate:''
};

function getEnabled(cb) {
  sget('dsp', function(r) {
    var s = (r && r.dsp) ? r.dsp : DEFAULTS;
    cb(s.enabled !== false);
  });
}

function updateBadge() {
  getEnabled(function(on) {
    try {
      chrome.action.setBadgeBackgroundColor({ color: on ? '#00C853' : '#666666' });
      chrome.action.setBadgeText({ text: on ? '' : 'OFF' });
    } catch(e) {}
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
  if (msg.action === 'blocked' || msg.action === 'settingsChanged') {
    updateBadge();
    sendResponse({ ok: true });
    return false;
  }
  return false;
});

chrome.storage.onChanged.addListener(updateBadge);
chrome.tabs.onActivated.addListener(updateBadge);
