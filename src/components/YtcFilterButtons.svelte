<script lang="ts">
  import { isLiveTL } from '../ts/chat-constants';
  import { exioButton, exioIcon } from 'exio/svelte';
  import { isDark } from '../ts/storage';
  const logo = chrome.runtime.getURL((isLiveTL ? 'ytcfilter' : 'assets') + '/logo-48.png');
</script>

<div data-theme={$isDark ? 'dark' : 'light'} class="ytcf-button-wrapper">
  <button use:exioButton class="ytcf-button">
    <img src={logo} alt="ytcfilter-logo" class="ytcfilter-logo"/>
    YtcFilter
    <div use:exioIcon class="ytcf-shifted-icon" style="color: inherit;">
      expand
    </div>
  </button>
</div>
<style>
  .ytcf-button-wrapper {
    display: flex;
    justify-content: end;
  }
  .ytcf-button {
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
  .ytcf-button-wrapper[data-theme=dark] {
    color: white;
  }
  .ytcf-button-wrapper[data-theme=light] {
    color: black;
  }
</style>
