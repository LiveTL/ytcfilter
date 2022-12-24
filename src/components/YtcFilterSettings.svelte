<script lang="ts">
  import '../stylesheets/scrollbar.css';
  import { dataTheme } from '../ts/storage';
  import '../stylesheets/ui.css';
  import '../stylesheets/line.css';
  import { isLiveTL } from '../ts/chat-constants';
  import YtcFilterConfirmation from './YtcFilterConfirmation.svelte';
  import YtcFilterInputDialog from './YtcFilterInputDialog.svelte';
  import YtcFilterGeneral from './settings/YtcFilterGeneral.svelte';
  import YtcFilterFilters from './settings/YtcFilterFilters.svelte';
  $: document.documentElement.setAttribute('data-theme', $dataTheme);
</script>

<svelte:head>
  <title>YtcFilter Settings</title>
</svelte:head>

<YtcFilterConfirmation />
<YtcFilterInputDialog />

<div
  class="wrapper"
  style="scrollbar-width: thin; scrollbar-color: #888 transparent; user-select: none;"
  data-theme={$dataTheme}
>
  {#if !isLiveTL}
    <div class="settings-card">
      <YtcFilterGeneral />
    </div>
  {/if}
  <div class="settings-card">
    <YtcFilterFilters />
  </div>
</div>

<style>
  :global(html) {
    background-color: white;
  }
  :global(html[data-theme='dark']) {
    background-color: black;
  }
  .wrapper {
    color: black;
    font-size: 1rem;
    height: 100%;
  }
  .wrapper[data-theme='dark'] {
    color: white;
  }
</style>
