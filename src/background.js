const HISTORY_KEY = "bonfireHistory";
const STRIP_KEY = "bonfireStrips";
const HISTORY_LIMIT = 5;

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#2a2926" });
  chrome.storage.local.get({ [HISTORY_KEY]: [] }, (data) => {
    const trimmed = (data[HISTORY_KEY] || []).slice(0, HISTORY_LIMIT).map(slim);
    chrome.storage.local.set({ [HISTORY_KEY]: trimmed });
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "bonfire:result" && msg.result) {
    const tabId = sender.tab && sender.tab.id;
    paintBadge(tabId, msg.result);
    remember(msg.result);
    sendResponse({ ok: true });
    return true;
  }
  if (msg && msg.type === "bonfire:stripped") {
    chrome.storage.local.get({ [STRIP_KEY]: 0 }, (data) => {
      chrome.storage.local.set({ [STRIP_KEY]: (data[STRIP_KEY] || 0) + 1 });
    });
  }
  if (msg && msg.type === "bonfire:history") {
    chrome.storage.local.get({ [HISTORY_KEY]: [] }, (data) => {
      sendResponse(data[HISTORY_KEY] || []);
    });
    return true;
  }
  if (msg && msg.type === "bonfire:clear-history") {
    chrome.storage.local.set({ [HISTORY_KEY]: [], [STRIP_KEY]: 0 }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg && msg.type === "bonfire:inject") {
    const tabId = msg.tabId;
    inject(tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-panel") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) return;
  try {
    await inject(tab.id);
    chrome.tabs.sendMessage(tab.id, { type: "bonfire:toggle" }).catch(() => {});
  } catch (_) {
    /* chrome:// and similar */
  }
});

async function inject(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["src/scanner.js", "src/content.js"]
  });
}

function paintBadge(tabId, result) {
  if (tabId == null) return;
  const text = result.score < 100 ? String(result.score) : "";
  chrome.action.setBadgeText({ tabId, text });
  const color =
    result.score >= 85 ? "#7d9a86" : result.score >= 40 ? "#8a6a48" : "#c45c4a";
  chrome.action.setBadgeBackgroundColor({ tabId, color });
}

function slim(row) {
  return {
    host: row.host,
    score: row.score,
    count: row.count,
    scannedAt: row.scannedAt
  };
}

function remember(result) {
  chrome.storage.local.get({ [HISTORY_KEY]: [] }, (data) => {
    const next = [
      slim({
        host: result.host,
        score: result.score,
        count: result.findings.length,
        scannedAt: result.scannedAt
      }),
      ...(data[HISTORY_KEY] || []).filter((row) => row.host !== result.host)
    ].slice(0, HISTORY_LIMIT);
    chrome.storage.local.set({ [HISTORY_KEY]: next });
  });
}
