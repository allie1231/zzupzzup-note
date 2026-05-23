import { createClip } from "./shared/schema.js";
import { saveClip } from "./data-writer.js";

chrome.runtime.onInstalled.addListener(() => {
  registerContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  registerContextMenus();
});

function registerContextMenus() {
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      console.warn("줍줍노트 메뉴 초기화 실패:", chrome.runtime.lastError.message);
    }
    createContextMenus();
  });
}

function createContextMenus() {
  chrome.contextMenus.create({
    id: "collect-sentence",
    title: "문장/링크 줍줍하기",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "collect-page",
    title: "현재 페이지 링크 줍줍하기",
    contexts: ["page"]
  });
  chrome.contextMenus.create({
    id: "collect-link",
    title: "링크 줍줍하기",
    contexts: ["link"]
  });
  chrome.contextMenus.create({
    id: "collect-image",
    title: "이미지 줍줍하기",
    contexts: ["image"]
  });
  chrome.contextMenus.create({
    id: "collect-video",
    title: "동영상 줍줍하기",
    contexts: ["video"]
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "collect-sentence") {
    await collectSentenceWithoutPopup({
      contentType: "문장",
      sentence: info.selectionText || "",
      source: info.pageUrl || tab?.url || "",
      title: tab?.title || "",
      iconUrl: tab?.favIconUrl || ""
    });
    return;
  }

  if (info.menuItemId === "collect-page") {
    await setPendingClip({
      contentType: "링크",
      sentence: "",
      source: info.pageUrl || tab?.url || "",
      title: tab?.title || "",
      iconUrl: tab?.favIconUrl || ""
    });
    await openPopupIfPossible();
    return;
  }

  if (info.menuItemId === "collect-link") {
    await setPendingClip({
      contentType: "링크",
      sentence: info.linkText || "",
      source: info.linkUrl || info.pageUrl || tab?.url || "",
      title: tab?.title || "",
      iconUrl: tab?.favIconUrl || ""
    });
    await openPopupIfPossible();
    return;
  }

  if (info.menuItemId === "collect-image") {
    await collectImage(info, tab);
    return;
  }

  if (info.menuItemId === "collect-video") {
    await setPendingClip({
      contentType: "동영상",
      sentence: "",
      source: info.srcUrl || info.pageUrl || tab?.url || "",
      title: tab?.title || "",
      iconUrl: tab?.favIconUrl || ""
    });
    await openPopupIfPossible();
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === "collect-page") {
    await setPendingClip({
      contentType: "링크",
      sentence: "",
      source: tab.url || "",
      title: tab.title || "",
      iconUrl: tab.favIconUrl || ""
    });
    await openPopupIfPossible();
    return;
  }

  if (command !== "collect-selection") return;

  const [{ result } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection()?.toString() || ""
  });

  await collectSentenceWithoutPopup({
    contentType: "문장",
    sentence: result || "",
    source: tab.url || "",
    title: tab.title || "",
    iconUrl: tab.favIconUrl || ""
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "selection-captured") return false;
  collectSentenceWithoutPopup({
    contentType: "문장",
    sentence: message.sentence || "",
    source: sender.tab?.url || "",
    title: sender.tab?.title || "",
    iconUrl: sender.tab?.favIconUrl || ""
  })
    .then(() => sendResponse({ ok: true }));
  return true;
});

async function collectSentenceWithoutPopup({ contentType = "문장", sentence, source, title, iconUrl }) {
  const pending = {
    contentType,
    sentence,
    source,
    title,
    siteName: deriveSiteName(source),
    iconUrl
  };
  try {
    await saveClip(createClip({
      ...pending,
      reason: "",
      connection: "",
      useFor: "정리필요",
      action: "정리필요",
      tags: "#문장",
      status: "새로 수집"
    }));
    await flashBadge("OK", "#111111");
  } catch (error) {
    console.warn("문장 바로 저장 실패:", error);
    await chrome.storage.local.set({ pendingClip: pending });
    await flashBadge("ERR", "#9b111e");
    await openPopupIfPossible();
  }
}

async function setPendingClip({ contentType = "링크", sentence, source, title, iconUrl }) {
  await chrome.storage.local.set({
    pendingClip: {
      contentType,
      sentence,
      source,
      title,
      siteName: deriveSiteName(source),
      iconUrl
    }
  });
}

async function setPendingImage({ imageUrl, source, title, iconUrl }) {
  await chrome.storage.local.set({
    pendingClip: {
      sentence: "",
      contentType: "이미지",
      reason: "이미지 스크랩",
      connection: "",
      useFor: "정리필요",
      action: "정리필요",
      source,
      title,
      siteName: deriveSiteName(source),
      iconUrl,
      imageUrl,
      tags: "#이미지 #스크랩"
    }
  });
}

function deriveSiteName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function openPopupIfPossible() {
  if (chrome.action.openPopup) {
    try {
      await chrome.action.openPopup();
      return;
    } catch {
      await openPopupWindow();
    }
    return;
  }
  await openPopupWindow();
}

async function openPopupWindow() {
  await chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 440,
    height: 720,
    focused: true
  });
}

async function flashBadge(text, color) {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
  }, 1200);
}

async function collectImage(info, tab) {
  const source = info.pageUrl || tab?.url || "";
  await setPendingImage({
    imageUrl: info.srcUrl || "",
    source,
    title: tab?.title || "",
    iconUrl: tab?.favIconUrl || ""
  });
  await openPopupIfPossible();
}
