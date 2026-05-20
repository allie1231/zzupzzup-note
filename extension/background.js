chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "collect-sentence",
    title: "주운 글 줍기",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "collect-page",
    title: "현재 페이지 링크 줍기",
    contexts: ["page"]
  });
  chrome.contextMenus.create({
    id: "collect-link",
    title: "링크 줍기",
    contexts: ["link"]
  });
  chrome.contextMenus.create({
    id: "collect-image",
    title: "이미지 줍기",
    contexts: ["image"]
  });
  chrome.contextMenus.create({
    id: "collect-video",
    title: "동영상 줍기",
    contexts: ["video"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "collect-sentence") {
    await setPendingClip({
      contentType: "자료",
      sentence: info.selectionText || "",
      source: info.pageUrl || tab?.url || "",
      title: tab?.title || "",
      iconUrl: tab?.favIconUrl || ""
    });
    await openPopupIfPossible();
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

  await setPendingClip({
    contentType: "자료",
    sentence: result || "",
    source: tab.url || "",
    title: tab.title || "",
    iconUrl: tab.favIconUrl || ""
  });
  await openPopupIfPossible();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "selection-captured") return false;
  setPendingClip({
    contentType: "자료",
    sentence: message.sentence || "",
    source: sender.tab?.url || "",
    title: sender.tab?.title || "",
    iconUrl: sender.tab?.favIconUrl || ""
  })
    .then(() => sendResponse({ ok: true }));
  return true;
});

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
      useFor: "아이디어",
      action: "연결",
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
    } catch {
      // Some Chrome versions only allow this from specific user gestures.
      // The pending clip remains stored, so clicking the extension still opens it.
    }
  }
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
