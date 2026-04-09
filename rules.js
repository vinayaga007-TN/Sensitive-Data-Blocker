/**
 * DataShield Pro — rules.js
 * Defines all detection rules and the detectSensitiveData() function.
 * Loaded as a content script (no ES module imports — global scope).
 */

// ─────────────────────────────────────────────
// Luhn Algorithm for credit card validation
// ─────────────────────────────────────────────
function luhnCheck(num) {
  const digits = num.replace(/\D/g, '');
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// ─────────────────────────────────────────────
// RULES definition
// ─────────────────────────────────────────────
const RULES = [

  // ── FINANCIAL ──────────────────────────────

  {
    id: 'credit_card',
    label: 'Credit Card Number',
    category: 'financial',
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3,6})?|5[1-5][0-9]{14}|2[2-7][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12,15})(?:[-\s]?\d{4})*\b/g,
    enabled: true,
    postValidate: (match) => luhnCheck(match)
  },
  {
    id: 'cvv',
    label: 'CVV / Security Code',
    category: 'financial',
    regex: /\b(?:cvv|cvc|security\s*code|card\s*verification)[\s:]*([0-9]{3,4})\b/gi,
    enabled: true
  },
  {
    id: 'bank_account',
    label: 'Bank Account Number',
    category: 'financial',
    regex: /\b(?:account\s*(?:no|number|#)?[\s:]*)?[0-9]{9,18}\b/g,
    enabled: true
  },
  {
    id: 'ifsc',
    label: 'IFSC Code',
    category: 'financial',
    regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    enabled: true
  },
  {
    id: 'upi',
    label: 'UPI ID',
    category: 'financial',
    regex: /\b[a-zA-Z0-9.\-_]{3,}@[a-zA-Z]{3,}\b/g,
    enabled: true
  },
  {
    id: 'iban',
    label: 'IBAN',
    category: 'financial',
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]{0,16})?\b/g,
    enabled: true
  },

  // ── IDENTITY ───────────────────────────────

  {
    id: 'aadhaar',
    label: 'Aadhaar Number',
    category: 'identity',
    regex: /\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b/g,
    enabled: true
  },
  {
    id: 'pan',
    label: 'PAN Card Number',
    category: 'identity',
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    enabled: true
  },
  {
    id: 'passport',
    label: 'Passport Number',
    category: 'identity',
    regex: /\b[A-Z][0-9]{7}\b/g,
    enabled: true
  },
  {
    id: 'driving_license',
    label: 'Driving License Number',
    category: 'identity',
    regex: /\b[A-Z]{2}[0-9]{2}[\s-]?(?:19|20)[0-9]{2}[0-9]{7}\b/g,
    enabled: true
  },
  {
    id: 'voter_id',
    label: 'Voter ID',
    category: 'identity',
    regex: /\b[A-Z]{3}[0-9]{7}\b/g,
    enabled: true
  },
  {
    id: 'ssn',
    label: 'Social Security Number (SSN)',
    category: 'identity',
    regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
    enabled: true
  },
  {
    id: 'national_id',
    label: 'National ID Number',
    category: 'identity',
    regex: /\b(?:id\s*(?:no|number|#)?[\s:]*)[0-9]{8,12}\b/gi,
    enabled: true
  },

  // ── CREDENTIALS ────────────────────────────

  {
    id: 'openai_key',
    label: 'OpenAI API Key',
    category: 'credentials',
    regex: /\bsk-(?:proj-|org-)?[A-Za-z0-9]{20,}\b/g,
    enabled: true
  },
  {
    id: 'google_api_key',
    label: 'Google API Key',
    category: 'credentials',
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
    enabled: true
  },
  {
    id: 'github_token',
    label: 'GitHub Token',
    category: 'credentials',
    regex: /\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})\b/g,
    enabled: true
  },
  {
    id: 'aws_access_key',
    label: 'AWS Access Key',
    category: 'credentials',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    enabled: true
  },
  {
    id: 'aws_secret_key',
    label: 'AWS Secret Key',
    category: 'credentials',
    regex: /\b(?:aws_secret_access_key|aws_secret)[\s=:"']+([A-Za-z0-9/+=]{40})\b/gi,
    enabled: true
  },
  {
    id: 'private_key',
    label: 'Private Key (PEM)',
    category: 'credentials',
    regex: /-----BEGIN\s+(?:RSA|EC|OPENSSH|DSA)?\s*PRIVATE\s+KEY-----/g,
    enabled: true
  },
  {
    id: 'jwt',
    label: 'JWT Token',
    category: 'credentials',
    regex: /\beyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\b/g,
    enabled: true
  },
  {
    id: 'bearer_token',
    label: 'Bearer Token',
    category: 'credentials',
    regex: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/g,
    enabled: true
  },
  {
    id: 'password_pattern',
    label: 'Password / Credential',
    category: 'credentials',
    regex: /\b(?:password|passwd|pwd|pass|secret)[\s:='"]+\S{4,}/gi,
    enabled: true
  },

  // ── CONTACT ────────────────────────────────

  {
    id: 'email',
    label: 'Email Address',
    category: 'contact',
    regex: /\b[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]{1,253}\.[A-Za-z]{2,}\b/g,
    enabled: true
  },
  {
    id: 'indian_phone',
    label: 'Indian Phone Number',
    category: 'contact',
    regex: /\b(?:\+?91[\s\-]?)?[6-9]\d{9}\b/g,
    enabled: true
  },
  {
    id: 'intl_phone',
    label: 'International Phone Number',
    category: 'contact',
    regex: /\+[1-9]\d{6,14}\b/g,
    enabled: true
  },
  {
    id: 'home_address',
    label: 'Home Address',
    category: 'contact',
    regex: /\b(?:flat\s*(?:no|number)?|house\s*(?:no|number)?|plot\s*(?:no|number)?|door\s*(?:no|number)?|block\s*(?:no|number)?|sector|street|road|lane|nagar|colony|village|pin\s*(?:code)?|pincode)[\s:,#]*\d+/gi,
    enabled: true
  },
  {
    id: 'ipv4',
    label: 'IPv4 Address',
    category: 'contact',
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    enabled: true
  },
  {
    id: 'ipv6',
    label: 'IPv6 Address',
    category: 'contact',
    regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    enabled: true
  },

  // ── PERSONAL ───────────────────────────────

  {
    id: 'dob',
    label: 'Date of Birth',
    category: 'personal',
    regex: /\b(?:dob|date\s*of\s*birth|born\s*on|birth\s*date)?[\s:,]*(?:0?[1-9]|[12]\d|3[01])[\/\-\s.](?:0?[1-9]|1[0-2])[\/\-\s.](?:19|20)\d{2}\b/gi,
    enabled: true
  },
  {
    id: 'name_age',
    label: 'Name + Age Combination',
    category: 'personal',
    regex: /\bmy\s+name\s+is\s+[A-Za-z]+(?:\s+[A-Za-z]+)?,?\s+i\s+am\s+\d{1,3}\s+years?\s+old\b/gi,
    enabled: true
  },
  {
    id: 'medical',
    label: 'Medical Information',
    category: 'personal',
    regex: /\b(?:blood\s*group|blood\s*type|diagnosis|prescription|patient\s*id|medical\s*record|health\s*card)[\s:,]*[A-Za-z0-9+\-]*/gi,
    enabled: true
  },
  {
    id: 'salary',
    label: 'Salary / Income Information',
    category: 'personal',
    regex: /\b(?:my\s+)?(?:salary|income|earnings|ctc|annual\s+package)\s+is\s+(?:rs\.?|inr|usd|\$|₹)?[\s]*[\d,]+/gi,
    enabled: true
  }
];

// ─────────────────────────────────────────────
// Main detection function
// ─────────────────────────────────────────────

/**
 * Detects sensitive data in the provided text.
 * @param {string} text - Input text to scan
 * @param {Object} enabledCategories - e.g. { financial: true, identity: false, ... }
 * @param {Array} customPatterns - User-defined patterns [{ name, regex, enabled }]
 * @returns {Array} Array of { ruleId, label, category, match, index, confidence }
 */
function detectSensitiveData(text, enabledCategories, customPatterns) {
  if (!text || typeof text !== 'string') return [];

  const results = [];

  // Process built-in rules
  for (const rule of RULES) {
    if (!rule.enabled) continue;
    if (enabledCategories && enabledCategories[rule.category] === false) continue;

    try {
      // Reset lastIndex for global regexes
      rule.regex.lastIndex = 0;
      let match;
      const re = new RegExp(rule.regex.source, rule.regex.flags);

      while ((match = re.exec(text)) !== null) {
        const matchStr = match[0];

        // Post-validation (e.g. Luhn for credit cards)
        if (rule.postValidate && !rule.postValidate(matchStr)) {
          continue;
        }

        results.push({
          ruleId: rule.id,
          label: rule.label,
          category: rule.category,
          match: matchStr,
          index: match.index,
          confidence: 'high'
        });

        // Prevent infinite loop on zero-length matches
        if (re.lastIndex === match.index) re.lastIndex++;
      }
    } catch (e) {
      // Silently skip any rule that errors
    }
  }

  // Process custom user-defined patterns
  if (Array.isArray(customPatterns)) {
    for (const cp of customPatterns) {
      if (!cp.enabled || !cp.regex) continue;
      try {
        const re = new RegExp(cp.regex, 'gi');
        let match;
        while ((match = re.exec(text)) !== null) {
          results.push({
            ruleId: 'custom_' + cp.name,
            label: cp.name,
            category: 'custom',
            match: match[0],
            index: match.index,
            confidence: 'medium'
          });
          if (re.lastIndex === match.index) re.lastIndex++;
        }
      } catch (e) {
        // Invalid user regex — skip
      }
    }
  }

  // Deduplicate overlapping matches
  return deduplicateResults(results);
}

/**
 * Remove results whose match ranges fully overlap a higher-priority match.
 */
function deduplicateResults(results) {
  // Sort by index then by match length (longer = higher priority)
  results.sort((a, b) => a.index - b.index || b.match.length - a.match.length);
  const deduped = [];
  let lastEnd = -1;
  for (const r of results) {
    if (r.index >= lastEnd) {
      deduped.push(r);
      lastEnd = r.index + r.match.length;
    }
  }
  return deduped;
}

// Make available globally (content scripts share the page's extension scope)
// eslint-disable-next-line no-unused-vars
window.__DSP_RULES = RULES;
window.__DSP_detectSensitiveData = detectSensitiveData;
