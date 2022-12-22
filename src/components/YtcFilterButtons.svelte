<script lang="ts">
  import { isLiveTL } from '../ts/chat-constants';
  import { exioButton, exioIcon } from 'exio/svelte';
  import { onDestroy, onMount } from 'svelte';
  const logo = chrome.runtime.getURL((isLiveTL ? 'ytcfilter' : 'assets') + '/logo-48.png');
  let dark = document.documentElement.hasAttribute('dark');
  let attrObserver: MutationObserver;
  let resizing = false;
  let touchOrigin: { x: number, y: number } | null = null;
  onMount(() => {
    attrObserver = new MutationObserver((_) => {
      dark = document.documentElement.hasAttribute('dark');
    });
    attrObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });
    const resizeMouse = (e: MouseEvent) => {
      height = e.y - ytcfIframe.getBoundingClientRect().top;
    };
    const resizeTouch = (e: TouchEvent) => {
      height = e.touches[0].clientY - ytcfIframe.getBoundingClientRect().top;
    };
    resizeBar.addEventListener('mousedown', (e) => {
      e.preventDefault();
      resizing = true;
      document.addEventListener('mousemove', resizeMouse);
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', resizeMouse);
        resizing = false;
      });
    });
    resizeBar.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchOrigin = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      resizing = true;
      document.addEventListener('touchmove', resizeTouch);
      document.addEventListener('touchend', () => {
        document.removeEventListener('touchmove', resizeTouch);
        resizing = false;
      });
    });
    window.addEventListener('resize', () => {
      windowHeight = window.innerHeight;
    });
  });
  onDestroy(() => {
    attrObserver.disconnect();
  });
  let resizeBar: HTMLDivElement;
  let height = 250;
  // eslint-disable-next-line prefer-const
  let windowHeight = window.innerHeight;
  let buttons: HTMLDivElement;
  let ytcfIframe: HTMLDivElement;
  $: pxHeight = Math.min(
    windowHeight - 10 -
    (buttons ? buttons.getBoundingClientRect().top : 0) -
    (buttons ? buttons.clientHeight : 0),
    Math.max(height, 0)
  );
  $: calcHeight = resizing ? `${pxHeight}px` : `${100 * pxHeight / windowHeight}vh`;
  $: toggleMouse(resizing);
  function toggleMouse(toggle: boolean) {
    const elem = document.querySelector('#hyperchat') as HTMLIFrameElement | null;
    if (elem) {
      console.log(elem, toggle);
      elem.style.pointerEvents = toggle ? 'none' : 'auto';
      elem.style.touchAction = toggle ? 'none' : 'auto';
    }
  }
</script>

<svelte:body bind:clientHeight={windowHeight} />

<div data-theme={dark ? 'dark' : 'light'} class="ytcf-wrapper">
  <div class="ytcf-button-wrapper" bind:this={buttons}>
    <div class="static-logo">
      <img src={logo} alt="logo" class="logo"/>
      <span class="static-logo-text">YtcFilter</span>
    </div>
    <button use:exioButton class="activator ytcf-launch-button">
      <span>Embed</span>
      <div use:exioIcon class="shifted-icon top-bar-icon">
        expand
      </div>
    </button>
    <button use:exioButton class="activator ytcf-popout-button">
      <span>Popout</span>
      <div use:exioIcon class="shifted-icon top-bar-icon">
        open_in_new
      </div>
    </button>
    <button use:exioButton class="activator ytcf-settings-button">
      <span>Settings</span>
      <div use:exioIcon class="shifted-icon top-bar-icon">
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
    bind:this={ytcfIframe}
  />
  <div class="ytcf-resize-bar" style="display: none;" bind:this={resizeBar}>
    <span use:exioIcon style="font-size: 2rem;">drag_handle</span>
  </div>
</div>
<style>
  .ytcf-wrapper {
    user-select: none;
    white-space: nowrap;
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
    position: relative;
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
  @media (max-width: 350px) {
    .static-logo-text {
      display: none;
    }
    .ytcf-button-wrapper {
      display: grid !important;
      grid-template-columns: auto 1fr 1fr 1fr;
    }
    .static-logo {
      width: auto !important;
    }
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
    transform: translateY(2.5px);
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
  .top-bar-icon {
    color: #3ba7ff;
  }
</style>
