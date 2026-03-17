/**
 * DataShield Pro — options.js
 * Full settings page logic.
 */

'use strict';

const Storage = window.__DSP_Storage;

const CATEGORIES = [
  { id: 'financial',    label: 'Financial Data',      desc: 'Credit cards, bank accounts, UPI, IFSC, IBAN' },
  { id: 'identity',     label: 'Identity Documents',  desc: 'Aadhaar, PAN, Passport, SSN, Voter ID' },
  { id: 'credentials',  label: 'API Keys & Tokens',   desc: 'OpenAI, GitHub, AWS, JWT, passwords' },
  { id: 'contact',      label: 'Contact Information', desc: 'Email, phone numbers, home address, IP' },
  { id: 'personal',     label: 'Personal Information', desc: 'Date of birth, medical info, salary' }
];

let currentSettings = null;
let pendingModalCallback = null;

// ── Toast ──────────────────────────────────────────────────────────────────

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type + ' visible';
  clearTimeout(toast.__timer);
  toast.__timer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}

// ── Modal ──────────────────────────────────────────────────────────────────

function showModal(title, body, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').textContent = body;
  document.getElementById('modalOverlay').classList.add('visible');
  pendingModalCallback = onConfirm;
}

document.getElementById('modalCancel').addEventListener('click', () => {
  document.getElementById('modalOverlay').classList.remove('visible');
  pendingModalCallback = null;
});

document.getElementById('modalConfirm').addEventListener('click', () => {
  document.getElementById('modalOverlay').classList.remove('visible');
  if (pendingModalCallback) pendingModalCallback();
  pendingModalCallback = null;
});

// Close modal on overlay click
document.getElementById('modalOverlay').addEventListener('click', function (e) {
  if (e.target === this) {
    this.classList.remove('visible');
    pendingModalCallback = null;
  }
});

// ── Categories ─────────────────────────────────────────────────────────────

function renderCategories(settings) {
  const container = document.getElementById('categoriesSection');
  container.innerHTML = '';

  for (const cat of CATEGORIES) {
    const row = document.createElement('div');
    row.className = 'cat-row';

    // Info
    const info = document.createElement('div');
    info.className = 'cat-info';
    const name = document.createElement('div');
    name.className = 'cat-name';
    name.textContent = cat.label;
    const desc = document.createElement('div');
    desc.className = 'cat-desc';
    desc.textContent = cat.desc;
    info.appendChild(name);
    info.appendChild(desc);

    // Toggle
    const label = document.createElement('label');
    label.className = 'toggle-switch';
    label.title = 'Toggle ' + cat.label;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = settings.categories && settings.categories[cat.id] !== false;

    const track = document.createElement('div');
    track.className = 'toggle-track';
    const thumb = document.createElement('div');
    thumb.className = 'toggle-thumb';

    input.addEventListener('change', async () => {
      try {
        const s = await Storage.getSettings();
        if (!s.categories) s.categories = {};
        s.categories[cat.id] = input.checked;
        await Storage.saveSettings(s);
        currentSettings = s;
        showToast('Saved ✓');
      } catch (e) {
        showToast('Save failed', 'error');
      }
    });

    label.appendChild(input);
    label.appendChild(track);
    label.appendChild(thumb);

    row.appendChild(info);
    row.appendChild(label);
    container.appendChild(row);
  }
}

// ── Custom Patterns ────────────────────────────────────────────────────────

function isValidRegex(str) {
  try {
    new RegExp(str);
    return true;
  } catch (e) {
    return false;
  }
}

