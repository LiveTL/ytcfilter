<script lang="ts">
  import { isLiveTL } from '../ts/chat-constants';
  import { exioButton, exioIcon } from 'exio/svelte';
  import { onDestroy, onMount } from 'svelte';
  const logo = chrome.runtime.getURL((isLiveTL ? 'ytcfilter' : 'assets') + '/logo-48.png');
  let dark = document.documentElement.hasAttribute('dark');
  let attrObserver: MutationObserver;
  onMount(() => {
    attrObserver = new MutationObserver((_) => {
      dark = document.documentElement.hasAttribute('dark');
    });
    attrObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });
  });
  onDestroy(() => {
    attrObserver.disconnect();
  });
</script>

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
  </div>
  <div style="width: 100%;" class="ytcf-iframe" />
</div>
<style>
  .static-logo {
    padding: 0.25em 0px;
    border: 2px solid transparent;
  }
  .ytcf-button-wrapper {
    display: flex;
    align-content: space-between;
    justify-content: flex-end;
  }
  .activator {
    background-color: transparent;
    width: fit-content;
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
</style>
