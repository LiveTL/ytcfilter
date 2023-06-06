<script lang="ts">
  import '../stylesheets/scrollbar.css';
  import { dataTheme, ytDark, port, currentStorageVersion, inputDialog, initialSetupDone, errorDialog } from '../ts/storage';
  import '../stylesheets/ui.css';
  import '../stylesheets/line.css';
  import { exioButton, exioComponent, exioIcon, exioZoomInAnimation } from 'exio/svelte';
  import { getBrowser, Browser } from '../ts/chat-constants';
  import { onMount } from 'svelte';
  import ExioRadios from './common/ExioRadios.svelte';
  import { downloadV2Data, getV2Storage, migrateV2toV3, readFromJson } from '../ts/ytcf-logic';
  import YtcFilterInputDialog from './YtcFilterInputDialog.svelte';
  import YtcFilterErrorDialog from './YtcFilterErrorDialog.svelte';
  import LoadingBar from './common/LoadingBar.svelte';
  $: document.documentElement.setAttribute('data-theme', $dataTheme);
  let hasV2Data = false;
  const params = new URLSearchParams(window.location.search);
  const paramsTabId = params.get('tabid');
  const paramsFrameId = params.get('frameid');
  const referrer = params.get('referrer');
  let value = 'migrate-filters-and-archives';
  let loading = false;
  onMount(async () => {
    if (paramsTabId != null && paramsFrameId != null && paramsTabId.length >= 1 && paramsFrameId.length >= 1) {
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
    }
    await currentStorageVersion.ready();
    hasV2Data = Boolean(await getV2Storage());
    value = hasV2Data ? 'migrate-filters-and-archives' : 'scratch';
  });
  let currentPanel: 'welcome' | 'migrate' | 'done' = 'welcome';
  const startSetup = () => (currentPanel = 'migrate');
  const cancelled = (reason: Error | null) => {
    $inputDialog = null;
    loading = false;
    if (reason === null) return;
    $errorDialog = {
      title: 'Error Importing Data',
      message: reason.message,
      action: {
        text: 'OK',
        callback: () => ($errorDialog = null)
      }
    };
  };
  const startImport = async () => {
    if (value === 'scratch') {
      $currentStorageVersion = 'v3';
      $initialSetupDone = true;
    } else if (value.startsWith('migrate')) {
      loading = true;
      await migrateV2toV3({ presetsAndFilters: value.includes('filters'), archives: value.includes('archives') });
      loading = false;
    } else if (value === 'paste-json') {
      loading = true;
      $inputDialog = {
        title: 'Import v2 JSON data',
        prompts: [{
          label: 'Paste JSON data here',
          originalValue: '',
          hideLabel: true,
          large: true
        }],
        // message: 'Paste your v2 JSON data below.',
        action: {
          async callback(values) {
            try {
              const json = JSON.parse(values[0]);
              await migrateV2toV3({ presetsAndFilters: true, archives: true }, json);
            } catch (e) {
              console.error(e);
              cancelled(e as any);
            }
          },
          text: 'Import',
          cancelled: () => cancelled(null)
        }
      };
    } else if (value === 'upload-json') {
      loading = true;
      try {
        await migrateV2toV3({ presetsAndFilters: true, archives: true }, await readFromJson());
      } catch (e) {
        console.error(e);
        cancelled(e as any);
      }
      loading = false;
    }
  };
  $: if ($initialSetupDone) currentPanel = 'done';
  const returnToYtcF = () => (window.location.href = referrer || window.location.href);
</script>

<YtcFilterInputDialog />
<YtcFilterErrorDialog />

<div
  class="wrapper"
  data-theme={$dataTheme}
  use:exioComponent
>
  <div class="flex-parent">
    {#if loading}
      <LoadingBar />
    {:else}
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
          {#if hasV2Data}
            <div style="margin-top: 1rem; font-size: 1rem;">
              Back up your v2 data:
              <a href="/" style="color: #3ba7ff; text-decoration: none;" on:click={e => {
                e.preventDefault();
                downloadV2Data();
              }}>
                ytcf-v2-data.json
                <span use:exioIcon style="color: inherit; transform: translate(-0.2em, 0.2em);">download</span>
              </a>
            </div>
          {/if}
          <div style="font-size: 1rem; margin-top: 1rem;">
            <ExioRadios options={[
              ...(
                hasV2Data
                ? [
                  {
                    label: 'Import filters, presets, and archives',
                    value: 'migrate-filters-and-archives'
                  }, {
                    label: 'Import filters and presets only',
                    value: 'migrate-filters-only'
                  }, {
                    label: 'Import archives only',
                    value: 'migrate-archives-only'
                  }
                ]
                : []
              ),
              {
              label: 'Upload custom v2 storage JSON',
              value: 'upload-json'
            }, {
              label: 'Paste custom v2 storage JSON',
              value: 'paste-json'
            }, {
              label: 'Start from scratch',
              value: 'scratch'
            }]} bind:value />
            <!-- <div style="width: 100%; display: flex; gap: 5px; margin-top: 0.5em; margin-left: 0.3em;">
              <input type="checkbox" bind:checked={alsoExport} id="also-export" use:exioCheckbox class="also-export" />
              <label for="also-export">Also back up v2 data as .json</label>
            </div> -->
            <button use:exioButton style="font-size: 1rem; margin-top: 1rem;" on:click={startImport}>
              Start Import
            </button>
          </div>
        </div>
      {:else if currentPanel === 'done'}
        <div style="text-align: center;" use:exioZoomInAnimation>
          <div style="font-size: 1.5rem; color: #3ba7ff;">You're all set!</div>
          <button use:exioButton style="font-size: 1rem; margin-top: 1rem;" on:click={returnToYtcF}>
            Let's Go!
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* .also-export {
    display: inline-flex;
    margin-top: 2px;
  } */
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
