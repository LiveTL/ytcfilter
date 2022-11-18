import { isLiveTL } from '../ts/chat-constants';
import { popoutDims } from '../ts/storage';

chrome.action.onClicked.addListener(() => {
  if (isLiveTL) {
    chrome.tabs.create({ url: 'https://livetl.app' }, () => {});
  } else {
    chrome.tabs.create({ url: 'https://livetl.app/en/hyperchat/' }, () => {});
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getFrameInfo') {
    sendResponse({ tabId: sender.tab?.id, frameId: sender.frameId });
  } else if (request.type === 'createPopup') {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    popoutDims.ready().then(() => {
      const vals = popoutDims.getCurrent();
      try {
        chrome.windows.create({
          url: request.url,
          type: 'popup',
          ...vals
        }, () => {});
      } catch (e) {
        chrome.windows.create({
          url: request.url,
          type: 'popup'
        }, () => {});
      }
    });
  }
});
