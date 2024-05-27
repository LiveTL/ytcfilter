import { getFrameInfoAsync, isValidFrameInfo, frameIsReplay, createPopup } from '../ts/chat-utils';
import { detectForceReload } from '../ts/ytcf-logic';
import { isLiveTL, isAndroid } from '../ts/chat-constants';
import {
  // hcEnabled,
  autoLiveChat,
  filterInBackground,
  initialSetupDone,
  autoOpenFilterPanel
} from '../ts/storage';
import {
  initInterceptor,
  processMessageChunk,
  processSentMessage,
  setInitialData,
  updatePlayerProgress,
  setTheme
} from '../ts/messaging';
import YtcFilterButtons from '../components/YtcFilterButtons.svelte';

// import { parseMessageRuns } from '../ts/chat-parser';
// import { stringifyRuns } from '../ts/ytcf-logic';

// const isFirefox = navigator.userAgent.includes('Firefox');

// const hcWarning = 'An existing HyperChat button has been detected. This ' +
//   'usually means both LiveTL and standalone HyperChat are enabled. ' +
//   'LiveTL already includes HyperChat, so please enable only one of them.\n\n' +
//   'Having multiple instances of the same scripts running WILL cause ' +
//   'problems such as chat messages not loading.';

const chatLoaded = async (): Promise<void> => {
  detectForceReload();

  // if (!isLiveTL && checkInjected(hcWarning)) return;

  const metagetter = document.createElement('script');
  metagetter.src = chrome.runtime.getURL('scripts/chat-metagetter.js');
  const ytcfg: any = await new Promise((resolve) => {
    window.addEventListener('fetchMeta', (event) => {
      resolve(JSON.parse((event as any).detail as string));
    });
    document.body.appendChild(metagetter);
  });

  // Init and inject interceptor
  initInterceptor('ytc', ytcfg, frameIsReplay());
  window.addEventListener('messageReceive', (d) => {
    processMessageChunk((d as CustomEvent).detail);
  });
  window.addEventListener('messageSent', (d) => {
    processSentMessage((d as CustomEvent).detail);
  });
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('scripts/chat-interceptor.js');
  document.body.appendChild(script);

  // Handle initial data
  const scripts = document.querySelectorAll('script');
  // if (!scripts) {
  //   console.error('Unable to get script elements.');
  //   return;
  // }
  let json = '{}';
  for (const script of Array.from(scripts)) {
    const start = 'window["ytInitialData"] = ';
    const text = script.text;
    if (!text || !text.startsWith(start)) {
      continue;
    }
    json = text.replace(start, '').slice(0, -1);
    break;
  }
  window.addEventListener('videoInfoYtcFilter', d => {
    setInitialData(json, JSON.parse((d as CustomEvent).detail));
  });

  // Catch YT messages
  window.addEventListener('message', (d) => {
    if (d.data['yt-player-video-progress'] != null) {
      updatePlayerProgress(d.data['yt-player-video-progress']);
    }
  });

  // Update dark theme whenever it changes
  let wasDark: boolean | undefined;
  const html = document.documentElement;
  const sendTheme = (): void => {
    const isDark = html.hasAttribute('dark');
    if (isDark === wasDark) return;
    setTheme(isDark);
    wasDark = isDark;
  };
  new MutationObserver(sendTheme).observe(html, {
    attributes: true
  });
  sendTheme();

  document.body.style.minWidth = document.body.style.minHeight = '0px';
  // const hyperChatEnabled = await hcEnabled.get();

  // Inject HC button
  const ytcPrimaryContent = document.querySelector('#chat-messages');
  if (!ytcPrimaryContent) {
    console.error('Failed to find #chat-messages');
    return;
  }
  const immediateChild = document.createElement('div');
  ytcPrimaryContent.prepend(immediateChild);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const ytcfButton = new YtcFilterButtons({
    target: immediateChild
  });

  // Everything past this point will only run if HC is enabled
  // if (!hyperChatEnabled) return;

  const frameInfo = await getFrameInfoAsync();
  if (!isValidFrameInfo(frameInfo)) {
    console.error('Failed to get valid frame info', { frameInfo });
    return;
  }
  const params = new URLSearchParams();
  params.set('tabid', frameInfo.tabId.toString());
  params.set('frameid', frameInfo.frameId.toString());
  params.set('continuation', new URLSearchParams(window.location.search).get('continuation') ?? '');
  if (frameIsReplay()) params.set('isReplay', 'true');
  // inject into an empty 404 page
  const source = `https://www.youtube.com/embed/ytcfilter_embed?${params.toString()}`;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const ytcfilterElement = document.querySelector('.ytcf-iframe') as HTMLDivElement | null;
  if (!ytcfilterElement) {
    console.error('Failed to find .ytcf-iframe');
    return;
  }
  const activatorButton = document.querySelector('.ytcf-launch-button') as HTMLButtonElement;
  const popoutButton = document.querySelector('.ytcf-popout-button') as HTMLButtonElement;
  const settingsButton = document.querySelector('.ytcf-settings-button') as HTMLButtonElement;
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const clickListener = async (forceClose = false): Promise<void> => {
    // activatorButton.style.display = 'none';
    const frame = ytcfilterElement.querySelector('iframe');
    const resizeBar = document.querySelector('.ytcf-resize-bar') as HTMLDivElement;
    if (forceClose || ytcfilterElement.style.display === 'block') {
      ytcfilterElement.style.display = 'none';
      resizeBar.style.display = 'none';
      ytcfilterElement.style.display = 'none';
      if (frame && (forceClose || !(await filterInBackground.get()))) {
        frame.src = 'about:blank';
      }
      return;
    }
    ytcfilterElement.style.display = 'block';
    resizeBar.style.display = 'flex';
    if (frame && frame.src !== source) {
      frame.src = source;
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  activatorButton.addEventListener('click', async () => await clickListener());
  const iframe = document.createElement('iframe');
  iframe.style.border = '0px';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  if (await filterInBackground.get()) {
    iframe.src = source;
  }
  ytcfilterElement.appendChild(iframe);
  popoutButton.addEventListener('click', () => {
    createPopup(source);
    clickListener(true);
  });
  settingsButton.addEventListener('click', () => {
    createPopup(chrome.runtime.getURL((isLiveTL ? 'ytcfilter' : '') + '/options.html'));
  });

  if (!(await initialSetupDone.get()) || await autoOpenFilterPanel.get()) {
    clickListener();
  }

  return;

  // rest is inherited from hyperchat, is unused

  // eslint-disable-next-line no-unreachable
  const ytcItemList = document.querySelector('#chat>#item-list');
  if (!ytcItemList) {
    console.error('Failed to find #chat>#item-list');
    return;
  }

  // Inject hyperchat
  // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
  // @ts-ignore
  ytcItemList.outerHTML = `
  <iframe id="hyperchat" src="${source}" style="border: 0px; width: 100%; height: 100%;"/>
  `;
  // const hyperchat = document.querySelector('#hyperchat') as HTMLIFrameElement;
  // if (!hyperchat) {
  //   console.error('Failed to find #hyperchat');
  //   return;
  // }
  // if (isFirefox || isLiveTL) {
  //   const scale = 0.8;
  //   const inverse = `${Math.round((1 / scale) * 10000) / 100}%`;
  //   hyperchat.style.transformOrigin = '0px 0px';
  //   hyperchat.style.minWidth = inverse;
  //   hyperchat.style.minHeight = inverse;
  //   hyperchat.style.transform = `scale(${scale})`;
  // }

  // Remove ticker element
  const ytcTicker = document.querySelector('#ticker');
  if (!ytcTicker) {
    console.error('Failed to find #ticker');
    return;
  }
  // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
  // @ts-ignore
  ytcTicker.remove();

  // Hide input panel on android
  if (isAndroid) {
    const inputPanel = document.querySelector('#input-panel');
    if (!inputPanel) return;
    (inputPanel as HTMLElement).style.display = 'none';
  }

  if (await autoLiveChat.get()) {
    const live = document.querySelector<HTMLElement>('tp-yt-paper-listbox#menu > :nth-child(2)');
    if (!live) {
      console.error('Failed to find Live Chat menu item');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    live.click();
  }
};

if (isLiveTL) {
  chatLoaded().catch(console.error);
} else {
  setTimeout(() => {
    chatLoaded().catch(console.error);
  }, 500);
}
