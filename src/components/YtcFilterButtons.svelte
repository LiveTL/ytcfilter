<script lang="ts">
  import { isLiveTL } from '../ts/chat-constants';
  import { exioButton, exioIcon } from 'exio/svelte';
  import { onDestroy, onMount } from 'svelte';
  const logo = chrome.runtime.getURL((isLiveTL ? 'ytcfilter' : 'assets') + '/logo-48.png');
  let dark = document.documentElement.hasAttribute('dark');
  let attrObserver: MutationObserver;
  let resizing = false;
  onMount(() => {
    attrObserver = new MutationObserver((_) => {
      dark = document.documentElement.hasAttribute('dark');
    });
    attrObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });
    const resize = (e: MouseEvent) => {
      height += e.movementY;
    };
    resizeBar.addEventListener('mousedown', (e) => {
      e.preventDefault();
      resizing = true;
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', resize);
        resizing = false;
      });
    });
  });
  onDestroy(() => {
    attrObserver.disconnect();
  });
  let resizeBar: HTMLDivElement;
  let height = 250;
  // eslint-disable-next-line prefer-const
  let windowHeight = window.innerHeight;
  $: calcHeight = resizing ? `${height}px` : `${100 * height / windowHeight}vh`;
</script>

<svelte:body bind:clientHeight={windowHeight} />

<div data-theme={dark ? 'dark' : 'light'} class="ytcf-wrapper">
  <div class="ytcf-button-wrapper">
    <div class="static-logo">
      <img src={logo} alt="logo" class="logo"/>
      YtcFilter
    </div>
    <button use:exioButton class="activator ytcf-launch-button">
      <span>Embed</span>
      <div use:exioIcon class="shifted-icon" style="color: inherit;">
        expand
      </div>
    </button>
    <button use:exioButton class="activator ytcf-popout-button">
      <span>Popout</span>
      <div use:exioIcon class="shifted-icon" style="color: inherit;">
        open_in_new
      </div>
    </button>
    <button use:exioButton class="activator ytcf-settings-button">
      <span>Settings</span>
      <div use:exioIcon class="shifted-icon" style="color: inherit;">
        settings
      </div>
    </button>
  </div>
  <div
    style="
      width: 100%;
      height: {calcHeight};
      pointer-events: {resizing ? 'none' : 'unset'};
      touch-action: {resizing ? 'none' : 'unset'};
      display: none;
    "
    class="ytcf-iframe"
  />
  <div class="ytcf-resize-bar" style="display: none;" bind:this={resizeBar}>
    <span use:exioIcon style="font-size: 2rem;">drag_handle</span>
  </div>
</div>
<style>
  .ytcf-wrapper {
    user-select: none;
  }
  :global([dark]) .ytcf-resize-bar {
    width: 100%;
    height: 10px;
    background-color: rgb(128 128 128 / 30%);
    overflow: hidden;
    align-items: center;
    justify-content: center;
    cursor: row-resize;
    user-select: none;
  }
  .static-logo {
    padding: 0.25em 0.5em;
    border: 2px solid transparent;
    cursor: pointer;
    pointer-events: none;
    user-select: none;
    touch-action: none;
    width: 100%;
    text-align: center;
  }
  .ytcf-button-wrapper {
    display: flex;
    align-content: space-between;
    justify-content: space-around;
  }
  .activator {
    background-color: transparent;
    width: 100%;
    color: inherit;
  }
  .shifted-icon {
    display: inline-block;
    transform: translateY(2px);
  }
  .logo {
    width: 15px;
    height: 15px;
    vertical-align: sub;
  }
  .ytcf-wrapper[data-theme=dark] {
    color: white;
  }
  .ytcf-wrapper[data-theme=light] {
    color: black;
  }
  :global(:not([dark]) .content-pages) {
    background-color: white;
  }
</style>
