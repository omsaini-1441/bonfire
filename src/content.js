(() => {
  if (window.__bonfireInjected) return;
  window.__bonfireInjected = true;

  const HOST_ID = "bonfire-root";
  let settings = { ...BonfireScanner.defaults };
  let lastResult = null;
  let panelOpen = false;
  let root = null;
  let shadow = null;

  function $(sel) {
    return shadow && shadow.querySelector(sel);
  }

  async function loadSettings() {
    const stored = await chrome.storage.sync.get(BonfireScanner.defaults);
    settings = { ...BonfireScanner.defaults, ...stored };
  }

  function runScan() {
    lastResult = BonfireScanner.scan(document, location, settings);
    chrome.runtime.sendMessage({ type: "bonfire:result", result: lastResult }).catch(() => {});
    render();
  }

  async function mount() {
    if (document.getElementById(HOST_ID)) {
      shadow = document.getElementById(HOST_ID).shadowRoot;
      return;
    }
    root = document.createElement("div");
    root.id = HOST_ID;
    root.setAttribute("data-bonfire", "1");
    shadow = root.attachShadow({ mode: "open" });
    let css = "";
    try {
      css = await fetch(chrome.runtime.getURL("src/content.css")).then((r) => r.text());
    } catch (_) {
      css = ".bf-badge{position:fixed;right:16px;bottom:16px;z-index:2147483646;background:#120a06;color:#fff;border-radius:999px;padding:8px 12px;border:1px solid #ff6b2b;}";
    }
    shadow.innerHTML = `<style>${css}</style>
      <div class="bf-wrap">
        <div class="bf-toast" hidden></div>
        <div class="bf-panel" hidden></div>
        <button type="button" class="bf-badge" aria-label="Open Bonfire"></button>
      </div>`;
    (document.documentElement || document.body).appendChild(root);
    $(".bf-badge").addEventListener("click", () => {
      panelOpen = !panelOpen;
      render();
    });
  }

  function render() {
    if (!shadow || !lastResult) return;
    const badge = $(".bf-badge");
    const panel = $(".bf-panel");
    if (!settings.showPageBadge) {
      badge.hidden = true;
      panel.hidden = true;
      return;
    }
    badge.hidden = false;
    badge.classList.toggle("hostile", lastResult.score < 50);
    badge.innerHTML = `<span class="bf-score">${lastResult.score}</span><span class="bf-unit">/ 100</span>`;

    panel.hidden = !panelOpen;
    if (!panelOpen) return;

    const items = lastResult.findings
      .map(
        (f) => `<li class="bf-item ${f.severity}">
          <h4>${escapeHtml(f.title)}</h4>
          <p>${escapeHtml(f.detail)}</p>
        </li>`
      )
      .join("");

    const n = lastResult.findings.length;
    const status =
      n === 0 ? "Nothing flagged" : n === 1 ? "1 issue" : `${n} issues`;

    panel.innerHTML = `
      <p class="bf-title">${lastResult.score}<span class="bf-unit"> / 100</span></p>
      <p class="bf-sub">${escapeHtml(status)} · 0 unsafe → 100 clear</p>
      <div class="bf-track"><i class="bf-thumb" style="left:${lastResult.score}%"></i></div>
      ${
        items
          ? `<ul class="bf-list">${items}</ul>`
          : `<p class="bf-empty">No issues on this page.</p>`
      }`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toast(msg) {
    const el = $(".bf-toast");
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => {
      el.hidden = true;
    }, 4200);
  }

  document.addEventListener(
    "copy",
    (event) => {
      if (!settings.clipboardShield) return;
      const selection = window.getSelection && window.getSelection().toString();
      if (!selection) return;
      const hidden = (lastResult && lastResult.hiddenSample) || [];
      const cleaned = BonfireScanner.sanitizeCopied(selection, hidden);
      if (!cleaned.stripped) return;
      event.preventDefault();
      event.clipboardData.setData("text/plain", cleaned.text);
      toast("Removed hidden instructions from what you copied.");
      chrome.runtime.sendMessage({ type: "bonfire:stripped" });
    },
    true
  );

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "bonfire:ping") {
      sendResponse({ ok: true, hasResult: Boolean(lastResult) });
      return;
    }
    if (msg && msg.type === "bonfire:get") {
      if (!lastResult) runScan();
      sendResponse(lastResult);
      return;
    }
    if (msg && msg.type === "bonfire:toggle") {
      panelOpen = !panelOpen;
      render();
      sendResponse({ open: panelOpen });
      return;
    }
    if (msg && msg.type === "bonfire:rescan") {
      runScan();
      sendResponse(lastResult);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    Object.keys(changes).forEach((key) => {
      settings[key] = changes[key].newValue;
    });
    render();
  });

  let scanTimer = 0;
  const observer = new MutationObserver(() => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(runScan, 900);
  });

  (async function init() {
    try {
      await loadSettings();
      await mount();
      runScan();
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: false
      });
    } catch (err) {
      console.warn("Bonfire failed to start on this page", err);
    }
  })();
})();
