/**
 * DataShield Pro — site-checker.js v1.2
 *
 * Website security analysis engine.
 * Implements research-based weighted scoring (Indian + foreign phishing research).
 * 100% local — zero network calls.
 *
 * Key fixes vs v1.1:
 *  - Comprehensive ALLOWLIST checked first → known good sites always score 0
 *  - checkBrandInSubdomain now requires brand token length >= 5 to avoid
 *    single-letter false positives (e.g. "t" from t.me matching "chat")
 *  - Weighted scoring system from phishing research replaces old boolean flags
 *  - Levenshtein comparison only runs against the eTLD+1 registered domain, not
 *    full hostname, preventing subdomain cross-brand confusion
 */
(function () {
  'use strict';

  // ── ALLOWLIST — these domains ALWAYS score 0, never flagged ──────────────
  // Add any domain your users visit regularly that gets false-positives.
  var ALLOWLIST = [
    // AI platforms
    'chat.openai.com','chatgpt.com','openai.com',
    'gemini.google.com','bard.google.com',
    'deepseek.com','chat.deepseek.com','platform.deepseek.com',
    'claude.ai','anthropic.com',
    'copilot.microsoft.com','bing.com',
    'perplexity.ai','you.com','poe.com','character.ai',
    'huggingface.co','replicate.com','cohere.com',
    'mistral.ai','groq.com','together.ai',
    // Search engines
    'google.com','www.google.com','google.co.in','google.co.uk',
    'bing.com','duckduckgo.com','yahoo.com','baidu.com',
    // Major tech
    'github.com','stackoverflow.com','mozilla.org','wikipedia.org',
    'youtube.com','reddit.com','twitter.com','x.com',
    'facebook.com','instagram.com','linkedin.com','whatsapp.com',
    'telegram.org','t.me','discord.com','slack.com','zoom.us',
    // Microsoft
    'microsoft.com','office.com','outlook.com','live.com',
    'hotmail.com','onedrive.com','sharepoint.com',
    // Google services
    'gmail.com','drive.google.com','docs.google.com',
    'accounts.google.com','mail.google.com','pay.google.com',
    // Apple
    'apple.com','icloud.com','appleid.apple.com',
    // Indian banks (official)
    'onlinesbi.sbi','sbi.co.in','hdfcbank.com','icicibank.com',
    'axisbank.com','kotak.com','kotakbank.com','pnbindia.in',
    'bankofbaroda.in','canarabank.in','unionbankofindia.co.in',
    'netbanking.hdfcbank.com','infinity.icicibank.com',
    // Indian payments
    'paytm.com','phonepe.com','gpay.app','bhimupi.org.in',
    'razorpay.com','cashfree.com','instamojo.com',
    // Indian govt
    'india.gov.in','incometax.gov.in','efiling.incometax.gov.in',
    'uidai.gov.in','myaadhaar.uidai.gov.in','digilocker.gov.in',
    'epfindia.gov.in','irctc.co.in','mca.gov.in','nic.in',
    // Global finance
    'paypal.com','stripe.com','wise.com','revolut.com',
    // Shopping
    'amazon.com','amazon.in','flipkart.com','myntra.com',
    'nykaa.com','meesho.com','snapdeal.com',
    // Dev / infra
    'vercel.app','netlify.app','herokuapp.com','pages.dev',
    'cloudflare.com','aws.amazon.com','azure.microsoft.com',
    'firebase.google.com','supabase.co'
  ];

  // ── Trusted brand database (for spoofing detection only) ─────────────────
  // IMPORTANT: Only brands worth impersonating are listed.
  // Each entry has a minimum token length to prevent substring false-positives.
  var BRANDS = [
    // Finance
    { name:'PayPal',      tokens:['paypal'],                     cat:'finance' },
    { name:'Stripe',      tokens:['stripe'],                     cat:'finance' },
    { name:'Razorpay',    tokens:['razorpay'],                   cat:'finance' },
    { name:'Paytm',       tokens:['paytm'],                      cat:'finance' },
    { name:'PhonePe',     tokens:['phonepe'],                    cat:'finance' },
    // Indian banks
    { name:'HDFC Bank',   tokens:['hdfc','hdfcbank'],            cat:'bank' },
    { name:'ICICI Bank',  tokens:['icici','icicibank'],          cat:'bank' },
    { name:'SBI',         tokens:['onlinesbi','sbibank'],        cat:'bank' },
    { name:'Axis Bank',   tokens:['axisbank','axisnet'],         cat:'bank' },
    { name:'Kotak Bank',  tokens:['kotak','kotakbank'],          cat:'bank' },
    // Global banks
    { name:'Bank of America', tokens:['bankofamerica'],          cat:'bank' },
    { name:'Chase',       tokens:['chase'],                      cat:'bank' },
    { name:'Wells Fargo', tokens:['wellsfargo'],                 cat:'bank' },
    { name:'Citibank',    tokens:['citibank'],                   cat:'bank' },
    // Shopping
    { name:'Amazon',      tokens:['amazon'],                     cat:'shopping' },
    { name:'Flipkart',    tokens:['flipkart'],                   cat:'shopping' },
    { name:'eBay',        tokens:['ebay'],                       cat:'shopping' },
    // Social
    { name:'Facebook',    tokens:['facebook'],                   cat:'social' },
    { name:'Instagram',   tokens:['instagram'],                  cat:'social' },
    { name:'Twitter',     tokens:['twitter'],                    cat:'social' },
    { name:'LinkedIn',    tokens:['linkedin'],                   cat:'social' },
    { name:'WhatsApp',    tokens:['whatsapp'],                   cat:'social' },
    { name:'Telegram',    tokens:['telegram'],                   cat:'social' }, // NOTE: "t" alone never used
    // Tech
    { name:'Google',      tokens:['google'],                     cat:'tech' },
    { name:'Microsoft',   tokens:['microsoft'],                  cat:'tech' },
    { name:'Apple',       tokens:['apple'],                      cat:'tech' },
    { name:'GitHub',      tokens:['github'],                     cat:'tech' },
    // Government
    { name:'Income Tax India', tokens:['incometax','efiling'],   cat:'govt' },
    { name:'Aadhaar/UIDAI',    tokens:['uidai','aadhaar','aadhar'], cat:'govt' },
    { name:'IRCTC',       tokens:['irctc'],                      cat:'govt' },
    { name:'DigiLocker',  tokens:['digilocker'],                 cat:'govt' },
    // Crypto
    { name:'Coinbase',    tokens:['coinbase'],                   cat:'crypto' },
    { name:'Binance',     tokens:['binance'],                    cat:'crypto' },
    { name:'WazirX',      tokens:['wazirx'],                     cat:'crypto' },
    // Investment
    { name:'Zerodha',     tokens:['zerodha'],                    cat:'invest' },
    { name:'Groww',       tokens:['groww'],                      cat:'invest' },
  ];

  // ── High-abuse TLDs (from phishing research) ─────────────────────────────
  var HIGH_ABUSE_TLDS = [
    '.top','.bond','.xyz','.shop','.xin','.online','.men','.sbs',
    '.trade','.live','.click','.loan','.win','.download','.accountant',
    '.science','.date','.review','.stream','.racing','.party',
    '.tk','.ml','.ga','.cf','.gq'
  ];

  // ── URL shorteners (phishing delivery vector) ─────────────────────────────
  var SHORTENERS = [
    'bit.ly','tinyurl.com','t.co','ow.ly','goo.gl','short.link',
    'rb.gy','cutt.ly','tiny.cc','is.gd','buff.ly','lnkd.in',
    'shorturl.at','clck.ru','tr.im','shrink.im','ngrok.io',
    'ngrok-free.app','loca.lt','serveo.net','pagekite.me'
  ];

  // ── India-specific phishing keywords in domain names ─────────────────────
  // (From research: domains using these words but not on .gov.in or .bank.in
  //  are high-risk for Indian phishing)
  var INDIA_PHISH_KEYWORDS = [
    'kyc-update','kyc-verify','full-kyc','kycverify','kycupdate',
    'income-tax-refund','incometaxrefund','taxrefund',
    'sbi-alert','sbi-update','sbi-kyc','sbialert',
    'hdfc-update','hdfc-alert','hdfcalert',
    'icici-update','icici-alert',
    'aadhar-update','aadhaar-update','aadharupdate',
    'paytm-kyc','paytm-alert',
    'epfo-update','pf-withdrawal'
  ];

  // ── Generic phishing path keywords ────────────────────────────────────────
  var PHISHING_PATH_KEYWORDS = [
    'full-kyc.php','kyc-update.php','verify-account',
    'income-tax-refund','account-suspended','account-blocked',
    'credential','login-verify','secure-login','bank-verify'
  ];

  // ── Main analysis function ─────────────────────────────────────────────────

  function analyzeUrl(urlStr) {
    var result = {
      score: 0,
      level: 'safe',
      reasons: [],
      spoofedBrand: null,
      attackType: null,
      isHttps: false,
      hostname: ''
    };

    try {
      var url = new URL(urlStr);
      result.isHttps  = url.protocol === 'https:';
      result.hostname = url.hostname.toLowerCase();
      var hostname    = result.hostname;
      var pathname    = url.pathname.toLowerCase();

      // ── STEP 1: Allowlist check — immediate score 0 ────────────────────
      if (isAllowlisted(hostname)) {
        result.score   = 0;
        result.level   = 'safe';
        result.reasons = ['✅ Verified safe domain'];
        return result;
      }

      // ── STEP 2: Extract registered domain (eTLD+1) ────────────────────
      // Simple extraction: last two labels for most TLDs,
      // handle double-extension TLDs like .co.in, .gov.in, .bank.in
      var registeredDomain = getRegisteredDomain(hostname);
      var registeredRoot   = registeredDomain.split('.')[0]; // e.g. "amaz0n"

      // ── STEP 3: Weighted scoring (research-based) ─────────────────────

      // No HTTPS → +30 (very suspicious for any banking/login page)
      if (!result.isHttps) {
        result.score += 30;
        result.reasons.push('❌ No HTTPS — connection is not encrypted (plaintext)');
      }

      // IP address as hostname → +25
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
        result.score += 25;
        result.reasons.push('🔴 IP address used as hostname — phishing sites often avoid registering domains');
        result.attackType = 'phishing';
      }

      // URL shortener / tunnel service → +15
      for (var si = 0; si < SHORTENERS.length; si++) {
        if (hostname === SHORTENERS[si] || hostname.endsWith('.' + SHORTENERS[si])) {
          result.score += 15;
          result.reasons.push('⚠️ Tunnel/shortener URL ("' + hostname + '") — common in SMS phishing delivery');
          break;
        }
      }

      // High-abuse TLD → +15
      for (var ti = 0; ti < HIGH_ABUSE_TLDS.length; ti++) {
        if (hostname.endsWith(HIGH_ABUSE_TLDS[ti])) {
          result.score += 15;
          result.reasons.push('⚠️ High-abuse TLD "' + HIGH_ABUSE_TLDS[ti] + '" — heavily used in phishing campaigns');
          break;
        }
      }

      // India-specific phishing keywords in hostname → +25
      for (var ik = 0; ik < INDIA_PHISH_KEYWORDS.length; ik++) {
        if (hostname.includes(INDIA_PHISH_KEYWORDS[ik])) {
          result.score += 25;
          result.reasons.push('🔴 India-targeted phishing keyword "' + INDIA_PHISH_KEYWORDS[ik] + '" in domain name');
          result.attackType = result.attackType || 'phishing';
          break;
        }
      }

      // Phishing-style path keywords → +15
      for (var pk = 0; pk < PHISHING_PATH_KEYWORDS.length; pk++) {
        if (pathname.includes(PHISHING_PATH_KEYWORDS[pk])) {
          result.score += 15;
          result.reasons.push('⚠️ Suspicious path keyword "' + PHISHING_PATH_KEYWORDS[pk] + '" commonly used in KYC/banking phish');
          break;
        }
      }

      // ── STEP 4: Brand spoofing detection (eTLD+1 only) ────────────────
      // Only compare the REGISTERED DOMAIN root (not subdomains) against brands.
      // This prevents "chat" matching "t" (Telegram's t.me root).
      var spoofResult = detectBrandSpoofing(registeredRoot, hostname);
      if (spoofResult) {
        result.score       += spoofResult.score;
        result.spoofedBrand = spoofResult.brand;
        result.attackType   = spoofResult.score >= 50 ? 'spoofing' : 'phishing';
        result.reasons      = result.reasons.concat(spoofResult.reasons);
      }

      // ── STEP 5: Structural red flags ──────────────────────────────────

      // Punycode / internationalized domain attack
      if (hostname.startsWith('xn--') || hostname.includes('.xn--')) {
        result.score += 40;
        result.reasons.push('🔴 Punycode/internationalized domain — classic visual spoofing technique');
        result.attackType = result.attackType || 'spoofing';
      }

      // Excessive hyphens in registered domain (amazon-secure-login-verify.com)
      var hyphenCount = (registeredRoot.match(/-/g) || []).length;
      if (hyphenCount >= 2) {
        result.score += 10 * hyphenCount;
        result.reasons.push('⚠️ ' + hyphenCount + ' hyphens in domain "' + registeredRoot + '" — common phishing pattern');
      }

      // Very long domain
      if (hostname.length > 45) {
        result.score += 15;
        result.reasons.push('⚠️ Very long domain name (' + hostname.length + ' chars) — may be hiding real destination');
      }

      // More than 4 subdomain levels
      var parts = hostname.split('.');
      if (parts.length > 4) {
        result.score += 20;
        result.reasons.push('⚠️ Unusually deep subdomain nesting (' + (parts.length - 2) + ' levels)');
      }

      // ── STEP 6: Legitimate brand in subdomain (only if root differs) ──
      // e.g. paypal.attacker.com — brand "paypal" in subdomain but root is "attacker"
      var subBrandResult = checkBrandInSubdomain(hostname, registeredRoot);
      if (subBrandResult) {
        result.score       += subBrandResult.score;
        result.spoofedBrand = result.spoofedBrand || subBrandResult.brand;
        result.attackType   = result.attackType   || 'phishing';
        result.reasons      = result.reasons.concat(subBrandResult.reasons);
      }

    } catch (e) {
      // Malformed URL — not our problem
      result.score = 0;
    }

    // ── Clamp and threshold ────────────────────────────────────────────────
    result.score = Math.min(100, Math.max(0, result.score));

    // Research thresholds: ≥60 = danger, 25-59 = caution, <25 = safe
    if (result.score >= 60) {
      result.level = 'danger';
      if (!result.attackType) result.attackType = 'suspicious';
    } else if (result.score >= 25) {
      result.level = 'caution';
    } else {
      result.level = 'safe';
    }

    if (result.reasons.length === 0) {
      result.reasons.push('✅ No suspicious patterns detected');
    }

    return result;
  }

  // ── Allowlist checker ─────────────────────────────────────────────────────

  function isAllowlisted(hostname) {
    for (var i = 0; i < ALLOWLIST.length; i++) {
      var entry = ALLOWLIST[i].toLowerCase();
      if (hostname === entry || hostname.endsWith('.' + entry)) {
        return true;
      }
    }
    return false;
  }

  // ── Registered domain extractor ───────────────────────────────────────────
  // Handles common double-extension TLDs (.co.in, .gov.in, .bank.in, .co.uk)

  var DOUBLE_TLDS = ['.co.in','.gov.in','.bank.in','.net.in','.org.in',
                     '.co.uk','.org.uk','.co.au','.com.au','.com.br'];

  function getRegisteredDomain(hostname) {
    var h = hostname.toLowerCase();
    for (var i = 0; i < DOUBLE_TLDS.length; i++) {
      if (h.endsWith(DOUBLE_TLDS[i])) {
        var stripped = h.slice(0, h.length - DOUBLE_TLDS[i].length);
        var lastDot  = stripped.lastIndexOf('.');
        return (lastDot === -1 ? stripped : stripped.slice(lastDot + 1)) + DOUBLE_TLDS[i];
      }
    }
    // Standard: last two labels
    var parts  = h.split('.');
    if (parts.length <= 2) return h;
    return parts[parts.length - 2] + '.' + parts[parts.length - 1];
  }

  // ── Brand spoofing detection (eTLD+1 root only) ───────────────────────────
  // Compares the REGISTERED DOMAIN ROOT against known brand tokens.
  // Min token length = 5 prevents single-letter / short-word false positives.

  var MIN_BRAND_TOKEN_LEN = 5;

  function detectBrandSpoofing(registeredRoot, fullHostname) {
    var best = null;
    var bestScore = 0;

    for (var i = 0; i < BRANDS.length; i++) {
      var brand = BRANDS[i];
      for (var j = 0; j < brand.tokens.length; j++) {
        var token = brand.tokens[j].toLowerCase();

        // Skip short tokens to prevent false positives (e.g., "t" from t.me)
        if (token.length < MIN_BRAND_TOKEN_LEN) continue;

        var score = 0;
        var reason = '';

        // Exact match — legitimate domain already in allowlist, shouldn't reach here
        if (registeredRoot === token) continue;

        // Homograph normalization: replace look-alike chars and compare
        var normalized = normalizeHomographs(registeredRoot);
        if (normalized !== registeredRoot && normalized === token) {
          score  = 85;
          reason = '🔴 HOMOGRAPH ATTACK: "' + registeredRoot + '" uses look-alike characters to impersonate "' + token + '" (' + brand.name + ')';
        }

        // Token embedded in registered root with extra text
        // (e.g. "amazon-login" contains "amazon")
        if (!reason && registeredRoot.includes(token) && registeredRoot !== token) {
          score  = 55;
          reason = '🔴 Brand name "' + token + '" (' + brand.name + ') embedded in suspicious domain "' + registeredRoot + '"';
        }

        // Levenshtein similarity (only for tokens >= 5 chars, distance <= 2)
        if (!reason && token.length >= 5) {
          var dist = levenshtein(registeredRoot, token);
          var maxLen = Math.max(registeredRoot.length, token.length);
          if (dist === 1 && maxLen >= 5) {
            score  = 70;
            reason = '🔴 Domain "' + registeredRoot + '" differs by 1 character from "' + token + '" (' + brand.name + ') — likely typosquatting';
          } else if (dist === 2 && maxLen >= 7) {
            score  = 40;
            reason = '⚠️ Domain "' + registeredRoot + '" is very similar to "' + token + '" (' + brand.name + ')';
          }
        }

        // Full legit domain used as subdomain of attacker domain
        // e.g. paypal.com.evil.net — check if fullHostname contains "paypal.com" but doesn't end in it
        var legitFullDomain = token + '.com'; // approximate check
        if (!reason && fullHostname.includes(legitFullDomain + '.') &&
            !fullHostname.endsWith('.' + legitFullDomain) &&
            fullHostname !== legitFullDomain) {
          score  = 80;
          reason = '🔴 DOMAIN TRICK: "' + legitFullDomain + '" used as subdomain of attacker domain';
        }

        if (score > bestScore) {
          bestScore = score;
          best = { brand: brand.name, score: score, reasons: [reason] };
        }
      }
    }

    return best;
  }

  // ── Subdomain brand check ─────────────────────────────────────────────────
  // Detects e.g. "paypal.secure-verify.com" where brand is in subdomain.
  // REQUIRES token.length >= 5 AND token must NOT appear in registered root.

  function checkBrandInSubdomain(hostname, registeredRoot) {
    var parts = hostname.split('.');
    if (parts.length < 3) return null;

    // Subdomains = everything before the last two labels
    var subStr = parts.slice(0, parts.length - 2).join('.');

    for (var i = 0; i < BRANDS.length; i++) {
      var brand = BRANDS[i];
      for (var j = 0; j < brand.tokens.length; j++) {
        var token = brand.tokens[j].toLowerCase();

        // *** CRITICAL FIX: require token length >= 5 ***
        // This prevents "t" (from t.me) matching inside "chat",
        // or "sbi" matching inside arbitrary short words, etc.
        if (token.length < 5) continue;

        // The brand token must appear in the subdomain portion
        // but NOT in the registered domain root itself
        var inSub  = subStr.includes(token);
        var inRoot = registeredRoot.includes(token);

        if (inSub && !inRoot) {
          return {
            brand: brand.name,
            score: 65,
            reasons: [
              '🔴 SUBDOMAIN TRICK: "' + brand.name + '" name ("' + token + '") in subdomain but actual registered domain is "' + registeredRoot + '"'
            ]
          };
        }
      }
    }
    return null;
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  var HOMOGRAPH_MAP = {
    '0':'o','3':'e','4':'a','5':'s','6':'g','8':'b',
    '@':'a','$':'s','!':'i','|':'l','1':'l'
  };

  function normalizeHomographs(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      out += (HOMOGRAPH_MAP[str[i]] !== undefined) ? HOMOGRAPH_MAP[str[i]] : str[i];
    }
    return out.replace(/rn/g,'m').replace(/vv/g,'w').replace(/cl/g,'d');
  }

  function levenshtein(a, b) {
    var m = a.length, n = b.length;
    var dp = [];
    for (var i = 0; i <= m; i++) {
      dp[i] = [i];
      for (var j = 1; j <= n; j++) {
        if (i === 0) { dp[i][j] = j; continue; }
        dp[i][j] = (a[i-1] === b[j-1]) ? dp[i-1][j-1] :
          1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
    return dp[m][n];
  }

  function findLegitimateMatch(hostname) {
    return isAllowlisted(hostname) ? { name: hostname } : null;
  }

  // ── Export ────────────────────────────────────────────────────────────────

  window.__DSP_SiteChecker = {
    analyzeUrl: analyzeUrl,
    isAllowlisted: isAllowlisted,
    findLegitimateMatch: findLegitimateMatch,
    BRANDS: BRANDS,
    ALLOWLIST: ALLOWLIST
  };

})();
