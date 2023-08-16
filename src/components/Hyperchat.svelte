<script lang="ts">
  import '../stylesheets/scrollbar.css';
  import '../stylesheets/ui.css';
  import { onDestroy, onMount, afterUpdate, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import dark from 'smelte/src/dark';
  import WelcomeMessage from './YtcFilterWelcome.svelte';
  import Message from './Message.svelte';
  // import PinnedMessage from './PinnedMessage.svelte';
  import PaidMessage from './PaidMessage.svelte';
  import MembershipItem from './MembershipItem.svelte';
  import ReportBanDialog from './ReportBanDialog.svelte';
  import SuperchatViewDialog from './SuperchatViewDialog.svelte';
  import StickyBar from './StickyBar.svelte';
  import {
    // paramsTabId,
    // paramsFrameId,
    // paramsIsReplay,
    Theme,
    YoutubeEmojiRenderMode,
    chatUserActionsItems,
    isLiveTL,
    UNDONE_MSG
  } from '../ts/chat-constants';
  import '../ts/resize-tracker';
  import { isAllEmoji, isChatMessage, isPrivileged, responseIsAction, createPopup, getRandomString, getFrameInfoAsync } from '../ts/chat-utils';
  import Button from 'smelte/src/components/Button';
  import {
    theme,
    showOnlyMemberChat,
    showProfileIcons,
    showUsernames,
    showTimestamps,
    showUserBadges,
    refreshScroll,
    emojiRenderMode,
    useSystemEmojis,
    hoveredItem,
    port,
    selfChannel,
    alertDialog,
    stickySuperchats,
    currentProgress,
    enableStickySuperchatBar,
    lastOpenedVersion,
    selfChannelName,
    enableHighlightedMentions,
    currentFilterPreset,
    chatFilterPresets,
    dataTheme,
    videoInfo,
    overrideFilterPresetId,
    ytDark,
    confirmDialog,
    initialSetupDone,
    defaultFilterPresetId
  } from '../ts/storage';
  import { version } from '../manifest.json';
  import { shouldFilterMessage, saveMessageActions, findSavedMessageActionKey, getSavedMessageDumpActions, getSavedMessageDumpInfo, getAutoActivatedPreset, downloadAsJson, downloadAsTxt, redirectIfInitialSetup, importJsonDump, mergeVideoInfoObjs } from '../ts/ytcf-logic';
  import { exioButton, exioDropdown, exioIcon } from 'exio/svelte';
  import '../stylesheets/line.css';
  import FullFrame from './FullFrame.svelte';
  import YtcFilterConfirmation from './YtcFilterConfirmation.svelte';
  import { writable } from 'svelte/store';
  import html2canvas from 'html2canvas';

  const welcome = { welcome: true, message: { messageId: 'welcome' } };
  type Welcome = typeof welcome;

  const params = new URLSearchParams(window.location.search);
  const paramsTabId = params.get('tabid');
  const paramsFrameId = params.get('frameid');
  const paramsIsReplay = params.get('isReplay');
  const paramsContinuation = params.get('continuation');
  const paramsArchiveKey = params.get('archiveKey');
  const paramsYtDark = params.get('ytDark');
  const paramsWrapperWindowId = params.get('wrapperWindowId');
  let embedded = false;
  try {
    embedded = window.self !== window.top;
  } catch (e) {
    embedded = true;
  }

  // const CHAT_HISTORY_SIZE = 150;
  // const TRUNCATE_SIZE = 20;
  let messageActions: (Chat.MessageAction | Welcome)[] = [];
  let overrideActions: (Chat.MessageAction | Welcome)[] = [];
  const messageKeys = new Set<string>();
  let pinned: Ytc.ParsedPinned | null;
  let div: HTMLElement;
  let isAtBottom = true;
  // let truncateInterval: number;
  const isReplay = paramsIsReplay;
  const smelteDark = dark();
  const initialized = writable(false);
  let messageStorageInitDone = false;

  type MessageBlocker = (a: Chat.MessageAction) => boolean;

  const memberOnlyBlocker: MessageBlocker = (a) => (
    $showOnlyMemberChat && isChatMessage(a) && !isPrivileged(a.message.author.types)
  );

  const emojiSpamBlocker: MessageBlocker = (a) => (
    isChatMessage(a) &&
    $emojiRenderMode !== YoutubeEmojiRenderMode.SHOW_ALL &&
    isAllEmoji(a)
  );

  const duplicateKeyBlocker: MessageBlocker = (a) => {
    const result = messageKeys.has(a.message.messageId);
    messageKeys.add(a.message.messageId);
    return result;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const messageBlockers = [memberOnlyBlocker, emojiSpamBlocker];

  const shouldShowMessage = (m: Chat.MessageAction, _forceDisplay = false): boolean => (
    // ((!messageBlockers.some(blocker => blocker(m)) || forceDisplay) && )
    // do not flip the order of the conditions above
    // this gives the duplicateKeyBlocker a chance to add the key
    !duplicateKeyBlocker(m)
  );

  const isWelcome = (m: Chat.MessageAction | Welcome): m is Welcome =>
    'welcome' in m;

  const checkAtBottom = () => {
    isAtBottom =
      Math.ceil(div.clientHeight + div.scrollTop) >= div.scrollHeight - 2;
  };

  const scrollToBottom = () => {
    if (div == null) return;
    div.scrollTop = div.scrollHeight;
  };

  // const checkTruncateMessages = (): void => {
  //   const diff = messageActions.length - CHAT_HISTORY_SIZE;
  //   if (diff > TRUNCATE_SIZE) {
  //     const removed = messageActions.splice(0, diff);
  //     removed.forEach(m => messageKeys.delete(m.message.messageId));
  //   }
  //   messageActions = messageActions;
  // };

  let isReadyToStartFiltering = false;
  const readyToStartFiltering = async () => {
    if (isReadyToStartFiltering) return true;
    await Promise.all([
      chatFilterPresets.ready(),
      defaultFilterPresetId.ready(),
      new Promise(resolve => {
        const unsub = initialized.subscribe((v) => {
          if (v) {
            unsub();
            resolve(null);
          }
        });
      }),
      new Promise(resolve => {
        const unsub = videoInfo.subscribe((v) => {
          if (v !== undefined) {
            unsub();
            resolve(null);
          }
        });
      })
    ]);
    await tick();
    isReadyToStartFiltering = true;
    await tick();
    return true;
  };

  const applyYtcf = async (items: Chat.MessageAction[], forceDisplay = false) => {
    const newItems = [];
    for (const a of items) {
      if (
        (forceDisplay || (await readyToStartFiltering() && shouldFilterMessage(a))) &&
        shouldShowMessage(a, forceDisplay)
      ) {
        newItems.push(a);
      }
    }
    return newItems;
  };

  const newMessages = async (
    messagesAction: Chat.MessagesAction, isInitial: boolean, forceDisplay = false
  ) => {
    // On replays' initial data, only show messages with negative timestamp
    if (isInitial && isReplay) {
      messageActions = [...messageActions, ...(await applyYtcf(filterTickers(messagesAction.messages).filter(
        (a) => a.message.timestamp.startsWith('-')
      ), forceDisplay))];
    } else {
      const applied = (await applyYtcf(filterTickers(messagesAction.messages), forceDisplay));
      messageActions = [...messageActions, ...applied];
    }
    // if (!isInitial) checkTruncateMessages();
  };

  $: if (isAtBottom && overrideActions.length > 0) {
    overrideActions = [];
  }
  const setOverride = () => (overrideActions = messageActions);
  $: if (!isAtBottom) setOverride();

  const onBonk = (bonk: Ytc.ParsedBonk) => {
    const f = (action: typeof messageActions[number]) => {
      if (isWelcome(action)) return;
      if (action.message.author.id === bonk.authorId) {
        action.deleted = { replace: bonk.replacedMessage };
      }
    };
    messageActions.forEach(f);
    overrideActions.forEach(f);
  };

  const filterTickers = (items: Chat.MessageAction[]): Chat.MessageAction[] => {
    const keep: Chat.MessageAction[] = [];
    const discard: Ytc.ParsedTicker[] = [];
    items.forEach(item => {
      if ('tickerDuration' in item.message) {
        if (!$stickySuperchats.some(sc => sc.messageId === item.message.messageId)) {
          discard.push(item.message);
        }
      } else keep.push(item);
    });
    if ($enableStickySuperchatBar && discard.length) {
      $stickySuperchats = [
        ...discard,
        ...$stickySuperchats
      ];
    }
    return keep;
  };

  const onDelete = (deletion: Ytc.ParsedDeleted) => {
    const f = (action: typeof messageActions[number]) => {
      if (isWelcome(action)) return false;
      if (action.message.messageId === deletion.messageId) {
        action.deleted = { replace: deletion.replacedMessage };
        return true;
      }
      return false;
    };
    messageActions.some(f);
    overrideActions.some(f);
  };

  const onChatAction = (action: Chat.Actions, isInitial = false) => {
    if (paramsArchiveKey) return;
    switch (action.type) {
      case 'messages':
        newMessages(action, isInitial);
        break;
      case 'bonk':
        onBonk(action.bonk);
        if (overrideActions.length > 0) {
          setOverride();
        }
        break;
      case 'delete':
        onDelete(action.deletion);
        if (overrideActions.length > 0) {
          setOverride();
        }
        break;
      case 'pin':
        pinned = action;
        newMessages({
          type: 'messages',
          messages: [{
            message: action.item.contents
          }]
        }, false, false);
        break;
      case 'unpin':
        pinned = null;
        break;
      case 'playerProgress':
        $currentProgress = action.playerProgress;
        break;
      case 'forceUpdate':
        // messageKeys.clear();
        // messageActions = [...action.messages].filter(shouldShowMessage);
        // if (action.showWelcome) {
        //   messageActions = [...messageActions]; //, welcome];
        // }
        newMessages({ type: 'messages', messages: action.messages }, false);
        break;
    }
  };

  const updateTheme = (theme: Theme, dataTheme: string, ytDark = false) => {
    if (theme === Theme.YOUTUBE) {
      smelteDark.set(ytDark);
      return;
    }
    smelteDark.set(dataTheme === 'dark');
  };

  const loadArchive = async (key: string) => {
    archiveEmbedFrame = '';
    wrapperWindowId = '';
    if (!key) return;
    const data = await getSavedMessageDumpActions(key);
    if (!data) return;
    const paramsClone = new URLSearchParams();
    paramsClone.set('archiveKey', key);
    paramsClone.set('ytDark', $ytDark.toString());
    paramsClone.set('tabid', paramsTabId as string);
    paramsClone.set('frameid', paramsFrameId as string);
    wrapperWindowId = getRandomString();
    paramsClone.set('wrapperWindowId', wrapperWindowId);
    archiveEmbedFrame = window.location.host.includes('youtube')
      ? 'https://www.youtube.com/live_chat?v=Lq9eqHDKJPE&ytcfilter=1&' + paramsClone.toString()
      : chrome.runtime.getURL(`${(isLiveTL ? 'ytcfilter' : '')}/hyperchat.html?${paramsClone.toString()}`);
  };

  const onPortMessage = (response: Chat.BackgroundResponse) => {
    console.log(response);
    if (archiveEmbedFrame) {
      console.log(archiveEmbedFrame);
      if (response.type === 'closeArchiveViewRequest' && wrapperWindowId === response.wrapperWindowId) {
        archiveEmbedFrame = '';
        wrapperWindowId = '';
      }
      if (response.type !== 'loadArchiveRequest') return;
    }
    if (responseIsAction(response)) {
      onChatAction(response);
      return;
    }
    switch (response.type) {
      case 'initialData':
        response.initialData.forEach((action) => {
          onChatAction(action, true);
        });
        $selfChannel = response.selfChannel;
        if (!paramsArchiveKey) $videoInfo = mergeVideoInfoObjs($videoInfo, response.videoInfo);
        $initialized = true;
        break;
      case 'themeUpdate':
        $ytDark = response.dark;
        break;
      case 'loadArchiveRequest':
        loadArchive(response.key);
        break;
      case 'chatUserActionResponse':
        $alertDialog = {
          title: response.success ? 'Success!' : 'Error',
          message: chatUserActionsItems.find(v => v.value === response.action)
            ?.messages[response.success ? 'success' : 'error'] ?? '',
          color: response.success ? 'primary' : 'error'
        };
        if (response.success) {
          messageActions = messageActions.filter(
            (a) => {
              if (isWelcome(a)) return true;
              const r = a.message.author.id !== response.message.author.id;
              if (!r) {
                messageKeys.delete(a.message.messageId);
              }
              return r;
            }
          );
        }
        break;
      case 'registerClientResponse':
        break;
      default:
        console.error('Unknown payload type', { port, response });
        break;
    }
  };

  $: document.title = $videoInfo?.video?.title || 'YtcFilter';

  // Doesn't work well with onMount, so onLoad will have to do
  // Update: use onMount because hc now mounts in content script
  const onLoad = () => {
    $lastOpenedVersion = version;
    document.body.classList.add('overflow-hidden');

    if (paramsTabId == null || paramsFrameId == null || paramsTabId.length < 1 || paramsFrameId.length < 1) {
      console.error('No tabId or frameId found from params');
      if (paramsArchiveKey) $initialized = true;
      return;
    }

    const frameInfo = {
      tabId: parseInt(paramsTabId),
      frameId: parseInt(paramsFrameId)
    };

    $port = chrome.runtime.connect({ name: JSON.stringify(frameInfo) });

    $port?.onMessage.addListener(onPortMessage);

    $port?.postMessage({
      type: 'registerClient',
      getInitialData: true
    });
    if (paramsArchiveKey) $initialized = true;
    else {
      $port?.postMessage({
        type: 'getTheme'
      });
    }
  };

  onMount(onLoad);

  const onRefresh = () => {
    if (isAtBottom) {
      scrollToBottom();
    }
    tick().then(checkAtBottom);
  };

  $: if ($refreshScroll) {
    onRefresh();
    $refreshScroll = false;
  }

  afterUpdate(onRefresh);

  onDestroy(() => {
    $port?.disconnect();
    // if (truncateInterval) window.clearInterval(truncateInterval);
  });

  $: updateTheme($theme, $dataTheme, $ytDark);
  // Scroll to bottom when any of these settings change
  $: ((..._a: any[]) => scrollToBottom())(
    $showProfileIcons, $showUsernames, $showTimestamps, $showUserBadges
  );

  const containerClass = 'h-screen w-screen text-black dark:text-white bg-white bg-ytbg-light dark:bg-ytbg-dark flex flex-col justify-between max-w-none';

  const isSuperchat = (action: Chat.MessageAction) => (action.message.superChat || action.message.superSticker);
  const isMembership = (action: Chat.MessageAction) => (action.message.membership || action.message.membershipGiftPurchase);
  const isMessage = (action: Chat.MessageAction | Welcome): action is Chat.MessageAction =>
    (!isWelcome(action) && !isSuperchat(action) && !isMembership(action));

  $: $useSystemEmojis, onRefresh();

  const setHover = (action: Chat.MessageAction | Welcome | null) => {
    if (action == null) $hoveredItem = null;
    else if (!('welcome' in action)) $hoveredItem = action.message.messageId;
  };

  const clearStickySuperchats = () => {
    $stickySuperchats = [];
  };
  $: if (!$enableStickySuperchatBar) clearStickySuperchats();

  let topBarSize = 0;
  let topBar: HTMLDivElement | undefined;
  const topBarResized = () => {
    setTimeout(() => {
      if (topBar) {
        topBarSize = topBar.clientHeight;
      }
    }, 350);
  };
  $: $enableStickySuperchatBar, pinned, topBarResized();

  const isMention = (msg: Ytc.ParsedMessage) => {
    return $selfChannelName && msg.message.map(run => {
      if (run.type === 'text' || run.type === 'link') {
        return run.text;
      } else {
        return run.alt;
      }
    }).join('').includes(`@${$selfChannelName}`);
  };
  const executeExport = (e: any) => {
    const el = (e.target as HTMLSelectElement);
    switch (el.value) {
      case 'screenshot':
        exportScreenshot();
        break;
      case 'textfile':
        exportTextFile();
        break;
      case 'jsondump':
        exportJsonDump();
        break;
    }
    el.value = 'export';
  };

  let archiveEmbedFrame = '';
  let wrapperWindowId = '';

  const executeImport = async (e: any) => {
    const el = (e.target as HTMLSelectElement);
    switch (el.value) {
      case 'jsondump': {
        const key = await importJsonDump();
        if (key) loadArchive(key);
        break;
      }
      case 'savedarchive': {
        const paramsClone = new URLSearchParams(params.toString());
        paramsClone.set('isArchiveLoadSelection', 'true');
        if (!embedded) {
          wrapperWindowId = getRandomString();
          paramsClone.set('wrapperWindowId', wrapperWindowId);
        }
        // createPopup
        const url = (chrome.runtime.getURL(
          (isLiveTL ? 'hyperchat/options.html' : 'options.html') + '?' + paramsClone.toString()
        ));
        if (embedded) createPopup(url);
        else {
          archiveEmbedFrame = url;
        }
        break;
      }
    }
    el.value = 'import';
  };

  let screenshotElement: HTMLDivElement | undefined;
  let hiddenElement: HTMLDivElement | undefined;
  const exportScreenshot = async () => {
    console.log('THEME IS ', $dataTheme);
    const clonedNode = screenshotElement?.cloneNode(true) as HTMLDivElement;
    clonedNode.id = 'screenshot-element';
    hiddenElement?.appendChild(clonedNode);
    let style = document.querySelector('#shift-screenshot') as HTMLStyleElement;
    if (!style) {
      style = document.createElement('style');
      style.id = 'shift-screenshot';
      document.head.appendChild(style);
    }
    const bottomNode = document.createElement('div');
    clonedNode.appendChild(bottomNode);
    bottomNode.id = 'screenshot-bottom';
    const hrefNode = document.createElement('div');
    hrefNode.style.textDecoration = 'underline';
    bottomNode.style.transform = 'skew(-7.5deg)';
    hrefNode.innerText = 'https://livetl.app/ytcfilter';
    const spanNode = document.createElement('span');
    spanNode.innerHTML = 'Filtered with YtcFilter. ';
    spanNode.style.whiteSpace = 'pre';
    bottomNode.appendChild(spanNode);
    bottomNode.appendChild(hrefNode);
    style.innerHTML = `
      #screenshot-element img {
        transform: translateY(35%);
      }
      #screenshot-element .hide-while-screenshotting {
        display: none;
      }
      #screenshot-element > * {
        transform: translateY(-5px);
      }
      #screenshot-element {
        padding-bottom: 20px;
      }
      #screenshot-element::before {
        background-color: transparent; /* rgba(128, 128, 128, 0.1); */
        width: 100vw;
        height: 20px;
        bottom: 0px;
        content: '';
        position: absolute;
      }
      #screenshot-bottom {
        width: 100vw;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        bottom: 7px;
        font-weight: bold;
        z-index: 100;
      }
    `;
    html2canvas(clonedNode, {
      useCORS: true,
      backgroundColor: $dataTheme === 'dark' ? '#0f0f0f' : 'white',
      width: screenshotElement?.clientWidth,
      scale: 2,
      allowTaint: true
    }).then((canvas: HTMLCanvasElement) => {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `chat-${new Date().toISOString()}.png`;
      a.click();
      style.innerHTML = '';
      clonedNode.remove();
    }).catch((err: any) => {
      console.error(err);
      style.innerHTML = '';
      clonedNode.remove();
    });
  };
  const exportTextFile = async () => {
    downloadAsTxt(await getSavedMessageDumpInfo(key));
  };
  const exportJsonDump = async () => {
    downloadAsJson(await getSavedMessageDumpInfo(key));
  };
  $: showWelcome = $initialized && (messageActions.length === 0 && !paramsArchiveKey);

  const clearMessages = () => {
    $confirmDialog = {
      action: {
        callback: () => {
          messageKeys.clear();
          messageActions = [];
        },
        text: 'Clear'
      },
      message: UNDONE_MSG,
      title: 'Clear Messages?'
    };
    scrollToBottom();
  };
  let key = '';
  const initMessageStorage = async () => {
    let tempKey = paramsArchiveKey || await findSavedMessageActionKey(paramsContinuation, $videoInfo);
    tempKey = tempKey === null ? getRandomString() : tempKey;
    const newMsgs = await getSavedMessageDumpActions(tempKey);
    if (newMsgs?.length) {
      newMessages({
        type: 'messages',
        messages: newMsgs
      }, false, true);
    }
    key = tempKey;
    const info = await getSavedMessageDumpInfo(key);
    const cachedPreset = info?.presetId;
    if (!$overrideFilterPresetId && cachedPreset) {
      $overrideFilterPresetId = cachedPreset;
    }
    if (paramsArchiveKey && info?.info) $videoInfo = mergeVideoInfoObjs(info?.info, $videoInfo);
    messageStorageInitDone = true;
  };
  $: if ($initialized) {
    initMessageStorage();
  }
  $: if (key && $initialSetupDone && messageStorageInitDone) {
    saveMessageActions(
      key,
      paramsContinuation,
      $videoInfo,
      messageActions.filter(item => !isWelcome(item)) as Chat.MessageAction[],
      $currentFilterPreset.id
    );
    console.log(
      key,
      paramsContinuation,
      $videoInfo,
      messageActions.filter(item => !isWelcome(item)) as Chat.MessageAction[],
      $currentFilterPreset.id);
  }
  let isPopout = false;
  onMount(async () => {
    await redirectIfInitialSetup();
    try {
      if (window.parent === window) {
        isPopout = true;
      } else {
        isAtBottom = window.innerHeight === 0;
        window.addEventListener('resize', () => {
          if (window.innerHeight === 0) isAtBottom = true;
        });
      }
    } catch (e) {
    }
    if (paramsYtDark) {
      $ytDark = paramsYtDark === 'true';
    }
  });
  const openSettings = () => createPopup(chrome.runtime.getURL((isLiveTL ? 'ytcfilter' : '') + '/options.html'));

  const presetChangedManually = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const presetId = target.value;
    $overrideFilterPresetId = presetId;
  };

  const overwriteOverride = () => {
    if ($videoInfo) {
      const result = getAutoActivatedPreset($chatFilterPresets, $videoInfo);
      if (result) {
        $overrideFilterPresetId = result.id;
      }
    }
  };

  const deleteMessageClientSide = (obj: CustomEvent) => {
    messageActions = messageActions.filter(item => isWelcome(item) || item.message.messageId !== obj.detail);
    messageKeys.delete(obj.detail);
    setOverride();
  };

  $: if ($initialized && $videoInfo) {
    overwriteOverride();
  }
  let topBarHeight = 0;

  const closeArchive = () => {
    if ($port) $port.postMessage({ type: 'closeArchiveViewRequest', wrapperWindowId: paramsWrapperWindowId as string });
  };
</script>

<ReportBanDialog />
<SuperchatViewDialog />
<YtcFilterConfirmation />

<svelte:window on:resize={() => {
  scrollToBottom();
  topBarResized();
}} on:load={onLoad} />

<div bind:this={hiddenElement} style="opacity: 0; position: absolute; z-index: -1;" />

<FullFrame src={archiveEmbedFrame} />

<div style="display: grid; grid-template-rows: auto auto 1fr;" class="h-screen w-screen bg-ytbg-light dark:bg-ytbg-dark">
  <div data-theme={$dataTheme} class="w-screen top-button-wrapper" bind:clientHeight={topBarHeight} style="height: 26px;">
    <div style="display: flex; justify-content: flex-start;">
      <!-- <span class="tiny-text">
        Preset:
      </span> -->
      {#if !paramsArchiveKey}
        <select use:exioDropdown value={
          $currentFilterPreset?.id
        } on:change={presetChangedManually} class="preset-selector">
          {#each $chatFilterPresets as preset}
            <option value={preset.id}>{preset.nickname}</option>
          {/each}
        </select>
      {:else}
        <button use:exioButton on:click={closeArchive} class="whitespace-nowrap">
          <div use:exioIcon class="shifted-icon inline-block" style="color: inherit;">
            arrow_back
          </div>
          Back
        </button>
      {/if}
    </div>
    <div style="display: flex; justify-content: flex-end;">
      {#if !paramsArchiveKey && !embedded}
        <select use:exioDropdown on:change={executeImport} style="width: 64px;">
          <option selected disabled value="import">Open</option>
          <option value="savedarchive">Archive</option>
          <option value="jsondump">JSON</option>
        </select>
      {/if}
      <select use:exioDropdown on:change={executeExport} disabled={showWelcome} style="width: 64px;">
        <option selected disabled value="export">Save</option>
        <option value="screenshot">PNG</option>
        <option value="textfile">TXT</option>
        <option value="jsondump">JSON</option>
      </select>
      <button use:exioButton on:click={clearMessages} class="whitespace-nowrap" disabled={showWelcome}>
        Clear
        <div use:exioIcon class="shifted-icon inline-block" style="color: inherit;">
          close
        </div>
      </button>
      {#if isPopout}
        <button use:exioButton on:click={openSettings} class="inline-flex gap-1 items-center">
          Settings
          <div use:exioIcon class="inline-block" style="color: inherit;">
            settings
          </div>
        </button>
      {/if}
    </div>
  </div>
  <div class="line" />
  <div class="{containerClass} container" style="font-size: 13px; height: calc(100vh - 27px);">
    {#if $enableStickySuperchatBar}
      <StickyBar />
    {/if}
    <div class="min-h-0 flex justify-end flex-col relative">
      <div bind:this={div} on:scroll={checkAtBottom} class="content overflow-y-scroll" style="height: calc(100vh - {topBarHeight}px);">
        <div style="height: {topBarSize}px;" />
        <div bind:this={screenshotElement} class="h-full">
          {#if showWelcome}
            <div class="w-full flex justify-center items-center h-full">
              <WelcomeMessage />
            </div>
          {/if}
          {#each (overrideActions.length ? overrideActions : messageActions)  as action (action.message.messageId)}
            <div
              class="hover-highlight p-1.5 w-full block"
              class:flex = {!isWelcome(action)}
              class:mention = {$enableHighlightedMentions && isMessage(action) && isMention(action.message)}
              class:mention-light = {!$smelteDark}
              on:mouseover={() => setHover(action)}
              on:focus={() => setHover(action)}
              on:mouseout={() => setHover(null)}
              on:blur={() => setHover(null)}
            >
              {#if isWelcome(action)}
                <WelcomeMessage />
              {:else if isSuperchat(action)}
                <PaidMessage message={action.message} />
              {:else if isMembership(action)}
                <MembershipItem message={action.message} />
              {:else if isMessage(action)}
                <Message
                  message={action.message}
                  deleted={action.deleted}
                  on:clientSideDelete={deleteMessageClientSide}
                  miniDropdown={Boolean(paramsArchiveKey)}
                />
              {/if}
            </div>
          {/each}
        </div>
      </div>
      <!-- {#if pinned}
        <div class="absolute top-0 w-full" bind:this={topBar}>
          <div class="mx-1.5 mt-1.5">
            <PinnedMessage pinned={pinned} on:resize={topBarResized} />
          </div>
        </div>
      {/if} -->
      {#if !isAtBottom}
        <div
          class="absolute left-1/2 transform -translate-x-1/2 bottom-0 pb-1"
          transition:fade={{ duration: 150 }}
        >
          <Button icon="arrow_downward" on:click={scrollToBottom} small />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .hover-highlight {
    background-color: transparent;
  }
  :not(.screenshot-element) .hover-highlight:hover {
    background-color: #80808040;
  }
  .mention {
    background-color: #ffe60038;
  }
  :not(.screenshot-element) .mention:hover {
    background-color: #fff48f3f;
  }
  .mention.mention-light {
    background-color: #ffe60085;
  }
  :not(.screenshot-element) .mention.mention-light:hover {
    background-color: #bfb2408f;
  }
  :global(.mode-dark) .container {
    background-color: #0f0f0f !important;
  }
  .top-button-wrapper button, .top-button-wrapper select {
    cursor: default;
    padding: 2px 5px;
    background-color: white;
  }
  :global(.mode-dark) .top-button-wrapper button, :global(.mode-dark) .top-button-wrapper select {
    background-color: #0f0f0f;
  }
  .top-button-wrapper {
    font-size: 12px;
    width: 100%;
    display: grid;
    align-content: space-between;
    justify-content: space-between;
    grid-template-columns: minmax(0, 1fr) auto;
  }
  :global(.mode-dark) .top-button-wrapper {
    background-color: #0f0f0f;
  }
  .tiny-text {
    display: flex;
    align-items: center;
    padding: 2px 5px;
    cursor: default;
    user-select: none;
    transform: translateY(0.25px);
  }
  .preset-selector {
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
</style>
