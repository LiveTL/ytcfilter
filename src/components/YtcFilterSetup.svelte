<script lang="ts">
  import '../stylesheets/scrollbar.css';
  import { dataTheme, ytDark, port, currentStorageVersion } from '../ts/storage';
  import '../stylesheets/ui.css';
  import '../stylesheets/line.css';
  import { exioButton, exioCheckbox, exioComponent, exioIcon, exioZoomInAnimation } from 'exio/svelte';
  import { getBrowser, Browser } from '../ts/chat-constants';
  import { onMount } from 'svelte';
  import ExioRadios from './common/ExioRadios.svelte';
  $: document.documentElement.setAttribute('data-theme', $dataTheme);
  let loaded = false;
  const params = new URLSearchParams(window.location.search);
  const paramsTabId = params.get('tabid');
  const paramsFrameId = params.get('frameid');
  const referrer = params.get('referrer');
  onMount(async () => {
    if (paramsTabId == null || paramsFrameId == null || paramsTabId.length < 1 || paramsFrameId.length < 1) {
      return;
    }
    if (getBrowser() === Browser.FIREFOX) {
      const frameInfo = {
        tabId: parseInt(paramsTabId),
        frameId: parseInt(paramsFrameId)
      };

      $port = chrome.runtime.connect({ name: JSON.stringify(frameInfo) });
    } else {
      $port = chrome.tabs.connect(parseInt(paramsTabId), { frameId: parseInt(paramsFrameId) });
    }
    const onPortMessage = (response: Chat.BackgroundResponse) => {
      switch (response.type) {
        case 'themeUpdate':
          $ytDark = response.dark;
          break;
      }
    };
    $port?.onMessage.addListener(onPortMessage);
    $port?.postMessage({
      type: 'getTheme'
    });
    await currentStorageVersion.ready();
    loaded = true;
  });
  let currentPanel: 'welcome' | 'migrate' | 'done' = 'welcome';
  const startSetup = () => (currentPanel = 'migrate');
  let value = 'filters-and-archives';
  const completeSetup = () => {};
</script>

<div
  class="wrapper"
  data-theme={$dataTheme}
  use:exioComponent
>
  <div class="flex-parent">
    {#if currentPanel === 'welcome'}
      <div style="text-align: center;" use:exioZoomInAnimation>
        <div style="font-size: 1.5rem;">Welcome to</div>
        <div class="ytcf-text">YtcFilter v3</div>
        <div style="font-size: 0.9rem;">Made with 🧡 by the devs<br />behind LiveTL and HyperChat</div>
        <button use:exioButton style="font-size: 1rem; margin-top: 1rem;" on:click={startSetup}>
          Start Setup
        </button>
      </div>
    {:else if currentPanel === 'migrate'}
      <div style="text-align: center;" use:exioZoomInAnimation>
        <div style="font-size: 1.5rem; color: #3ba7ff;">Import Data from v2</div>
        <div style="margin-top: 1rem; font-size: 1rem;">
          Back up your v2 data:
          <a href="#" style="color: #3ba7ff; text-decoration: none;">
            ytcf-v2-data.json
            <span use:exioIcon style="color: inherit; transform: translate(-0.2em, 0.2em);">download</span>
          </a>
        </div>
        <div style="font-size: 1rem; margin-top: 1rem;">
          <ExioRadios options={[{
            label: 'Import filters, presets, and archives',
            value: 'filters-and-archives'
          }, {
            label: 'Import filters and presets only',
            value: 'filters-only'
          }, {
            label: 'Import archives only',
            value: 'archives-only'
          }, {
            label: 'Start from scratch',
            value: 'scratch'
          }]} bind:value />
          <!-- <div style="width: 100%; display: flex; gap: 5px; margin-top: 0.5em; margin-left: 0.3em;">
            <input type="checkbox" bind:checked={alsoExport} id="also-export" use:exioCheckbox class="also-export" />
            <label for="also-export">Also back up v2 data as .json</label>
          </div> -->
          <button use:exioButton style="font-size: 1rem; margin-top: 1rem;" on:click={completeSetup}>
            Complete Setup
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .also-export {
    display: inline-flex;
    margin-top: 2px;
  }
  .ytcf-text {
    background: linear-gradient(135deg, #2b6eff 0%, #2099f2 50%, #2bbdd0 100%);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    font-size: 2.5rem;
    font-weight: 600;
  }
  .wrapper {
    scrollbar-width: thin;
    scrollbar-color: #888 transparent;
    user-select: none;
    width: 100%;
    min-height: 100vh;
  }
  :global(html) {
    background-color: white;
  }
  :global(html[data-theme='dark']) {
    background-color: #0f0f0f;
  }
  .flex-parent {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  :global(body) {
    margin: 0px;
    min-height: 100vh;
  }
</style>
