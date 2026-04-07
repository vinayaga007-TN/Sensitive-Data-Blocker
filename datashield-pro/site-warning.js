/**
 * DataShield Pro — site-warning.js v1.2
 *
 * Shows floating security badge + warning overlays.
 *
 * Fixes vs v1.1:
 *  - NEVER navigates to about:blank
 *  - "Back to Safety" uses window.history.back() only
 *  - "Proceed anyway" dismisses overlay without navigation
 *  - Badge click shows detail panel, not full overlay
 */
(function () {
  'use strict';

  if (window !== window.top) return; // Don't run in iframes

  var result    = null;
  var badgeEl   = null;
  var overlayEl = null;

  // ── CSS ─────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('__dsp_sc_styles')) return;
    var style = document.createElement('style');
    style.id = '__dsp_sc_styles';
    style.textContent = '\
      #__dsp_badge {\
        position:fixed!important;bottom:18px!important;right:18px!important;\
        z-index:2147483646!important;display:flex!important;align-items:center!important;\
        gap:7px!important;padding:8px 14px!important;border-radius:24px!important;\
        font-family:system-ui,-apple-system,sans-serif!important;\
        font-size:12px!important;font-weight:700!important;cursor:pointer!important;\
        box-shadow:0 4px 20px rgba(0,0,0,.35)!important;\
        transition:transform .15s!important;user-select:none!important;\
        animation:__dsp_pop .35s cubic-bezier(.34,1.56,.64,1) both!important;\
      }\
      #__dsp_badge:hover{transform:scale(1.06)!important;}\
      #__dsp_badge.safe   {background:#0D2B1A!important;border:1.5px solid #00C853!important;color:#00C853!important;}\
      #__dsp_badge.caution{background:#2B2000!important;border:1.5px solid #FFB300!important;color:#FFB300!important;}\
      #__dsp_badge.danger {background:#2B0000!important;border:1.5px solid #FF3B30!important;color:#FF3B30!important;\
        animation:__dsp_pop .35s cubic-bezier(.34,1.56,.64,1) both,__dsp_pulse 2s ease 1s infinite!important;}\
      #__dsp_badge .badge-dot{width:8px!important;height:8px!important;border-radius:50%!important;flex-shrink:0!important;}\
      #__dsp_badge.safe    .badge-dot{background:#00C853!important;}\
      #__dsp_badge.caution .badge-dot{background:#FFB300!important;}\
      #__dsp_badge.danger  .badge-dot{background:#FF3B30!important;}\
      @keyframes __dsp_pop{from{opacity:0;transform:scale(.7) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}\
      @keyframes __dsp_pulse{0%,100%{box-shadow:0 4px 20px rgba(255,59,48,.35)!important}50%{box-shadow:0 4px 30px rgba(255,59,48,.75)!important}}\
      @keyframes __dsp_fadein{from{opacity:0}to{opacity:1}}\
      @keyframes __dsp_slidein{from{transform:translateY(-100%)}to{transform:translateY(0)}}\
      #__dsp_overlay{\
        position:fixed!important;inset:0!important;z-index:2147483647!important;\
        background:rgba(8,0,0,.93)!important;display:flex!important;\
        align-items:center!important;justify-content:center!important;\
        font-family:system-ui,-apple-system,sans-serif!important;\
        animation:__dsp_fadein .25s ease both!important;\
      }\
      #__dsp_overlay_card{\
        background:#1A0505!important;border:2px solid #FF3B30!important;\
        border-radius:16px!important;padding:28px 32px!important;\
        max-width:540px!important;width:calc(100vw - 40px)!important;\
        box-shadow:0 20px 60px rgba(255,59,48,.4)!important;\
        text-align:center!important;color:#F5F5F5!important;\
      }\
      #__dsp_overlay_card *{box-sizing:border-box!important;}\
      .__dsp_ov_icon{font-size:48px!important;margin-bottom:10px!important;}\
      .__dsp_ov_title{font-size:20px!important;font-weight:800!important;color:#FF3B30!important;margin-bottom:8px!important;}\
      .__dsp_ov_sub{font-size:14px!important;color:#FF8080!important;font-weight:600!important;margin-bottom:14px!important;}\
      .__dsp_ov_url{background:#2B0000!important;border:1px solid #FF3B30!important;border-radius:8px!important;\
        padding:9px 14px!important;font-size:12px!important;color:#FF6B6B!important;\
        word-break:break-all!important;margin-bottom:16px!important;font-family:monospace!important;}\
      .__dsp_ov_reasons{text-align:left!important;margin-bottom:16px!important;\
        background:rgba(255,59,48,.08)!important;border-radius:10px!important;padding:12px!important;}\
      .__dsp_ov_reason{font-size:12px!important;color:#DDD!important;line-height:1.8!important;display:block!important;}\
      .__dsp_tag{display:inline-block!important;background:rgba(255,59,48,.25)!important;\
        border:1px solid #FF3B30!important;border-radius:20px!important;\
        padding:3px 12px!important;font-size:11px!important;font-weight:700!important;\
        color:#FF6B6B!important;margin-bottom:16px!important;\
        text-transform:uppercase!important;letter-spacing:.05em!important;}\
      .__dsp_actions{display:flex!important;gap:10px!important;justify-content:center!important;flex-wrap:wrap!important;}\
      .__dsp_btn{padding:10px 22px!important;border-radius:10px!important;\
        font-size:13px!important;font-weight:700!important;cursor:pointer!important;\
        font-family:inherit!important;transition:all .15s!important;border:none!important;}\
      .__dsp_btn_leave{background:#FF3B30!important;color:#fff!important;}\
      .__dsp_btn_leave:hover{background:#e02d24!important;}\
      .__dsp_btn_anyway{background:transparent!important;border:1.5px solid #444!important;color:#888!important;font-size:12px!important;}\
      .__dsp_btn_anyway:hover{border-color:#888!important;color:#ccc!important;}\
      .__dsp_tip{font-size:11px!important;color:#555!important;margin-top:12px!important;line-height:1.5!important;}\
      #__dsp_caution_bar{\
        position:fixed!important;top:0!important;left:0!important;right:0!important;\
        z-index:2147483646!important;background:#1A1000!important;\
        border-bottom:2px solid #FFB300!important;padding:8px 16px!important;\
        display:flex!important;align-items:center!important;gap:10px!important;\
        font-family:system-ui,-apple-system,sans-serif!important;\
        font-size:13px!important;color:#FFB300!important;\
        animation:__dsp_slidein .3s ease both!important;\
      }\
      #__dsp_caution_bar .cm{flex:1!important;font-weight:600!important;}\
      #__dsp_caution_bar .cd{background:rgba(255,179,0,.15)!important;border:1px solid rgba(255,179,0,.4)!important;\
        border-radius:6px!important;padding:2px 10px!important;font-size:11px!important;\
        cursor:pointer!important;font-family:inherit!important;color:#FFB300!important;white-space:nowrap!important;}\
      #__dsp_caution_bar .cc{background:transparent!important;border:none!important;\
        color:#FFB300!important;font-size:18px!important;cursor:pointer!important;\
        padding:0 4px!important;font-family:inherit!important;line-height:1!important;}\
    ';
    (document.head || document.documentElement).appendChild(style);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function removeOverlay() {
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
    }
    overlayEl = null;
  }

  // ── Floating badge ─────────────────────────────────────────────────────────

  function showBadge(r) {
    if (badgeEl) return;
    var badge = document.createElement('div');
    badge.id = '__dsp_badge';
    badge.className = r.level;
    badge.title = 'DataShield Pro — Click for security details';

    var dot = document.createElement('span');
    dot.className = 'badge-dot';
    badge.appendChild(dot);

    var label = document.createElement('span');
    var icons  = { safe:'🔒', caution:'⚠️', danger:'🚨' };
    var texts  = { safe:'Secure Site', caution:'Caution', danger:'Danger!' };
    label.textContent = (icons[r.level] || '🛡️') + ' ' + (texts[r.level] || 'Unknown');
    badge.appendChild(label);

    // Badge click always shows the detail panel (never triggers overlay)
    badge.addEventListener('click', function() { showDetailPanel(r); });

    (document.body || document.documentElement).appendChild(badge);
    badgeEl = badge;

    // Notify background for badge icon color
    try {
      chrome.runtime.sendMessage({ action:'siteAnalysis', level:r.level, hostname:r.hostname });
    } catch(e) {}
  }

  // ── Full-screen danger overlay ─────────────────────────────────────────────

  function showDangerOverlay(r) {
    if (overlayEl) return;

    var ov   = document.createElement('div');
    ov.id    = '__dsp_overlay';
    var card = document.createElement('div');
    card.id  = '__dsp_overlay_card';

    // Icon
    var icon = document.createElement('div');
    icon.className = '__dsp_ov_icon';
    icon.textContent = '🚨';
    card.appendChild(icon);

    // Title
    var title = document.createElement('div');
    title.className = '__dsp_ov_title';
    title.textContent = 'WARNING: Dangerous Website Detected';
    card.appendChild(title);

    // Subtitle
    var sub = document.createElement('div');
    sub.className = '__dsp_ov_sub';
    sub.textContent = r.spoofedBrand
      ? 'This site may be impersonating ' + r.spoofedBrand
      : ({ phishing:'Possible Phishing Site', spoofing:'Website Spoofing Detected', suspicious:'Highly Suspicious Site' }[r.attackType] || 'Suspicious Site');
    card.appendChild(sub);

    // Attack type tag
    if (r.attackType) {
      var tag = document.createElement('div');
      tag.className = '__dsp_tag';
      tag.textContent = ({ phishing:'🎣 Phishing', spoofing:'🪞 Website Spoofing', suspicious:'⚠️ Suspicious' }[r.attackType] || r.attackType);
      card.appendChild(tag);
    }

    // URL box
    var urlBox = document.createElement('div');
    urlBox.className = '__dsp_ov_url';
    var displayUrl = window.location.href;
    urlBox.textContent = '🌐 ' + (displayUrl.length > 90 ? displayUrl.slice(0,90) + '…' : displayUrl);
    card.appendChild(urlBox);

    // Reasons
    var rb = document.createElement('div');
    rb.className = '__dsp_ov_reasons';
    r.reasons.forEach(function(reason) {
      var s = document.createElement('span');
      s.className = '__dsp_ov_reason';
      s.textContent = reason;
      rb.appendChild(s);
    });
    card.appendChild(rb);

    // Action buttons
    var actions = document.createElement('div');
    actions.className = '__dsp_actions';

    // "Back to Safety" — go back in history, do NOT navigate to about:blank
    var leaveBtn = document.createElement('button');
    leaveBtn.className = '__dsp_btn __dsp_btn_leave';
    leaveBtn.textContent = '🛡️ Take Me Back to Safety';
    leaveBtn.addEventListener('click', function() {
      removeOverlay();
      try {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          // No history — close the tab if opened fresh, otherwise do nothing
          try { window.close(); } catch(e2) {
            // Can't close (user opened it directly) — just dismiss
          }
        }
      } catch(e) { /* ignore */ }
    });

    // "Proceed anyway" — dismiss overlay, stay on page, do NOT navigate anywhere
    var anywayBtn = document.createElement('button');
    anywayBtn.className = '__dsp_btn __dsp_btn_anyway';
    anywayBtn.textContent = 'I understand the risk, continue anyway';
    anywayBtn.addEventListener('click', function() {
      removeOverlay();
      // Update badge to show "Risky — Viewing"
      if (badgeEl) {
        var spans = badgeEl.querySelectorAll('span:not(.badge-dot)');
        if (spans[0]) spans[0].textContent = '⚠️ Risky — Viewing';
      }
    });

    actions.appendChild(leaveBtn);
    actions.appendChild(anywayBtn);
    card.appendChild(actions);

    // Tip
    var tip = document.createElement('div');
    tip.className = '__dsp_tip';
    tip.textContent = '💡 Tip: Real banks and government sites never ask for OTP, card PIN, or passwords via unexpected SMS/WhatsApp links. When in doubt, type the official address directly in a new tab.';
    card.appendChild(tip);

    ov.appendChild(card);
    (document.body || document.documentElement).appendChild(ov);
    overlayEl = ov;
  }

  // ── Caution bar (top of page) ─────────────────────────────────────────────

  function showCautionBar(r) {
    if (document.getElementById('__dsp_caution_bar')) return;
    var bar = document.createElement('div');
    bar.id = '__dsp_caution_bar';

    var msg = document.createElement('span');
    msg.className = 'cm';
    msg.textContent = '⚠️ DataShield Pro: This site has suspicious characteristics — avoid entering personal or financial data.';
    bar.appendChild(msg);

    var det = document.createElement('button');
    det.className = 'cd';
    det.textContent = 'View Details';
    det.addEventListener('click', function() { showDetailPanel(r); });
    bar.appendChild(det);

    var cls = document.createElement('button');
    cls.className = 'cc';
    cls.textContent = '✕';
    cls.addEventListener('click', function() { bar.parentNode && bar.parentNode.removeChild(bar); });
    bar.appendChild(cls);

    (document.body || document.documentElement).insertBefore(bar, (document.body || document.documentElement).firstChild);
  }

  // ── Detail panel (info popup — no navigation) ─────────────────────────────

  function showDetailPanel(r) {
    removeOverlay();

    var ov   = document.createElement('div');
    ov.id    = '__dsp_overlay';
    ov.style.cssText = 'background:rgba(0,0,0,.82)!important';

    var card = document.createElement('div');
    card.id  = '__dsp_overlay_card';
    var lc = { safe:'#00C853', caution:'#FFB300', danger:'#FF3B30' };
    card.style.cssText = 'border-color:' + (lc[r.level] || '#FF3B30') + '!important';

    var ico = document.createElement('div');
    ico.className = '__dsp_ov_icon';
    ico.textContent = ({ safe:'🔒', caution:'⚠️', danger:'🚨' })[r.level] || '🛡️';
    card.appendChild(ico);

    var t = document.createElement('div');
    t.className = '__dsp_ov_title';
    t.style.cssText = 'color:' + (lc[r.level] || '#FF3B30') + '!important';
    t.textContent = ({ safe:'Site Appears Safe', caution:'Use Caution Here', danger:'Dangerous Site!' })[r.level] || 'Site Analysis';
    card.appendChild(t);

    var ub = document.createElement('div');
    ub.className = '__dsp_ov_url';
    ub.textContent = '🌐 ' + r.hostname;
    card.appendChild(ub);

    var rb = document.createElement('div');
    rb.className = '__dsp_ov_reasons';
    r.reasons.forEach(function(reason) {
      var s = document.createElement('span');
      s.className = '__dsp_ov_reason';
      s.textContent = reason;
      rb.appendChild(s);
    });
    card.appendChild(rb);

    var sc = document.createElement('div');
    sc.style.cssText = 'font-size:11px;color:#555;margin-bottom:14px;';
    sc.textContent = 'Risk score: ' + r.score + ' / 100  •  Threshold: ≥60 = Danger, 25–59 = Caution';
    card.appendChild(sc);

    var closeBtn = document.createElement('button');
    closeBtn.className = '__dsp_btn __dsp_btn_anyway';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', removeOverlay);
    card.appendChild(closeBtn);

    ov.appendChild(card);
    ov.addEventListener('click', function(e) { if (e.target === ov) removeOverlay(); });
    (document.body || document.documentElement).appendChild(ov);
    overlayEl = ov;
  }

  // ── Main ──────────────────────────────────────────────────────────────────

  function run() {
    if (!window.__DSP_Storage || !window.__DSP_SiteChecker) {
      setTimeout(run, 200);
      return;
    }

    window.__DSP_Storage.getSettings().then(function(settings) {
      if (settings.enabled === false) return;
      if (settings.siteCheckerEnabled === false) return;

      injectStyles();
      result = window.__DSP_SiteChecker.analyzeUrl(window.location.href);

      function render() {
        showBadge(result);
        if (result.level === 'danger') {
          setTimeout(function() { showDangerOverlay(result); }, 400);
        } else if (result.level === 'caution') {
          showCautionBar(result);
        }
      }

      if (document.body) {
        render();
      } else {
        document.addEventListener('DOMContentLoaded', render);
      }
    }).catch(function() {});
  }

  setTimeout(run, 150);

})();
