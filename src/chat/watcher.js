/*!
 * vtuber-comment-extension v0.9 (https://github.com/clngn/vtuber-comment-extension)
 * Copyright (c) 2018 clngn
 * Licensed under MIT (https://github.com/clngn/vtuber-comment-extension/blob/master/LICENSE)
 */

const nameListKey = "nameList";
const highlightKey = "highlight";
const notificationKey = "notification";

const getStorageData = key => {
  return new Promise(resolve => {
    chrome.storage.local.get(key, value => {
      resolve(value);
    });
  });
};

const selector = {
  getChatDom: () => document.querySelector("yt-live-chat-app")
};

class Watcher {
  constructor(nameList, useHighlight, useNotification, dark) {
    this.liveTitle = "";
    this.ownerName = "";
    this.ownerIconUrl = "";
    this.nameList = nameList;
    this.useHighlight = useHighlight;
    this.useNotification = useNotification;
    this.dark = dark;
  }

  setLiveTitle(liveTitle) {
    this.liveTitle = liveTitle;
  }

  setOwnerName(ownerName) {
    this.ownerName = ownerName;
  }

  setOwnerIconUrl(ownerIconUrl) {
    this.ownerIconUrl = ownerIconUrl;
  }

  getLiveTitle() {
    return this.liveTitle;
  }

  getOwnerName() {
    return this.ownerName;
  }

  getOwnerIconUrl() {
    return this.ownerIconUrl;
  }

  getMessage(el) {
    let messageString = "";

    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        messageString += child.wholeText;
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (
          child.nodeName.toLowerCase() === "img" &&
          typeof child.alt === "string"
        ) {
          messageString += child.alt;
        }
      }
    }
    return messageString;
  }

  async checkComment(node) {
    if (node.nodeName.toLowerCase() !== "yt-live-chat-text-message-renderer") {
      return;
    }

    const authorName = node.querySelector("#author-name").textContent;
    if (!this.nameList.some(value => value === authorName.trim())) {
      node.classList.remove("nmado-highlight-dark", "nmado-highlight")
      return;
    }
    if (this.useHighlight) {
      if (this.dark) {
        node.classList.add("nmado-highlight-dark");
      } else {
        node.classList.add("nmado-highlight");
      }
    }
    if (this.useNotification) {
      const message = this.getMessage(node.querySelector("#message"));
      const iconUrl = node.querySelector("#img").getAttribute("src");
      const iconLargeUrl = iconUrl.replace(/\/photo.jpg$/, "");
      const liveTitle = this.liveTitle;
      const ownerName = this.ownerName;
      const ownerIconUrl = this.ownerIconUrl;
      const data = {
        liveTitle,
        authorName,
        message,
        iconUrl: iconLargeUrl,
        ownerName,
        ownerIconUrl: ownerIconUrl
      };
      chrome.runtime.sendMessage({
        id: "comment",
        data: data
      });
    }
  }
}

const initWatcher = async youtubeId => {
  chrome.runtime.sendMessage({
    id: "request-live-title",
    data: { youtubeId: youtubeId }
  });
  chrome.runtime.sendMessage({
    id: "request-owner-name",
    data: { youtubeId: youtubeId }
  });
  const storageData = await getStorageData([
    nameListKey,
    highlightKey,
    notificationKey
  ]);
  let nameList = storageData[nameListKey];
  let useHighlight = storageData[highlightKey];
  let useNotification = storageData[notificationKey];

  const dark = document.querySelector("html").getAttribute("dark") !== null;
  let watcher = new Watcher(nameList, useHighlight, useNotification, dark);

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(node => watcher.checkComment(node));
    });
  });

  observer.observe(selector.getChatDom(), {
    childList: true,
    subtree: true
  });
  return watcher;
};

export { initWatcher, Watcher };
