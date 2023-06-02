<script lang="ts">
  import '../stylesheets/scrollbar.css';
  import { onDestroy, afterUpdate, tick, onMount } from 'svelte';
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
    getBrowser,
    Browser,
    Theme,
    YoutubeEmojiRenderMode,
    chatUserActionsItems,
    isLiveTL
  } from '../ts/chat-constants';
  import { isAllEmoji, isChatMessage, isPrivileged, responseIsAction, createPopup, getRandomString } from '../ts/chat-utils';
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
    defaultFilterPresetId,
    videoInfo,
    overrideFilterPresetId,
    ytDark
  } from '../ts/storage';
  import { version } from '../manifest.json';
  import { shouldFilterMessage, saveMessageActions, findSavedMessageActionKey, getSavedMessageDumpActions, getSavedMessageDumpInfo, getAutoActivatedPreset, downloadAsJson, downloadAsTxt, readFromJson, redirectIfInitialSetup } from '../ts/ytcf-logic';
  import { exioButton, exioDropdown, exioIcon } from 'exio/svelte';
  import '../stylesheets/line.css';

  const welcome = { welcome: true, message: { messageId: 'welcome' } };
  type Welcome = typeof welcome;

  const params = new URLSearchParams(window.location.search);
  const paramsTabId = params.get('tabid');
  const paramsFrameId = params.get('frameid');
  const paramsIsReplay = params.get('isReplay');
  const paramsContinuation = params.get('continuation');

  // const CHAT_HISTORY_SIZE = 150;
  // const TRUNCATE_SIZE = 20;
  let messageActions: (Chat.MessageAction | Welcome)[] = [];
  const messageKeys = new Set<string>();
  let pinned: Ytc.ParsedPinned | null;
  let div: HTMLElement;
  let isAtBottom = true;
  // let truncateInterval: number;
  const isReplay = paramsIsReplay;
  const smelteDark = dark();
  let initialized = false;

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

  const messageBlockers = [memberOnlyBlocker, emojiSpamBlocker];

  const shouldShowMessage = (m: Chat.MessageAction, forceDisplay = false): boolean => (
    ((!messageBlockers.some(blocker => blocker(m)) || forceDisplay) && !duplicateKeyBlocker(m))
    // do not flip the order of the conditions above
    // this gives the duplicateKeyBlocker a chance to add the key
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

  const applyYtcf = async (items: Chat.MessageAction[], forceDisplay = false) => {
    const newItems = [];
    for (const a of items) {
      if (
        (forceDisplay || await shouldFilterMessage(a)) &&
        shouldShowMessage(a, forceDisplay)
      ) {
        newItems.push(a);
      }
    }
    return newItems;
  };

  let piledMessages: {
    messagesAction: Chat.MessagesAction;
    isInitial: boolean;
    forceDisplay: boolean;
  }[] = [];

  const newMessages = async (
    messagesAction: Chat.MessagesAction, isInitial: boolean, forceDisplay = false
  ) => {
    if (!isAtBottom) {
      piledMessages = [...piledMessages, { messagesAction, isInitial, forceDisplay }];
      return;
    }
    // On replays' initial data, only show messages with negative timestamp
    if (isInitial && isReplay) {
      messageActions = [...messageActions, ...(await applyYtcf(filterTickers(messagesAction.messages).filter(
        (a) => a.message.timestamp.startsWith('-')
      ), forceDisplay))];
    } else {
      messageActions = [...messageActions, ...(await applyYtcf(filterTickers(messagesAction.messages), forceDisplay))];
    }
    // if (!isInitial) checkTruncateMessages();
  };

  $: if (isAtBottom && piledMessages.length > 0) {
    for (const item of piledMessages) {
      newMessages(item.messagesAction, item.isInitial, item.forceDisplay);
    }
    piledMessages = [];
  }


  const onBonk = (bonk: Ytc.ParsedBonk) => {
    messageActions.forEach((action) => {
      if (isWelcome(action)) return;
      if (action.message.author.id === bonk.authorId) {
        action.deleted = { replace: bonk.replacedMessage };
      }
    });
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
    messageActions.some((action) => {
      if (isWelcome(action)) return false;
      if (action.message.messageId === deletion.messageId) {
        action.deleted = { replace: deletion.replacedMessage };
        return true;
      }
      return false;
    });
  };

  const onChatAction = (action: Chat.Actions, isInitial = false) => {
    switch (action.type) {
      case 'messages':
        newMessages(action, isInitial);
        break;
      case 'bonk':
        onBonk(action.bonk);
        break;
      case 'delete':
        onDelete(action.deletion);
        break;
      case 'pin':
        pinned = action;
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
    const data = await getSavedMessageDumpActions(key);
    if (!data) return;
    newMessages({
      type: 'messages',
      messages: data
    }, false, true);
  };

  const onPortMessage = (response: Chat.BackgroundResponse) => {
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
        $videoInfo = response.videoInfo;
        initialized = true;
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

  // Doesn't work well with onMount, so onLoad will have to do
  const onLoad = () => {
    $lastOpenedVersion = version;
    document.body.classList.add('overflow-hidden');

    if (paramsTabId == null || paramsFrameId == null || paramsTabId.length < 1 || paramsFrameId.length < 1) {
      console.error('No tabId or frameId found from params');
      return;
    }

    // ff doesn't support extension to content script raw messaging yet
    if (getBrowser() === Browser.FIREFOX) {
      const frameInfo = {
        tabId: parseInt(paramsTabId),
        frameId: parseInt(paramsFrameId)
      };

      $port = chrome.runtime.connect({ name: JSON.stringify(frameInfo) });
    } else {
      $port = chrome.tabs.connect(parseInt(paramsTabId), { frameId: parseInt(paramsFrameId) });
    }

    $port?.onMessage.addListener(onPortMessage);

    $port?.postMessage({
      type: 'registerClient',
      getInitialData: true
    });
    $port?.postMessage({
      type: 'getTheme'
    });
  };

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

  const containerClass = 'h-screen w-screen text-black dark:text-white bg-ytbg-light dark:bg-ytbg-dark flex flex-col justify-between max-w-none';

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

  const importJsonDump = async () => {
    const obj = await readFromJson();
    if (obj) {
      newMessages({
        type: 'messages',
        messages: obj.actions
      }, false, true);
    }
  };

  const executeImport = (e: any) => {
    const el = (e.target as HTMLSelectElement);
    switch (el.value) {
      case 'jsondump':
        importJsonDump();
        break;
      case 'savedarchive': {
        const paramsClone = new URLSearchParams(params.toString());
        paramsClone.set('isArchiveLoadSelection', 'true');
        createPopup(chrome.runtime.getURL(
          (isLiveTL ? 'hyperchat/options.html' : 'options.html') + '?' + paramsClone.toString()
        ));
        break;
      }
    }
    el.value = 'import';
  };

  let screenshotElement: HTMLDivElement | undefined;
  let hiddenElement: HTMLDivElement | undefined;
  const exportScreenshot = async () => {
    const { default: html2canvas } = await import('html2canvas');
    const clonedNode = screenshotElement?.cloneNode(true) as HTMLDivElement;
    clonedNode.id = 'screenshot-element';
    hiddenElement?.appendChild(clonedNode);
    const style = document.querySelector('#shift-screenshot') as HTMLStyleElement;
    const bottomNode = document.createElement('div');
    clonedNode.appendChild(bottomNode);
    bottomNode.id = 'screenshot-bottom';
    const hrefNode = document.createElement('div');
    hrefNode.style.textDecoration = 'underline';
    bottomNode.style.transform = 'skew(-7.5deg)';
    hrefNode.innerText = 'livetl.app/ytcfilter';
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
  $: showWelcome = initialized && messageActions.length === 0;

  const clearMessages = () => {
    messageKeys.clear();
    messageActions = [];
  };
  let key = '';
  const initMessageStorage = async () => {
    let tempKey = await findSavedMessageActionKey(paramsContinuation, $videoInfo);
    tempKey = tempKey === null ? getRandomString() : tempKey;
    const newMsgs = await getSavedMessageDumpActions(tempKey);
    if (newMsgs?.length) {
      newMessages({
        type: 'messages',
        messages: newMsgs
      }, false, true);
    }
    key = tempKey;
    const cachedPreset = (await getSavedMessageDumpInfo(key))?.presetId;
    if (!$overrideFilterPresetId && cachedPreset) {
      $overrideFilterPresetId = cachedPreset;
    }
  };
  $: if (initialized) {
    initMessageStorage();
  }
  $: if (key) {
    saveMessageActions(
      key,
      paramsContinuation,
      $videoInfo,
      messageActions.filter(item => !isWelcome(item)) as Chat.MessageAction[],
      $currentFilterPreset.id
    );
  }
  let isPopout = false;
  onMount(async () => {
    await redirectIfInitialSetup();
    try {
      if (window.parent === window) {
        import('../ts/resize-tracker');
        isPopout = true;
      }
    } catch (e) {
    }
  });
  const openSettings = () => createPopup(chrome.runtime.getURL((isLiveTL ? 'ytcfilter' : '') + '/options.html'));

  const presetChangedManually = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const presetId = target.value;
    $defaultFilterPresetId = presetId;
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

  $: if (initialized && $videoInfo !== null) {
    overwriteOverride();
  }
  let topBarHeight = 0;
</script>

<ReportBanDialog />
<SuperchatViewDialog />

<svelte:window on:resize={() => {
  scrollToBottom();
  topBarResized();
}} on:load={onLoad} />

<div bind:this={hiddenElement} style="opacity: 0; position: absolute; z-index: -1;" />

<div style="display: grid; grid-template-rows: auto auto 1fr;" class="h-screen w-screen bg-ytbg-light dark:bg-ytbg-dark">
  <div data-theme={$dataTheme} class="w-screen top-button-wrapper" bind:clientHeight={topBarHeight}>
    <div style="display: flex; justify-content: flex-start;">
      <!-- <span class="tiny-text">
        Preset:
      </span> -->
      <select use:exioDropdown value={
        $currentFilterPreset?.id
      } on:change={presetChangedManually} class="preset-selector">
        {#each $chatFilterPresets as preset}
          <option value={preset.id}>{preset.nickname}</option>
        {/each}
      </select>
    </div>
    <div style="display: flex; justify-content: flex-end;">
      <select use:exioDropdown on:change={executeImport} style="width: 64px;">
        <option selected disabled value="import">Load</option>
        <option value="savedarchive">Archive</option>
        <option value="jsondump">JSON</option>
      </select>
      <select use:exioDropdown on:change={executeExport} disabled={showWelcome} style="width: 64px;">
        <option selected disabled value="export">Save</option>
        <option value="screenshot">PNG</option>
        <option value="textfile">TXT</option>
        <option value="jsondump">JSON</option>
      </select>
      <button use:exioButton on:click={clearMessages} class="whitespace-nowrap">Clear</button>
      {#if isPopout}
        <button use:exioButton on:click={openSettings} class="inline-flex gap-1 items-center">
          Settings
          <div use:exioIcon class="shifted-icon inline-block" style="color: inherit;">
            settings
          </div>
        </button>
      {/if}
    </div>
  </div>
  <div class="line" />
  <div class="{containerClass} container" style="font-size: 13px;">
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
          {#each messageActions as action (action.message.messageId)}
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
