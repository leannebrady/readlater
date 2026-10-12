import { savePage } from "./api.js";

async function flash(tabId, text, color) {
  await chrome.action.setBadgeBackgroundColor({ color, tabId });
  await chrome.action.setBadgeText({ text, tabId });
  setTimeout(() => chrome.action.setBadgeText({ text: "", tabId }), 2500);
}

async function saveTab(tab) {
  try {
    await savePage(tab.url, tab.title);
    flash(tab.id, "OK", "#1d5c63");
  } catch {
    flash(tab.id, "ERR", "#b3361f");
  }
}

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "save-page") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) saveTab(tab);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "save-link", title: "Save link to ReadLater", contexts: ["link"] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "save-link") return;
  try {
    await savePage(info.linkUrl);
    flash(tab.id, "OK", "#1d5c63");
  } catch {
    flash(tab.id, "ERR", "#b3361f");
  }
});
