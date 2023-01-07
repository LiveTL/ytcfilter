import { stores } from './storage';
import { stringifyRuns } from './ytcf-utils';

export function shouldFilterMessage(action: Chat.MessageAction, filters: YtcF.ChatFilter[]): boolean {
  const msg = action.message;
  for (const filter of filters) {
    if (filter.enabled) {
      let numSatisfied = 0;
      for (const condition of filter.conditions) {
        if (condition.type === 'boolean') {
          if ((
            condition.property === 'superchat' && Boolean(msg.superChat) === condition.invert
          ) || (
            msg.author.types.includes(condition.property) === condition.invert
          )) numSatisfied++;
        } else {
          let compStr = '';
          switch (condition.property) {
            case 'message':
              compStr = stringifyRuns(msg.message);
              break;
            case 'authorName':
              compStr = msg.author.name;
              break;
            case 'authorChannelId':
              compStr = msg.author.id;
              break;
          }
          if (condition.value === '') continue;
          if (condition.type !== 'regex') {
            const s1 = condition.caseSensitive ? compStr : compStr.toLowerCase();
            const s2 = condition.caseSensitive ? condition.value : condition.value.toLowerCase();
            const result = s1[condition.type](s2);
            if (result === condition.invert) {
              break;
            }
          } else {
            const regex = new RegExp(condition.value, condition.caseSensitive ? '' : 'i');
            const result = regex.test(compStr);
            if (result === condition.invert) {
              break;
            }
          }
        }
        numSatisfied++;
      }
      if (numSatisfied === filter.conditions.length) {
        return true;
      }
    }
  }
  return false;
}

export function shouldActivatePreset(preset: YtcF.FilterPreset, info: SimpleVideoInfo): boolean {
  for (const trigger of preset.triggers) {
    let compStr = '';
    switch (trigger.property) {
      case 'channelId':
        compStr = info.channel.channelId;
        break;
      case 'channelName':
        compStr = info.channel.name;
        break;
      case 'channelHandle':
        compStr = info.channel.handle ?? '';
        break;
      case 'videoId':
        compStr = info.video.videoId;
        break;
      case 'videoTitle':
        compStr = info.video.title;
        break;
    }
    if (trigger.value === '') continue;
    if (trigger.type !== 'regex') {
      const s1 = trigger.caseSensitive ? compStr : compStr.toLowerCase();
      const s2 = trigger.caseSensitive ? trigger.value : trigger.value.toLowerCase();
      const result = s1[trigger.type](s2);
      if (result) return true;
    } else {
      const regex = new RegExp(trigger.value, trigger.caseSensitive ? '' : 'i');
      const result = regex.test(compStr);
      if (result) return true;
    }
  }
  return false;
}

export function getOverridePreset(presets: YtcF.FilterPreset[], info: SimpleVideoInfo): YtcF.FilterPreset | null {
  for (const preset of presets) {
    if (shouldActivatePreset(preset, info)) {
      return preset;
    }
  }
  return null;
}

const getV2Storage = async (): Promise<void> => {
  return await new Promise((resolve, reject) => {
    try {
      ((window as any).browser ?? window.chrome).storage.local.get('@@vwe-persistence', (s) =>
        resolve(s['@@vwe-persistence'] || null)
      );
    } catch (e) {
      reject(e);
    }
  });
};

export const migrateV2toV3 = async () => {
  const v2 = await getV2Storage();
  if (v2) {
  }
};

const MESSAGE_ACTION_PREFIX = 'ytcf.savedMessageActions.';

const keyGen = (key: string, dataType: 'info' | 'actions' = 'info'): string => `${MESSAGE_ACTION_PREFIX}.${dataType}.${key}`;
const filterMessageDumpInfoKeyNames = (key: string): boolean => key.startsWith(
  keyGen('', 'info')
);

