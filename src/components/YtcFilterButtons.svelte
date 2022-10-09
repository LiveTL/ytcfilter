<script lang="ts">
  import { isLiveTL } from '../ts/chat-constants';
  import { exioButton, exioIcon } from 'exio/svelte';
  import { onDestroy, onMount } from 'svelte';
  const logo = chrome.runtime.getURL((isLiveTL ? 'ytcfilter' : 'assets') + '/logo-48.png');
  let dark = true;
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
  <button use:exioButton class="ytcf-activator-button">
    <img src={logo} alt="ytcfilter-logo" class="ytcfilter-logo"/>
    YtcFilter
    <div use:exioIcon class="ytcf-shifted-icon" style="color: inherit;">
      expand
    </div>
  </button>
  <div style="width: 100%;" class="ytcf-iframe" />
</div>
<style>
  .ytcf-wrapper {
    display: flex;
    align-items: end;
    flex-direction: column;
  }
  .ytcf-activator-button {
    background-color: transparent;
    width: fit-content;
    color: inherit;
  }
  .ytcf-shifted-icon {
    display: inline-block;
    transform: translateY(2px);
  }
  .ytcfilter-logo {
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
