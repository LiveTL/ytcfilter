import { get } from 'svelte/store';
import { UNNAMED_ARCHIVE } from './chat-constants';
import { stores, currentFilterPreset, chatFilterPresets, defaultFilterPresetId } from './storage';
import { stringifyRuns, download } from './ytcf-utils';

const browserObject = (window.chrome ?? (window as any).browser);

export async function shouldFilterMessage(action: Chat.MessageAction): Promise<boolean> {
  await Promise.all([chatFilterPresets.ready(), defaultFilterPresetId.ready()]);
  const filters = get(currentFilterPreset).filters;
  const msg = action.message;
  for (const filter of filters) {
    if (filter.enabled) {
      let numSatisfied = 0;
      let numValidFilters = filter.conditions.length;
      for (const condition of filter.conditions) {
        if (condition.type === 'boolean') {
          if ((
            condition.property === 'superchat' && Boolean(msg.superChat) !== condition.invert
          ) || (
            msg.author.types.includes(condition.property) !== condition.invert
          )) {
            numSatisfied++;
          }
          continue;
        }
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
          if (!s2) {
            numValidFilters--;
          } else if (result === condition.invert) {
            break;
          }
        } else {
          const regex = new RegExp(condition.value, condition.caseSensitive ? '' : 'i');
          const result = regex.test(compStr);
          if (!condition.value) {
            numValidFilters--;
          } else if (result === condition.invert) {
            break;
          }
        }
        numSatisfied++;
      }
      if (numSatisfied > 0 && numSatisfied === numValidFilters) {
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

export function getAutoActivatedPreset(presets: YtcF.FilterPreset[], info: SimpleVideoInfo): YtcF.FilterPreset | null {
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
      browserObject.storage.local.get('@@vwe-persistence', (s) =>
        resolve(s['@@vwe-persistence'] || null)
      );
    } catch (e) {
      reject(e);
    }
  });
};

export const migrateV2toV3 = async () => {
  const v2 = await getV2Storage();
  browserObject.storage.local.remove('@@vwe-persistence');
  if (v2) {
    // TODO
  }
};

const MESSAGE_ACTION_PREFIX = 'ytcf.savedMessageActions.';

const keyGen = (key: string, dataType: 'info' | 'actions' = 'info'): string => `${MESSAGE_ACTION_PREFIX}${dataType}.${key}`;
const filterMessageDumpInfoKeyNames = (key: string): boolean => key.startsWith(
  keyGen('', 'info')
);

export const getSavedMessageDump = async (
  key: string
): Promise<YtcF.MessageDumpActionsItem | undefined> => {
  const k = keyGen(key, 'actions');
  const s = stores.addSyncStore(k, undefined as YtcF.MessageDumpActionsItem | undefined, false);
  await s.ready();
  return await s.get();
};

export const getSavedMessageDumpInfo = async (
  key: string
): Promise<YtcF.MessageDumpInfoItem> => {
  const k = keyGen(key, 'info');
  const d: YtcF.MessageDumpInfoItem = {
    continuation: [],
    info: null,
    key,
    presetId: null,
    nickname: '',
    lastEdited: new Date().getTime()
  };
  const s = stores.addSyncStore(k, d, false);
  await s.ready();
  return await s.get();
};

export const getSavedMessageDumpExportItem = async (
  key: string
): Promise<YtcF.MessageDumpExportItem[]> => {
  const k = keyGen(key, 'info');
  const s = stores.addSyncStore(k, undefined as YtcF.MessageDumpInfoItem | undefined, false);
  await s.ready();
  const info = await s.get();
  if (!info) return [];
  const k2 = keyGen(key, 'actions');
  const s2 = stores.addSyncStore(k2, undefined as YtcF.MessageDumpActionsItem | undefined, false);
  await s2.ready();
  const actions = await s2.get();
  if (!actions) return [];
  return [{
    ...info,
    actions
  }];
};

