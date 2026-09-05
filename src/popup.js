async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stateFor(score) {
  if (score >= 85) return "ok";
  if (score >= 40) return "idle";
  return "danger";
}

function statusLine(result) {
  const n = result.findings.length;
  if (n === 0) return "Nothing flagged";
  if (result.score < 40) return n === 1 ? "1 issue · treat as unsafe" : `${n} issues · treat as unsafe`;
  if (result.score < 85) return n === 1 ? "1 issue" : `${n} issues`;
  return "Looks clear";
}

function blockedReason(tab) {
  const url = (tab && tab.url) || "";
  if (!url || /^(chrome|edge|about|chrome-extension):/i.test(url) || /chromewebstore\.google\.com/i.test(url)) {
    return "Chrome blocks extensions on this tab. Open a normal website.";
  }
  if (url.startsWith("file:")) {
    return "Local file. Serve it over http, or allow file access in extension details.";
  }
  if (!/^https?:/i.test(url)) {
    return "Only http and https pages can be checked.";
  }
  return "This tab was open before Bonfire loaded.";
}

function hostName(tab, result) {
  if (result && result.host) return result.host;
  try {
    return new URL(tab.url).hostname || tab.url;
  } catch (_) {
    return (tab && tab.url) || "No tab";
  }
}

function paint(result, tab) {
  const scoreEl = document.getElementById("score");
  const labelEl = document.getElementById("label");
  const hostEl = document.getElementById("host");
  const explain = document.getElementById("explain");
  const gauge = document.getElementById("gauge");
  const thumb = document.getElementById("thumb");
  const block = document.getElementById("scoreBlock");
  const findingsEl = document.getElementById("findings");
  const empty = document.getElementById("empty");
  const banner = document.getElementById("banner");
  const openDemo = document.getElementById("openDemo");
  const scanPage = document.getElementById("scanPage");

  hostEl.textContent = hostName(tab, result);
  hostEl.title = (tab && tab.url) || "";

  if (!result) {
    block.dataset.state = "idle";
    scoreEl.textContent = "—";
    labelEl.textContent = "Can’t check this tab";
    explain.hidden = false;
    explain.textContent = blockedReason(tab);
    gauge.hidden = true;
    findingsEl.innerHTML = "";
    empty.hidden = true;
    banner.hidden = true;
    openDemo.hidden = false;
    const url = (tab && tab.url) || "";
    scanPage.hidden = !/^https?:/i.test(url);
    return;
  }

  openDemo.hidden = true;
  scanPage.hidden = true;
  explain.hidden = true;
  gauge.hidden = false;
  block.dataset.state = stateFor(result.score);
  scoreEl.textContent = String(result.score);
  labelEl.textContent = statusLine(result);
  thumb.style.setProperty("--p", `${result.score}%`);

  const hostile = result.findings.find(
    (f) => f.id === "prompt_injection" || f.id === "lookalike"
  );
  banner.hidden = !hostile;
  banner.textContent = hostile ? "Hidden text here is written for an AI, not for you." : "";

  findingsEl.innerHTML = result.findings
    .map(
      (f) => `<li class="${f.severity}"><h3>${escapeHtml(f.title)}</h3><p>${escapeHtml(
        f.detail
      )}</p></li>`
    )
    .join("");
  empty.hidden = result.findings.length > 0;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function loadHistory() {
  const rows = await chrome.runtime.sendMessage({ type: "bonfire:history" });
  const wrap = document.getElementById("historyWrap");
  const list = document.getElementById("history");
  if (!rows || !rows.length) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  list.innerHTML = rows
    .slice(0, 5)
    .map((row) => {
      const w = Math.max(2, Number(row.score) || 0);
      return `<li>
        <span>${escapeHtml(row.host)}</span>
        <span class="mini" aria-hidden="true"><i style="width:${w}%"></i></span>
        <b>${row.score}</b>
      </li>`;
    })
    .join("");
}

async function loadStrips() {
  const data = await chrome.storage.local.get({ bonfireStrips: 0 });
  const n = data.bonfireStrips || 0;
  const el = document.getElementById("strips");
  el.textContent = n === 0 ? "Idle" : n === 1 ? "1 copy cleaned" : `${n} copies cleaned`;
}

async function askTab(tabId, type) {
  return chrome.tabs.sendMessage(tabId, { type });
}

async function injectAndAsk(tabId) {
  const injected = await chrome.runtime.sendMessage({ type: "bonfire:inject", tabId });
  if (!injected || !injected.ok) {
    throw new Error(injected && injected.error ? injected.error : "inject failed");
  }
  await sleep(200);
  try {
    return await askTab(tabId, "bonfire:rescan");
  } catch (_) {
    await sleep(300);
    return askTab(tabId, "bonfire:get");
  }
}

async function requestScan(forceInject) {
  const tab = await currentTab();
  if (!tab || tab.id == null) {
    paint(null, tab);
    return;
  }
  if (!/^https?:/i.test(tab.url || "")) {
    paint(null, tab);
    return;
  }
  try {
    if (forceInject) {
      paint(await injectAndAsk(tab.id), tab);
      return;
    }
    try {
      await askTab(tab.id, "bonfire:ping");
    } catch (_) {
      paint(await injectAndAsk(tab.id), tab);
      return;
    }
    const result = await askTab(tab.id, "bonfire:rescan");
    paint(result, tab);
  } catch (_) {
    paint(null, tab);
  }
}

document.getElementById("rescan").addEventListener("click", () => requestScan(true));
document.getElementById("scanPage").addEventListener("click", () => requestScan(true));
document.getElementById("openDemo").addEventListener("click", () => {
  chrome.tabs.create({ url: "http://127.0.0.1:8765/trap-page.html" });
});
document.querySelector("footer a").addEventListener("click", (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
});

requestScan(false);
loadHistory();
loadStrips();