export const getSavedMessageDump = async (
  key: string
): Promise<YtcF.MessageDumpActionsItem | undefined> => {
  const k = keyGen(key, 'actions');
  const s = stores.addSyncStore(k, undefined as YtcF.MessageDumpActionsItem | undefined, false);
  return await s.get();
};

export const getSavedMessageDumpInfo = async (
  key: string
): Promise<YtcF.MessageDumpInfoItem> => {
  const k = keyGen(key, 'info');
  const d: YtcF.MessageDumpInfoItem = {
    continuation: [],
    info: null,
    key
  };
  const s = stores.addSyncStore(k, d, false);
  return await s.get();
};

export const getSavedMessageDumpActions = async (
  key: string
): Promise<YtcF.MessageDumpActionsItem | undefined> => {
  const k = keyGen(key, 'actions');
  const s = stores.addSyncStore(k, undefined as YtcF.MessageDumpActionsItem | undefined, false);
  return await s.get();
};

export const saveMessageActions = async (
  key: string,
  continuation: string | null,
  info: SimpleVideoInfo | null,
  actions: Chat.MessageAction[]
): Promise<void> => {
  const lastObj = await getSavedMessageDumpInfo(key);
  const obj: YtcF.MessageDumpInfoItem = {
    continuation: (
      continuation === null ||
      lastObj.continuation.includes(continuation)
        ? lastObj.continuation
        : [...lastObj.continuation, continuation]
    ),
    info: {
      channel: {
        channelId: info?.channel.channelId ?? lastObj.info?.channel.channelId ?? '',
        name: info?.channel.name ?? lastObj.info?.channel.name ?? '',
        handle: info?.channel.handle ?? lastObj.info?.channel.handle ?? ''
      },
      video: {
        videoId: info?.video.videoId ?? lastObj.info?.video.videoId ?? '',
        title: info?.video.title ?? lastObj.info?.video.title ?? ''
      }
    },
    key
  };
  const infoStore = stores.addSyncStore(keyGen(key, 'info'), obj, false);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  infoStore.set(obj);
  const actionsStore = stores.addSyncStore(keyGen(key, 'actions'), actions, false);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  actionsStore.set(actions);
};

export const clearSavedMessageActions = async (key: string): Promise<void> => {
  const s = stores.addSyncStore(keyGen(key, 'actions'), undefined as YtcF.MessageDumpActionsItem | undefined, false);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  s.set(undefined);
};

export const getAllSavedMessageActionKeys = async (): Promise<string[]> => {
  // return await new Promise((resolve) => {
  //   chrome.storage.local.get(null, (s) => {
  //     resolve(
  //       Object.keys(s)
  //         .filter(filterMessageDumpInfoKeyNames)
  //     );
  //   });
  // });
  const data = JSON.parse(await stores.exportJson());
  return Object.keys(data).filter(filterMessageDumpInfoKeyNames);
};

export const findSavedMessageActionKey = async (
  continuation: string | null,
  info: SimpleVideoInfo | null
): Promise<string | null> => {
  // return await new Promise((resolve) => {
  //   chrome.storage.local.get(null, (s) => {
  //     const keys = Object.keys(s).filter(filterMessageDumpInfoKeyNames);
  //     for (const key of keys) {
  //       const dump = s[key] as YtcF.MessageDumpInfoItem;
  //       if ((continuation !== null && dump.continuation.includes(continuation)) ||
  //         (info !== null && dump.info?.video?.videoId === info.video.videoId)) {
  //         resolve(key);
  //         return;
  //       }
  //     }
  //     resolve(null);
  //   });
  // });
  const allMessageKeys = await getAllSavedMessageActionKeys();
  for (const key of allMessageKeys) {
    const dump = await getSavedMessageDumpInfo(key);
    if ((continuation !== null && dump.continuation.includes(continuation)) ||
      (info !== null && dump.info?.video?.videoId === info.video.videoId)) {
      return key;
    }
  }
  return null;
};