function renderCustomPatterns(patterns) {
  const area = document.getElementById('customPatternsArea');
  area.innerHTML = '';

  if (!patterns || patterns.length === 0) {
    const msg = document.createElement('span');
    msg.style.cssText = 'font-size:12px;color:#555;';
    msg.textContent = 'No custom patterns yet.';
    area.appendChild(msg);
    return;
  }

  patterns.forEach((pattern, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (!pattern.enabled ? ' disabled-chip' : '');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = pattern.name;

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'chip-toggle' + (pattern.enabled ? ' active' : '');
    toggleBtn.textContent = pattern.enabled ? 'ON' : 'OFF';
    toggleBtn.addEventListener('click', async () => {
      try {
        const s = await Storage.getSettings();
        s.customPatterns[idx].enabled = !s.customPatterns[idx].enabled;
        await Storage.saveSettings(s);
        currentSettings = s;
        renderCustomPatterns(s.customPatterns);
        showToast('Saved ✓');
      } catch (e) {
        showToast('Error', 'error');
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'chip-remove';
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', 'Remove pattern ' + pattern.name);
    removeBtn.addEventListener('click', async () => {
      try {
        const s = await Storage.getSettings();
        s.customPatterns.splice(idx, 1);
        await Storage.saveSettings(s);
        currentSettings = s;
        renderCustomPatterns(s.customPatterns);
        showToast('Pattern removed');
      } catch (e) {
        showToast('Error', 'error');
      }
    });

    chip.appendChild(nameSpan);
    chip.appendChild(toggleBtn);
    chip.appendChild(removeBtn);
    area.appendChild(chip);
  });
}

document.getElementById('addPatternBtn').addEventListener('click', async () => {
  const nameInput = document.getElementById('patternName');
  const regexInput = document.getElementById('patternRegex');
  const errorEl = document.getElementById('patternError');

  const name = nameInput.value.trim();
  const regex = regexInput.value.trim();

  errorEl.classList.remove('visible');

  if (!name) {
    showToast('Please enter a pattern name', 'error');
    return;
  }

  if (!regex || !isValidRegex(regex)) {
    errorEl.classList.add('visible');
    return;
  }

  try {
    const s = await Storage.getSettings();
    if (!s.customPatterns) s.customPatterns = [];
    s.customPatterns.push({ name, regex, enabled: true });
    await Storage.saveSettings(s);
    currentSettings = s;
    nameInput.value = '';
    regexInput.value = '';
    renderCustomPatterns(s.customPatterns);
    showToast('Pattern added ✓');
  } catch (e) {
    showToast('Error saving pattern', 'error');
  }
});

// ── Whitelist ──────────────────────────────────────────────────────────────

function isValidDomain(str) {
  return /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(str);
}

function renderWhitelist(domains) {
  const area = document.getElementById('whitelistArea');
  area.innerHTML = '';

  if (!domains || domains.length === 0) {
    const msg = document.createElement('span');
    msg.style.cssText = 'font-size:12px;color:#555;';
    msg.textContent = 'No whitelisted domains.';
    area.appendChild(msg);
    return;
  }

  domains.forEach((domain, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = domain;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'chip-remove';
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', 'Remove ' + domain);
    removeBtn.addEventListener('click', async () => {
      try {
        const s = await Storage.getSettings();
        s.whitelistedDomains.splice(idx, 1);
        await Storage.saveSettings(s);
        currentSettings = s;
        renderWhitelist(s.whitelistedDomains);
        showToast('Domain removed');
      } catch (e) {
        showToast('Error', 'error');
      }
    });

    chip.appendChild(nameSpan);
    chip.appendChild(removeBtn);
    area.appendChild(chip);
  });
}

document.getElementById('addDomainBtn').addEventListener('click', async () => {
  const input = document.getElementById('whitelistInput');
  const errorEl = document.getElementById('whitelistError');
  const domain = input.value.trim().toLowerCase().replace(/^https?:\/\//, '');
  errorEl.classList.remove('visible');

  if (!isValidDomain(domain)) {
    errorEl.classList.add('visible');
    return;
  }

  try {
    const s = await Storage.getSettings();
    if (!s.whitelistedDomains) s.whitelistedDomains = [];
    if (!s.whitelistedDomains.includes(domain)) {
      s.whitelistedDomains.push(domain);
      await Storage.saveSettings(s);
      currentSettings = s;
    }
    input.value = '';
    renderWhitelist(s.whitelistedDomains);
    showToast('Domain added ✓');
  } catch (e) {
    showToast('Error saving domain', 'error');
  }
});

// ── Stats ──────────────────────────────────────────────────────────────────

async function refreshStats() {
  try {
    const stats = await Storage.getStats();
    document.getElementById('optStatTotal').textContent = stats.blockedTotal || 0;
    document.getElementById('optStatToday').textContent = stats.blockedToday || 0;
  } catch (e) { /* ignore */ }
}

document.getElementById('resetStatsBtn').addEventListener('click', () => {
  showModal('Reset Statistics', 'Are you sure you want to reset all blocked counters to zero?', async () => {
    try {
      await Storage.resetStats();
      await refreshStats();
      showToast('Statistics reset ✓');
    } catch (e) {
      showToast('Error resetting stats', 'error');
    }
  });
});

// ── Export / Import ────────────────────────────────────────────────────────

document.getElementById('exportBtn').addEventListener('click', async () => {
  try {
    const settings = await Storage.getSettings();
    const json = JSON.stringify(settings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'datashield-pro-settings.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Settings exported ✓');
  } catch (e) {
    showToast('Export failed', 'error');
  }
});

document.getElementById('importInput').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      // Validate structure
      if (typeof parsed !== 'object' || parsed === null || typeof parsed.enabled === 'undefined') {
        showToast('Invalid settings file', 'error');
        return;
      }
      await Storage.saveSettings(parsed);
      currentSettings = parsed;
      await init(); // Re-render everything
      showToast('Settings imported ✓');
    } catch (err) {
      showToast('Import failed: invalid JSON', 'error');
    }
  };
  reader.readAsText(file);
  this.value = ''; // Reset input
});

// ── Reset All ──────────────────────────────────────────────────────────────

document.getElementById('resetAllBtn').addEventListener('click', () => {
  showModal(
    'Reset All Settings',
    'This will reset all settings including custom patterns, whitelisted domains, and statistics. This cannot be undone.',
    async () => {
      try {
        await Storage.saveSettings(Object.assign({}, Storage.DEFAULT_SETTINGS));
        currentSettings = Object.assign({}, Storage.DEFAULT_SETTINGS);
        await init();
        showToast('Settings reset to defaults ✓');
      } catch (e) {
        showToast('Error resetting settings', 'error');
      }
    }
  );
});

// ── About / Version ────────────────────────────────────────────────────────

function setVersion() {
  try {
    const manifest = chrome.runtime.getManifest();
    document.getElementById('aboutVersion').textContent = 'Version ' + manifest.version;
  } catch (e) { /* ignore */ }
}

// ── Init ────────────────────────────────────────────────────────────────────

async function init() {
  try {
    currentSettings = await Storage.getSettings();
    renderCategories(currentSettings);
    renderCustomPatterns(currentSettings.customPatterns || []);
    renderWhitelist(currentSettings.whitelistedDomains || []);
    await refreshStats();
    setVersion();
  } catch (e) {
    console.warn('[DataShield Pro] options init error:', e);
  }
}

init();
