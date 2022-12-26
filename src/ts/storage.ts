import { webExtStores } from 'svelte-webext-stores';
import { derived, readable, writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { getClient, AvailableLanguages } from 'iframe-translator';
import type { IframeTranslatorClient, AvailableLanguageCodes } from 'iframe-translator';
import { ChatReportUserOptions, Theme, YoutubeEmojiRenderMode, isLiveTL } from './chat-constants';
import { getOverridePreset } from './ytcf-logic';

const INITIAL_PRESET_ID = 'initial-preset-id'; // all other ids will be random

export const stores = webExtStores();

export const hcEnabled = stores.addSyncStore('ytcf.enabled', true);
export const translateTargetLanguage = stores.addSyncStore('ytcf.translateTargetLanguage', '' as '' | AvailableLanguageCodes);
export const translatorClient = readable(null as (null | IframeTranslatorClient), (set) => {
  let client: IframeTranslatorClient | null = null;
  const destroyIf = (): void => {
    if (client !== null) {
      client.destroy();
      client = null;
    }
    set(null);
  };
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const unsub = translateTargetLanguage.subscribe(async ($translateTargetLanguage) => {
    if (!$translateTargetLanguage) {
      destroyIf();
      return;
    }
    if (client) return;
    client = await getClient();
    set(client);
  });
  translateTargetLanguage.ready().then(() => {
    // migrate from old language value to new language code
    const oldString = translateTargetLanguage.getCurrent() as string;
    if (!(oldString in AvailableLanguages)) {
      const newKey = (
        Object.keys(AvailableLanguages) as AvailableLanguageCodes[]
      ).find(key => AvailableLanguages[key] === oldString);
      translateTargetLanguage.set(newKey ?? '').catch(console.error);
    }
  }).catch(console.error);
  return () => {
    unsub();
    destroyIf();
  };
});
export const refreshScroll = writable(false);
export const theme = stores.addSyncStore('ytcf.theme', Theme.YOUTUBE);
export const showProfileIcons = stores.addSyncStore('ytcf.messages.showProfileIcons', true);
export const showUsernames = stores.addSyncStore('ytcf.messages.showUsernames', true);
export const showTimestamps = stores.addSyncStore('ytcf.messages.showTimestamps', false);
export const showUserBadges = stores.addSyncStore('ytcf.messages.showUserBadges', true);
export const lastClosedVersion = stores.addSyncStore('ytcf.lastClosedVersion', '');
export const showOnlyMemberChat = stores.addSyncStore('ytcf.showOnlyMemberChat', false);
export const emojiRenderMode = stores.addSyncStore('ytcf.emojiRenderMode', YoutubeEmojiRenderMode.SHOW_ALL);
export const autoLiveChat = stores.addSyncStore('ytcf.autoLiveChat', false);
export const useSystemEmojis = stores.addSyncStore('ytcf.useSystemEmojis', false);
export const hoveredItem = writable(null as null | Chat.MessageAction['message']['messageId']);
export const focusedSuperchat = writable(null as null | Ytc.ParsedTimedItem);
export const port = writable(null as null | Chat.Port);
export const selfChannel = writable(null as null | SimpleUserInfo);
export const selfChannelId = derived(selfChannel, ($selfChannel) => $selfChannel?.channelId);
export const selfChannelName = derived(selfChannel, ($selfChannel) => $selfChannel?.name);
export const reportDialog = writable(null as null | {
  callback: (selection: ChatReportUserOptions) => void;
  optionStore: Writable<null | ChatReportUserOptions>;
});
export const alertDialog = writable(null as null | {
  title: string;
  message: string;
  color: string;
});
export const stickySuperchats = writable([] as Ytc.ParsedTicker[]);
export const isDark = derived(theme, ($theme) => {
  return $theme === Theme.DARK || (
    $theme === Theme.YOUTUBE && (
      window.location.search.includes('dark') ||
      (
        !window.location.hostname.includes('youtube') &&
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      )
    )
  );
});
export const currentProgress = writable(null as null | number);
export const enableStickySuperchatBar = stores.addSyncStore('ytcf.enableStickySuperchatBar', false);
export const enableHighlightedMentions = stores.addSyncStore('ytcf.enableHighlightedMentions', true);
export const lastOpenedVersion = stores.addSyncStore('ytcf.lastOpenedVersion', '');
export const chatFilterPresets = stores.addSyncStore('ytcf.chatFilterPresets', [{
  filters: [],
  nickname: 'Preset 1',
  id: INITIAL_PRESET_ID,
  triggers: [],
  activation: 'manual'
}] as YtcF.FilterPreset[], true);
export const defaultFilterPresetId = stores.addSyncStore('ytcf.defaultFilterPresetId', INITIAL_PRESET_ID);
export const overrideFilterPresetId = writable(null as null | string);
export const videoInfo = writable(null as null | SimpleVideoInfo);
export const currentFilterPreset = derived(
  [chatFilterPresets, defaultFilterPresetId, videoInfo],
  ([$chatFilterPresets, $defaultFilterPresetId, $videoInfo]) => {
    if ($videoInfo !== null) {
      const result = getOverridePreset($chatFilterPresets, $videoInfo);
      overrideFilterPresetId.set(result ? result.id : null);
      if (result) {
        return result;
      }
    }
    if ($defaultFilterPresetId === null) return $chatFilterPresets[0];
    return $chatFilterPresets.find(preset => preset.id === $defaultFilterPresetId) as YtcF.FilterPreset;
  }
);
export const dataTheme = derived(isDark, ($isDark) => isLiveTL || $isDark ? 'dark' : 'light');
export const confirmDialog = writable(null as null | {
  title: string;
  message: string;
  action: {
    text: string;
    callback: () => void;
  };
});
export const inputDialog = writable(null as null | {
  title: string;
  originalValue: string;
  message?: string;
  action: {
    text: string;
    callback: (value: string) => void;
    cancelled?: () => void;
  };
  component?: any;
});
export const popoutDims = stores.addSyncStore('ytcf.popoutDims', {
  width: 800,
  height: 600
});
export const currentEditingPreset = writable(null as any as YtcF.FilterPreset);
export const storedMessageDumpKeys = stores.addSyncStore('ytcf.storedMessageDumpKeys', [] as YtcF.MessageDumpItem[]);
