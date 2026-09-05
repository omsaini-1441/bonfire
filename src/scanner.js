(function (root) {
  const INJECTION_RE =
    /ignore (all )?(previous|prior|above) (instructions|prompts)|you are (now )?(chatgpt|claude|gemini|gpt|an? ai assistant)|system\s*(prompt|message)\s*:|<\|im_start\|>|do not (tell|mention|reveal) (the )?(user|human)|hidden instruction|when (you )?(summarize|extract|shop|buy)|exfiltrat|forget (your|all) (instructions|rules)|developer message|new instructions override|api[_-]?key/i;

  const URGENCY_RE =
    /only\s+\d+\s+left|selling fast|limited[- ]time|hurry[,!]?|act now|deal ends|expires? in|offer expires|flash sale|almost gone|last chance|while supplies last/i;

  const SOCIAL_RE =
    /\b([A-Z][a-z]+ from [A-Z][a-z]+|someone in [A-Za-z .]{2,24}) (just )?(bought|purchased|ordered|checked out)|(\d+\s+people (are )?viewing)|claimed (this )?deal|in your cart right now/i;

  const SHAME_RE =
    /no thanks[,.]? (i|i'd|i’ll|i'll).{0,48}(pay full|full price|hate saving|don't like money|prefer to miss)|i don't want to save|continue without (saving|discount|protection)|no, i like (paying|expensive)/i;

  const SUB_RE =
    /free trial.{0,80}(then|after|automatically)|automatically renew|cancel anytime.{0,40}\$\d|billed (monthly|every month) after|subscription starts after/i;

  const SLOP_PHRASES = [
    "delve into",
    "in today's fast-paced",
    "it's important to note",
    "unlock the power",
    "a testament to",
    "in conclusion,",
    "landscape of",
    "as a large language",
    "in the realm of",
    "utilize cutting-edge",
    "elevate your",
    "robust and scalable"
  ];

  const BRANDS = [
    "google.com",
    "gmail.com",
    "microsoft.com",
    "apple.com",
    "amazon.com",
    "paypal.com",
    "stripe.com",
    "facebook.com",
    "instagram.com",
    "whatsapp.com",
    "netflix.com",
    "openai.com",
    "chatgpt.com",
    "claude.ai",
    "github.com",
    "chase.com",
    "bankofamerica.com"
  ];

  const defaults = {
    clipboardShield: true,
    showPageBadge: true,
    shoppingMode: true,
    sensitivity: "normal"
  };

  function parseRgb(input) {
    if (!input || input === "transparent") return null;
    const m = String(input).match(
      /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/
    );
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }

  function colorDist(a, b) {
    if (!a || !b) return 999;
    const dr = a[0] - b[0];
    const dg = a[1] - b[1];
    const db = a[2] - b[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function isHidden(el, style, text) {
    if (!el || !style) return false;
    if (style.display === "none" || style.visibility === "hidden") return true;
    if (parseFloat(style.opacity) === 0) return true;
    if (parseFloat(style.fontSize) === 0) return true;
    if (parseFloat(style.height) === 0 && text.length > 24) return true;
    if ((style.clip || "").includes("rect(0") && text.length > 24) return true;

    const color = parseRgb(style.color);
    let bg = parseRgb(style.backgroundColor);
    let node = el.parentElement;
    while (!bg && node && node !== document.documentElement) {
      bg = parseRgb(getComputedStyle(node).backgroundColor);
      node = node.parentElement;
    }
    if (colorDist(color, bg) < 28 && text.length > 40) return true;

    try {
      const rect = el.getBoundingClientRect();
      if (text.length > 48) {
        if (rect.width < 2 && rect.height < 2) return true;
        if (rect.bottom < -80 || rect.right < -80) return true;
        if (rect.top > innerHeight + 200 && rect.height < 4) return true;
      }
    } catch (_) {
      /* ignore */
    }
    return false;
  }

  function walkHiddenText(rootEl, limit) {
    const out = [];
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const t = node.nodeValue && node.nodeValue.trim();
        if (!t || t.length < 12) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let n = 0;
    while (walker.nextNode() && n < limit) {
      const node = walker.currentNode;
      const text = node.nodeValue.trim();
      const el = node.parentElement;
      const style = getComputedStyle(el);
      if (isHidden(el, style, text)) {
        out.push(text.slice(0, 280));
        n += 1;
      }
    }
    return out;
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = [];
    for (let i = 0; i <= b.length; i += 1) m[i] = [i];
    for (let j = 0; j <= a.length; j += 1) m[0][j] = j;
    for (let i = 1; i <= b.length; i += 1) {
      for (let j = 1; j <= a.length; j += 1) {
        m[i][j] =
          b.charAt(i - 1) === a.charAt(j - 1)
            ? m[i - 1][j - 1]
            : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
      }
    }
    return m[b.length][a.length];
  }

  function lookalikeHost(host) {
    const h = (host || "").replace(/^www\./, "").toLowerCase();
    if (!h) return null;
    for (const brand of BRANDS) {
      if (h === brand) return null;
      if (h.endsWith("." + brand)) return null;
      const dist = levenshtein(h, brand);
      if (dist > 0 && dist <= 2 && Math.abs(h.length - brand.length) <= 2) {
        return brand;
      }
    }
    return null;
  }

  function countMatches(text, re) {
    if (!text) return 0;
    const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
    const copy = new RegExp(re.source, flags);
    const found = text.match(copy);
    return found ? found.length : 0;
  }

  function collectPrices(doc) {
    const struck = [];
    const nodes = doc.querySelectorAll("s, strike, del, [class*='compare'], [class*='original']");
    nodes.forEach((el) => {
      const t = (el.innerText || "").trim();
      if (/\$\s?\d/.test(t) || /₹\s?\d/.test(t) || /€\s?\d/.test(t)) {
        struck.push(t.slice(0, 40));
      }
    });
    return struck.slice(0, 6);
  }

  function countdownHits(doc) {
    const els = doc.querySelectorAll(
      "[class*='countdown'], [class*='timer'], [id*='countdown'], [id*='timer']"
    );
    return els.length;
  }

  function precheckedExtras(doc) {
    const boxes = [...doc.querySelectorAll('input[type="checkbox"]')];
    return boxes.filter((b) => {
      if (!b.checked) return false;
      const label = (
        (b.closest("label") && b.closest("label").innerText) ||
        (b.labels && b.labels[0] && b.labels[0].innerText) ||
        ""
      ).toLowerCase();
      return /protect|insurance|warranty|newsletter|sms|addon|add-on|donation|tip/.test(
        label
      );
    }).length;
  }

  function slopScore(text) {
    const lower = (text || "").toLowerCase();
    let hits = 0;
    SLOP_PHRASES.forEach((p) => {
      if (lower.includes(p)) hits += 1;
    });
    return hits;
  }

  function sanitizeCopied(text, extraHidden) {
    const visible = String(text || "");
    const hidden = (extraHidden || []).join("\n");
    const stripped = visible
      .split("\n")
      .filter((line) => !INJECTION_RE.test(line))
      .join("\n")
      .trim();
    const hiddenHit = INJECTION_RE.test(hidden);
    const visibleHit = INJECTION_RE.test(visible);
    return {
      text: stripped || visible,
      stripped: hiddenHit || (visibleHit && stripped !== visible.trim())
    };
  }

  function scan(doc, loc, settings) {
    const conf = Object.assign({}, defaults, settings || {});
    const findings = [];
    const body = doc.body;
    if (!body) {
      return emptyResult(loc);
    }

    const visible = (body.innerText || "").slice(0, 80000);
    const full = (body.textContent || "").slice(0, 120000);
    const hiddenChunks = walkHiddenText(body, conf.sensitivity === "strict" ? 80 : 40);
    const hiddenBlob = hiddenChunks.join("\n");
    const extraLen = Math.max(0, full.length - visible.length);

    if (INJECTION_RE.test(hiddenBlob) || INJECTION_RE.test(full) && !INJECTION_RE.test(visible)) {
      findings.push({
        id: "prompt_injection",
        severity: "critical",
        title: "Hidden instructions for AI agents",
        detail:
          "This page hides text that tries to hijack ChatGPT, Claude, shopping agents, or anything that reads the DOM. Classic 2026 trap."
      });
    } else if (INJECTION_RE.test(visible)) {
      findings.push({
        id: "prompt_injection_visible",
        severity: "high",
        title: "Page asks models to ignore their rules",
        detail: "Visible copy includes jailbreak-style instructions. Treat any AI summary of this page as hostile."
      });
    }

    if (hiddenChunks.length >= 2 || extraLen > 900) {
      findings.push({
        id: "hidden_text",
        severity: findings.some((f) => f.id.startsWith("prompt")) ? "high" : "medium",
        title: "Invisible text on the page",
        detail:
          extraLen > 900
            ? "A lot of copy exists in the HTML that never appears on screen. That is how agents get different information than you do."
            : "Bonfire found text that is faded, off-screen, or sized to zero."
      });
    }

    const lookalike = lookalikeHost(loc && loc.hostname);
    if (lookalike) {
      findings.push({
        id: "lookalike",
        severity: "critical",
        title: "Lookalike domain",
        detail: `This host is suspiciously close to ${lookalike}. Do not enter passwords, cards, or wallet seeds.`
      });
    }

    const urg = countMatches(visible, URGENCY_RE) + countdownHits(doc);
    if (urg >= 1) {
      findings.push({
        id: "fake_urgency",
        severity: urg >= 3 ? "high" : "medium",
        title: "Urgency pressure",
        detail: "Timers, 'only X left', or expiry language. Often recycled theater, not real inventory."
      });
    }

    if (SOCIAL_RE.test(visible)) {
      findings.push({
        id: "fake_social",
        severity: "medium",
        title: "Live social proof that probably is not live",
        detail: "Name-drop purchases and viewer counts are cheap to fake and usually are."
      });
    }

    if (SHAME_RE.test(visible)) {
      findings.push({
        id: "confirmshame",
        severity: "medium",
        title: "Confirmshaming",
        detail: "The decline button insults you. That is a dark pattern, not a deal."
      });
    }

    if (conf.shoppingMode) {
      const struck = collectPrices(doc);
      if (struck.length) {
        findings.push({
          id: "fake_discount",
          severity: "medium",
          title: "Compare-at pricing",
          detail: `Struck-through prices (${struck.slice(0, 2).join(", ")}) are often invented anchors, not a real last price.`
        });
      }
      if (SUB_RE.test(visible)) {
        findings.push({
          id: "subscription_trap",
          severity: "high",
          title: "Trial that turns into a subscription",
          detail: "Free-trial language plus auto-renew. Read the interval and the cancel path before you pay."
        });
      }
      const extras = precheckedExtras(doc);
      if (extras) {
        findings.push({
          id: "prechecked",
          severity: "medium",
          title: "Pre-checked extras at checkout",
          detail: "Warranty, tips, or lists are already ticked. Uncheck before you tap pay."
        });
      }
    }

    const slop = slopScore(visible);
    if (slop >= 3) {
      findings.push({
        id: "ai_slop",
        severity: "low",
        title: "Reads like generated filler",
        detail: "Stock LLM phrases stacked together. Not proof it is fake — but treat claims as unverified."
      });
    }

    if ((loc.protocol || "") === "http:") {
      findings.push({
        id: "insecure",
        severity: "high",
        title: "Not encrypted",
        detail: "HTTP page. Anything you type can be read on the wire."
      });
    }

    let score = 100;
    const weights = {
      critical: 34,
      high: 16,
      medium: 9,
      low: 4
    };
    const seen = new Set();
    findings.forEach((f) => {
      if (seen.has(f.id)) return;
      seen.add(f.id);
      score -= weights[f.severity] || 8;
    });
    if (conf.sensitivity === "strict") score -= findings.length >= 3 ? 4 : 0;
    score = Math.max(0, Math.min(100, score));

    return {
      url: loc.href,
      host: loc.hostname,
      scannedAt: Date.now(),
      score,
      label: labelFor(score),
      findings,
      hiddenSample: (
        hiddenChunks.filter((chunk) => INJECTION_RE.test(chunk)).concat(hiddenChunks)
      ).filter((chunk, i, arr) => arr.indexOf(chunk) === i).slice(0, 8),
      stats: {
        hiddenChunks: hiddenChunks.length,
        extraChars: extraLen,
        urgencyHits: urg
      }
    };
  }

  function labelFor(score) {
    if (score >= 85) return "Looks fine";
    if (score >= 65) return "Be careful";
    if (score >= 40) return "Lots of traps";
    return "Danger";
  }

  function emptyResult(loc) {
    return {
      url: (loc && loc.href) || "",
      host: (loc && loc.hostname) || "",
      scannedAt: Date.now(),
      score: 100,
      label: "Looks fine",
      findings: [],
      hiddenSample: [],
      stats: { hiddenChunks: 0, extraChars: 0, urgencyHits: 0 }
    };
  }

  root.BonfireScanner = {
    defaults,
    scan,
    sanitizeCopied,
    INJECTION_RE
  };
})(typeof window !== "undefined" ? window : self);