export const saveMessageDumpInfo = async (
  key: string,
  info: YtcF.MessageDumpInfoItem
): Promise<void> => {
  const k = keyGen(key, 'info');
  const s = stores.addSyncStore(k, info, false);
  await s.ready();
  await s.set(info);
};

export const getSavedMessageDumpActions = async (
  key: string
): Promise<YtcF.MessageDumpActionsItem | undefined> => {
  const k = keyGen(key, 'actions');
  const s = stores.addSyncStore(k, undefined as YtcF.MessageDumpActionsItem | undefined, false);
  await s.ready();
  return await s.get();
};

export const saveMessageActions = async (
  key: string,
  continuation: string | null,
  info: SimpleVideoInfo | null,
  actions: Chat.MessageAction[],
  presetId: string
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
    key,
    presetId,
    lastEdited: Date.now(),
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
    nickname: lastObj.nickname || UNNAMED_ARCHIVE
  };
  const infoStore = stores.addSyncStore(keyGen(key, 'info'), obj, false);
  await infoStore.ready();
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  infoStore.set(obj);
  const actionsStore = stores.addSyncStore(keyGen(key, 'actions'), actions, false);
  await actionsStore.ready();
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  actionsStore.set(actions);
};

export const deleteSavedMessageActions = async (key: string): Promise<void> => {
  await browserObject.storage.local.remove([keyGen(key, 'info'), keyGen(key, 'actions')]);
};

export const getAllSavedMessageActionKeys = async (): Promise<string[]> => {
  return await new Promise((resolve) => {
    browserObject.storage.local.get(null, (s: any) => {
      resolve(
        Object.keys(s)
          .filter(filterMessageDumpInfoKeyNames)
          .map((k) => k.replace(keyGen('', 'info'), ''))
      );
    });
  });
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
      (info?.video != null && dump.info?.video?.videoId === info.video.videoId)) {
      return key;
    }
  }
  return null;
};

export const getAllMessageDumps = async (): Promise<YtcF.MessageDumpInfoItem[]> => {
  const allMessageKeys = await getAllSavedMessageActionKeys();
  const items = (await Promise.all(allMessageKeys.map(async (k) => await getSavedMessageDumpInfo(k)))).sort((a, b) => {
    return a.lastEdited - b.lastEdited;
  }).reverse();
  for (const item of items) {
    item.size = (await getSavedMessageDumpActions(item.key))?.length ?? 0;
  }
  return items;
};

const getTitle = (obj: YtcF.MessageDumpExportItem | undefined): string => {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return ((obj?.info?.video?.title) ?? '') || obj?.info?.channel?.name ||
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    obj?.info?.video?.videoId || obj?.info?.channel?.channelId ||
    (obj?.lastEdited !== undefined ? new Date(obj?.lastEdited) : new Date()).toISOString();
};

export const downloadAsJson = async (item: YtcF.MessageDumpInfoItem): Promise<void> => {
  const obj = (await getSavedMessageDumpExportItem(item.key));
  const title = getTitle(obj[0]);
  download(JSON.stringify(obj, null, 2), `${title}.json`);
};

export const downloadAsTxt = async (item: YtcF.MessageDumpInfoItem): Promise<void> => {
  const obj = (await getSavedMessageDumpExportItem(item.key))[0];
  const title = getTitle(obj);
  const str = obj?.actions.map(action => {
    const msg = action.message;
    const author = msg.author.name;
    const message = stringifyRuns(msg.message);
    return `[${msg.timestamp}] ${author}: ${message}`;
  }).join('\n') ?? '';
  const a = document.createElement('a');
  a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(str)}`;
  a.download = `${title}.txt`;
  a.click();
};

export const importFromJson = async (): Promise<string> => {
  return await new Promise((resolve) => {
    const element = document.createElement('input');
    element.type = 'file';
    element.accept = '.json';
    element.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.addEventListener('load', (e) => {
          console.log('Importing JSON dump');
          const data = JSON.parse(e.target?.result as string);
          resolve(data.key);
        });
        reader.readAsText(file);
      }
    });
    document.body.appendChild(element);
    element.click();
  });
};
