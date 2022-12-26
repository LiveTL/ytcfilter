export const getFrameInfoAsync = async (): Promise<Chat.UncheckedFrameInfo> => {
  return await new Promise(
    (resolve) =>
      chrome.runtime.sendMessage({ type: 'getFrameInfo' }, resolve)
  );
};

export const createPopup = (url: string): void => {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  chrome.runtime.sendMessage({ type: 'createPopup', url });
};

const keyGen = (key: string): string => `ytcf.savedMessageActions.${key}`;

export const saveMessageActions = async (
  key: string,
  actions: Chat.MessageAction[]
): Promise<void> => {
  return await chrome.storage.local.set({ [keyGen(key)]: actions });
};

export const clearSavedMessageActions = async (key: string): Promise<void> => {
  return await chrome.storage.local.remove(keyGen(key));
};

export const getSavedMessageActions = async (
  key: string
): Promise<Chat.MessageAction[]> => {
  return await new Promise((resolve) => {
    const k = keyGen(key);
    chrome.storage.local.get(k, (s) => {
      resolve(s[k] || []);
    });
  });
};

export function getRandomString(len = 10): string {
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const randomString: string[] = [];
  for (let i = 0; i < len; i++) {
    const pos = Math.floor(Math.random() * charSet.length);
    randomString.push(charSet.substring(pos, pos + 1));
  }
  return randomString.join('');
}

export const frameIsReplay = window.location.href.startsWith(
  'https://www.youtube.com/live_chat_replay'
);

/*
 * Type predicates
 */
export const isPaidMessageRenderer =
  (r: Ytc.Renderers): r is Ytc.PaidMessageRenderer =>
    'purchaseAmountText' in r && 'bodyBackgroundColor' in r;

export const isPaidStickerRenderer =
  (r: Ytc.Renderers): r is Ytc.PaidStickerRenderer =>
    'purchaseAmountText' in r && 'moneyChipBackgroundColor' in r;

export const isMembershipRenderer =
  (r: Ytc.Renderers): r is Ytc.MembershipRenderer => 'headerSubtext' in r;

/** Checks if frameInfo values are valid */
export const isValidFrameInfo = (f: Chat.UncheckedFrameInfo, port?: Chat.Port): f is Chat.FrameInfo => {
  const check = f.tabId != null && f.frameId != null;
  if (!check) {
    console.error('Invalid frame info', { port });
  }
  return check;
};

const actionTypes = new Set(['messages', 'bonk', 'delete', 'pin', 'unpin', 'playerProgress', 'forceUpdate']);
export const responseIsAction = (r: Chat.BackgroundResponse): r is Chat.Actions =>
  actionTypes.has(r.type);

export const isMembershipGiftPurchaseRenderer = (r: Ytc.Renderers): r is Ytc.MembershipGiftPurchaseRenderer =>
  'header' in r && 'liveChatSponsorshipsHeaderRenderer' in r.header;

const privilegedTypes = new Set(['member', 'moderator', 'owner']);
export const isPrivileged = (types: string[]): boolean =>
  types.some(privilegedTypes.has.bind(privilegedTypes));

export const isChatMessage = (a: Chat.MessageAction): boolean =>
  !a.message.superChat && !a.message.superSticker && !a.message.membership;

export const isAllEmoji = (a: Chat.MessageAction): boolean =>
  a.message.message.length !== 0 &&
  a.message.message.every(m => m.type === 'emoji' || (m.type === 'text' && m.text.trim() === ''));

export const checkInjected = (error: string): boolean => {
  if (document.querySelector('#hc-buttons')) {
    console.error(error);
    return true;
  }
  return false;
};
