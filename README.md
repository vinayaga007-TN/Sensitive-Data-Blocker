# DataShield Pro — Chrome Extension

**A production-ready Manifest V3 Chrome extension that intercepts and blocks sensitive PII, credentials, and financial data before it is submitted on AI chat platforms and Google Search.**

---

## 🚀 Installation

### Step 1 — Save the Files

Download or clone this repository so that the entire `datashield-pro/` folder is saved on your machine.

### Step 2 — Open Chrome Extensions

1. Open Google Chrome
2. Navigate to `chrome://extensions/` in the address bar
3. Or go to Menu → More Tools → Extensions

### Step 3 — Enable Developer Mode

In the top-right corner of the Extensions page, toggle **Developer mode** to **ON**.

### Step 4 — Load the Extension

1. Click **"Load unpacked"** (appears after enabling Developer Mode)
2. Select the `datashield-pro/` folder (the one containing `manifest.json`)
3. The extension will appear in your Extensions list

### Step 5 — Verify Installation

1. The DataShield Pro shield icon should appear in your Chrome toolbar
2. Visit `https://chat.openai.com` and type a fake credit card number like `4111 1111 1111 1111`
3. Press **Enter** — the warning banner should appear

---

## 🛡️ Protected Sites

| Site | URL |
|------|-----|
| ChatGPT | chat.openai.com, chatgpt.com |
| Google Gemini | gemini.google.com |
| DeepSeek | deepseek.com, chat.deepseek.com, platform.deepseek.com |
| Google Search | www.google.com |

---

## ✅ Testing Checklist

Test each of the following on a protected site:

### Credit Card Numbers
- Type: `4111 1111 1111 1111` (Visa test — passes Luhn)
- Press Enter or click Send
- Expected: Warning banner appears

### API Keys
- Type: `sk-abcdefghijklmnopqrstuvwxyz12345678`
- Expected: Warning banner appears (OpenAI API Key detected)

### Aadhaar Number
- Type: `2345 6789 0123`
- Expected: Identity warning

### PAN Card
- Type: `ABCDE1234F`
- Expected: Identity warning

### SSN (US)
- Type: `123-45-6789`
- Expected: Identity warning

### Email Address
- Type: `user@example.com`
- Expected: Contact warning

### Paste Test
- Copy a credit card number to clipboard
- Paste into input
- Expected: Banner appears, paste is blocked

### Allow Once
- Trigger a block
- Click "Allow This Once"
- Expected: Content submits successfully

### Edit My Input
- Trigger a block
- Click "Edit My Input"
- Expected: Banner closes, cursor returns to input

---

## ⚙️ Features

### Real-Time Detection (30+ patterns across 5 categories)
- **Financial**: Credit cards (Luhn-validated), CVV, bank accounts, IFSC, UPI, IBAN
- **Identity**: Aadhaar, PAN, Passport, Driving License, Voter ID, SSN
- **Credentials**: OpenAI/Google/GitHub/AWS API keys, JWTs, Bearer tokens, passwords
- **Contact**: Email, Indian phone, international phone, home address, IP addresses
- **Personal**: Date of birth, medical info, salary/income

### Smart Blocking
- Blocks on Enter/Submit keypress, form submission, button clicks, and paste
- Non-blocking debounced scanning while typing (150ms)
- Luhn algorithm validation for credit cards (prevents false positives)
- "Allow This Once" override option

### Popup & Options
- Dark-themed popup with live blocked stats
- Per-site and per-category toggles
- Custom regex patterns with validation
- Domain whitelist
- Export/Import settings as JSON

### Privacy-First
- 100% local processing — zero network requests
- No telemetry, no analytics, no external resources
- Shadow DOM banner prevents CSS conflicts with host pages
- All data stays in `chrome.storage.local`

---

## 🔧 Developer Notes

### Architecture
- **rules.js**: Pattern definitions + `detectSensitiveData()` function. Loaded first.
- **storage.js**: Async `chrome.storage.local` wrappers. Loaded second.
- **banner.js**: Shadow DOM warning banner with auto-dismiss. Loaded third.
- **content.js**: Core interception engine using MutationObserver + event listeners. Loaded last.
- **background.js**: Service worker managing badge state and message routing.

### Key Decisions
- **Debounce (150ms)**: Prevents detection running on every keystroke, balancing responsiveness and CPU usage.
- **Luhn Validation**: Credit card numbers run through the Luhn algorithm to eliminate false positives from random 13-19 digit strings.
- **Shadow DOM**: The warning banner is isolated in a Shadow DOM to prevent the host page's CSS from overriding its styles.
- **WeakSet for attachment tracking**: Using `WeakSet` for `attachedElements` ensures garbage collection of removed DOM nodes without memory leaks.
- **Settings cache (5s TTL)**: Reduces chrome.storage reads during rapid typing/events while keeping state reasonably fresh.
- **MutationObserver + setInterval**: Observer catches most dynamic content; a 3s interval serves as a safety net for elements the observer may miss.

### Storage Schema
```json
{
  "enabled": true,
  "categories": {
    "financial": true,
    "identity": true,
    "credentials": true,
    "contact": true,
    "personal": true
  },
  "perSite": { "chat.openai.com": true, "...": true },
  "customPatterns": [{ "name": "...", "regex": "...", "enabled": true }],
  "whitelistedDomains": [],
  "blockedToday": 0,
  "blockedTotal": 0,
  "lastResetDate": "2024-01-15"
}
```

### Adding New Detection Rules
Edit `rules.js` and add an object to the `RULES` array:
```js
{
  id: 'my_rule',
  label: 'My Custom Data Type',
  category: 'identity',        // financial | identity | credentials | contact | personal
  regex: /MY-PATTERN-\d{6}/g,  // Must have 'g' flag
  enabled: true,
  postValidate: (match) => true  // Optional: return false to reject a match
}
```

### Adding New Protected Sites
1. Add the domain to `host_permissions` in `manifest.json`
2. Add the domain to `content_scripts.matches` in `manifest.json`
3. Add selectors to `SITE_SELECTORS` in `content.js`
4. Add the domain to `DEFAULT_SETTINGS.perSite` in `storage.js`

---

## 🔒 Privacy Statement

All processing is performed entirely within your browser using local JavaScript. DataShield Pro never transmits, logs, or stores any of the sensitive data it detects — or any personal information — to any server, cloud service, or third party. No data ever leaves your device. The extension uses `chrome.storage.local` exclusively for storing your preferences and block counts.

---

## Compatibility

- Chrome 120+ (Manifest V3)
- No build step required
- No external dependencies
- No Node.js or npm needed
