/**
 * DataShield Pro — banner.js
 * Injects a warning banner directly into the page (no Shadow DOM).
 * Uses highly-namespaced CSS class names to avoid conflicts.
 */

(function () {
  'use strict';

  // Inject our CSS once into the page head
  function injectStyles() {
    if (document.getElementById('__dsp_styles')) return;
    const style = document.createElement('style');
    style.id = '__dsp_styles';
    style.textContent = `
      #__dsp_host {
        all: unset;
        position: fixed !important;
        top: 16px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 2147483647 !important;
        width: min(500px, calc(100vw - 32px)) !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        animation: __dsp_slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1) both !important;
        pointer-events: auto !important;
      }
      #__dsp_host.__dsp_hiding {
        animation: __dsp_fadeOut 0.3s ease forwards !important;
        pointer-events: none !important;
      }
      @keyframes __dsp_slideDown {
        from { opacity: 0; transform: translateX(-50%) translateY(-24px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes __dsp_fadeOut {
        from { opacity: 1; }
        to   { opacity: 0; transform: translateX(-50%) translateY(-12px); }
      }
      @keyframes __dsp_drain {
        from { width: 100%; }
        to   { width: 0%; }
      }
      #__dsp_host * { box-sizing: border-box !important; margin: 0 !important; padding: 0 !important; }
      #__dsp_card {
        background: #1C0A0A !important;
        border: 2px solid #FF3B30 !important;
        border-radius: 14px !important;
        box-shadow: 0 12px 48px rgba(255,59,48,0.4), 0 2px 16px rgba(0,0,0,0.7) !important;
        overflow: hidden !important;
        color: #F5F5F5 !important;
      }
      #__dsp_progress {
        height: 4px !important;
        background: #FF3B30 !important;
        animation: __dsp_drain 8s linear forwards !important;
        width: 100% !important;
      }
      #__dsp_body { padding: 16px 18px 18px !important; }
      #__dsp_header {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        margin-bottom: 12px !important;
      }
      #__dsp_title {
        font-size: 15px !important;
        font-weight: 700 !important;
        color: #FF6B6B !important;
        line-height: 1.3 !important;
        flex: 1 !important;
      }
      #__dsp_close {
        background: transparent !important;
        border: none !important;
        color: #888 !important;
        font-size: 20px !important;
        cursor: pointer !important;
        padding: 2px 6px !important;
        border-radius: 6px !important;
        line-height: 1 !important;
        font-family: inherit !important;
        transition: color 0.15s, background 0.15s !important;
      }
      #__dsp_close:hover { color: #fff !important; background: rgba(255,255,255,0.12) !important; }
      #__dsp_chips {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        margin-bottom: 12px !important;
        list-style: none !important;
      }
      .dsp_chip {
        background: rgba(255,59,48,0.2) !important;
        border: 1px solid rgba(255,59,48,0.45) !important;
        border-radius: 20px !important;
        padding: 3px 11px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        color: #FF8080 !important;
        white-space: nowrap !important;
      }
      #__dsp_sub {
        font-size: 12px !important;
        color: #999 !important;
        margin-bottom: 14px !important;
        line-height: 1.55 !important;
      }
      #__dsp_actions {
        display: flex !important;
        gap: 10px !important;
        flex-wrap: wrap !important;
      }
      .dsp_btn {
        padding: 9px 18px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.15s !important;
        font-family: inherit !important;
        flex: 1 !important;
        min-width: 130px !important;
        text-align: center !important;
        line-height: 1.4 !important;
      }
      #__dsp_edit {
        background: transparent !important;
        border: 1.5px solid #666 !important;
        color: #ccc !important;
      }
      #__dsp_edit:hover { border-color: #aaa !important; color: #fff !important; background: rgba(255,255,255,0.08) !important; }
      #__dsp_allow {
        background: #8B0000 !important;
        border: 1.5px solid #FF3B30 !important;
        color: #fff !important;
      }
      #__dsp_allow:hover { background: #aa0000 !important; }
      #__dsp_countdown {
        font-size: 11px !important;
        color: #555 !important;
        text-align: right !important;
        margin-top: 8px !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  let bannerEl = null;
  let cdInterval = null;
  let cdTimeout = null;

  function removeBanner(animate) {
    clearInterval(cdInterval);
    clearTimeout(cdTimeout);
    if (!bannerEl) return;
    if (animate) {
      bannerEl.classList.add('__dsp_hiding');
      const ref = bannerEl;
      bannerEl = null;
      setTimeout(() => { try { ref.parentNode && ref.parentNode.removeChild(ref); } catch(e){} }, 350);
    } else {
      try { bannerEl.parentNode && bannerEl.parentNode.removeChild(bannerEl); } catch(e){}
      bannerEl = null;
    }
  }

  function showBanner(threats, targetInput, onAllowOnce, onEdit) {
    injectStyles();
    if (bannerEl) removeBanner(false);

    // Host
    const host = document.createElement('div');
    host.id = '__dsp_host';

    // Card
    const card = document.createElement('div');
    card.id = '__dsp_card';

    // Progress bar
    const prog = document.createElement('div');
    prog.id = '__dsp_progress';
    card.appendChild(prog);

    // Body
    const body = document.createElement('div');
    body.id = '__dsp_body';

    // Header
    const header = document.createElement('div');
    header.id = '__dsp_header';

    // Shield SVG (inline, no innerHTML on user content)
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '28');
    svg.setAttribute('height', '28');
    svg.setAttribute('fill', 'none');
    svg.style.cssText = 'flex-shrink:0;';
    const p1 = document.createElementNS(svgNS, 'path');
    p1.setAttribute('d', 'M12 2L4 5.5V11C4 15.418 7.582 20.417 12 22C16.418 20.417 20 15.418 20 11V5.5L12 2Z');
    p1.setAttribute('fill', '#8B0000');
    p1.setAttribute('stroke', '#FF3B30');
    p1.setAttribute('stroke-width', '1.5');
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x','9'); rect.setAttribute('y','10');
    rect.setAttribute('width','6'); rect.setAttribute('height','5');
    rect.setAttribute('rx','1'); rect.setAttribute('fill','#FF6B6B');
    const p2 = document.createElementNS(svgNS, 'path');
    p2.setAttribute('d', 'M10 10V8.5C10 7.67 10.67 7 11.5 7H12.5C13.33 7 14 7.67 14 8.5V10');
    p2.setAttribute('stroke', '#FF6B6B'); p2.setAttribute('stroke-width', '1.5');
    p2.setAttribute('fill', 'none'); p2.setAttribute('stroke-linecap', 'round');
    svg.appendChild(p1); svg.appendChild(rect); svg.appendChild(p2);
    header.appendChild(svg);

    const title = document.createElement('div');
    title.id = '__dsp_title';
    title.textContent = '⚠️ DataShield Pro — Sensitive Data Detected';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.id = '__dsp_close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => removeBanner(true));
    header.appendChild(closeBtn);
    body.appendChild(header);

    // Threat chips
    const chips = document.createElement('ul');
    chips.id = '__dsp_chips';
    const seen = new Set();
    for (const t of threats) {
      if (seen.has(t.label)) continue;
      seen.add(t.label);
      const li = document.createElement('li');
      li.className = 'dsp_chip';
      li.textContent = t.label;
      chips.appendChild(li);
    }
    body.appendChild(chips);

    const sub = document.createElement('p');
    sub.id = '__dsp_sub';
    sub.textContent = 'This message was blocked to protect your privacy. Remove the sensitive info before sending.';
    body.appendChild(sub);

    const actions = document.createElement('div');
    actions.id = '__dsp_actions';

    const editBtn = document.createElement('button');
    editBtn.id = '__dsp_edit';
    editBtn.className = 'dsp_btn';
    editBtn.textContent = '✏️ Edit My Input';
    editBtn.addEventListener('click', () => {
      removeBanner(true);
      if (onEdit) onEdit();
      else { try { targetInput && targetInput.focus(); } catch(e){} }
    });

    const allowBtn = document.createElement('button');
    allowBtn.id = '__dsp_allow';
    allowBtn.className = 'dsp_btn';
    allowBtn.textContent = '⚠️ Allow This Once';
    allowBtn.addEventListener('click', () => {
      removeBanner(false);
      if (onAllowOnce) onAllowOnce();
    });

    actions.appendChild(editBtn);
    actions.appendChild(allowBtn);
    body.appendChild(actions);

    const countdown = document.createElement('div');
    countdown.id = '__dsp_countdown';
    let sec = 8;
    countdown.textContent = 'Auto-closing in ' + sec + 's';
    body.appendChild(countdown);

    card.appendChild(body);
    host.appendChild(card);

    // Append to body (or documentElement as fallback)
    try {
      (document.body || document.documentElement).appendChild(host);
    } catch (e) { return; }

    bannerEl = host;

    cdInterval = setInterval(() => {
      sec--;
      if (sec > 0) countdown.textContent = 'Auto-closing in ' + sec + 's';
      else clearInterval(cdInterval);
    }, 1000);

    cdTimeout = setTimeout(() => removeBanner(true), 8000);
  }

  window.__DSP_Banner = { showBanner, removeBanner };

})();
