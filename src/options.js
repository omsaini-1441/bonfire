const form = document.getElementById("form");
const saved = document.getElementById("saved");
const cleared = document.getElementById("cleared");

function flash(el) {
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.hidden = true;
  }, 1400);
}

async function fill() {
  const conf = await chrome.storage.sync.get(BonfireScanner.defaults);
  const merged = { ...BonfireScanner.defaults, ...conf };
  form.clipboardShield.checked = merged.clipboardShield;
  form.showPageBadge.checked = merged.showPageBadge;
  form.shoppingMode.checked = merged.shoppingMode;
  form.sensitivity.value = merged.sensitivity;
}

async function persist() {
  await chrome.storage.sync.set({
    clipboardShield: form.clipboardShield.checked,
    showPageBadge: form.showPageBadge.checked,
    shoppingMode: form.shoppingMode.checked,
    sensitivity: form.sensitivity.value
  });
  flash(saved);
}

form.addEventListener("change", persist);
form.addEventListener("submit", (event) => event.preventDefault());

document.getElementById("clear").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "bonfire:clear-history" });
  flash(cleared);
});

fill();
