const CARD_SELECTOR = [
  ".card",
  ".sentence-card",
  ".entry-card",
  ".memo-card",
  ".clip"
].join(",");

const TEXT_SELECTOR = [
  ".card-body .sentence",
  ".sentence-card blockquote",
  ".entry-card .sentence",
  ".entry-card .reason",
  ".memo-body",
  ".clip blockquote",
  ".clip p"
].join(",");

const BUTTON_CLASS = "card-toggle";

function setupCard(card) {
  if (!(card instanceof HTMLElement) || card.dataset.cardToggleReady === "true") return;
  const target = card.querySelector(TEXT_SELECTOR);
  if (!(target instanceof HTMLElement)) return;

  card.dataset.cardToggleReady = "true";
  target.classList.add("deck-clamp-target");

  requestAnimationFrame(() => {
    if (!shouldToggle(target)) return;
    card.classList.add("has-card-toggle");
    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.textContent = "+ 펼치기";
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const expanded = card.classList.toggle("is-expanded");
      button.textContent = expanded ? "- 접기" : "+ 펼치기";
      button.setAttribute("aria-expanded", String(expanded));
    });
    card.append(button);
  });
}

function shouldToggle(target) {
  const text = target.textContent?.trim() || "";
  if (text.length < 120) return false;
  return target.scrollHeight > target.clientHeight + 2 || text.split(/\n/).length > 5;
}

function scan(root = document) {
  root.querySelectorAll?.(CARD_SELECTOR).forEach(setupCard);
}

scan();

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(CARD_SELECTOR)) setupCard(node);
      scan(node);
    });
  }
});

observer.observe(document.body, { childList: true, subtree: true });
