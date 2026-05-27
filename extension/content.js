let button;
let lastSelection = "";

document.addEventListener("selectionchange", () => {
  const selection = window.getSelection()?.toString().trim() || "";
  lastSelection = selection;
  if (selection.length < 2) {
    hideButton();
    return;
  }
  showButton();
});

function showButton() {
  if (!button) {
    button = document.createElement("button");
    button.textContent = "줍줍하기";
    button.style.cssText = [
      "position:fixed",
      "right:18px",
      "bottom:18px",
      "z-index:2147483647",
      "border:0",
      "border-radius:999px",
      "padding:9px 12px",
      "font:13px system-ui,sans-serif",
      "border:2px solid #111",
      "background:#e1e1df",
      "color:#111",
      "box-shadow:none",
      "cursor:pointer"
    ].join(";");
    button.addEventListener("click", async () => {
      if (!lastSelection) return;
      await chrome.runtime.sendMessage({ type: "selection-captured", sentence: lastSelection });
      button.textContent = "줍줍 완료";
      setTimeout(() => {
        button.textContent = "줍줍하기";
        hideButton();
      }, 1200);
    });
    document.documentElement.append(button);
  }
  button.hidden = false;
}

function hideButton() {
  if (button) button.hidden = true;
}
