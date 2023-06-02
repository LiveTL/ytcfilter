<script lang="ts">
  import '../../stylesheets/ui.css';
  import YtcFilterArchiveList from './YtcFilterArchiveList.svelte';
  import { exioButton, exioIcon } from 'exio/svelte';
  let refreshFunc: any;
  export let isArchiveLoadSelection = false;
</script>

<div
  class="settings-title big-text"
  style="display: flex; justify-content: space-between; padding-right: 5px;"
>
  <span>Archives</span>
  <button use:exioButton class="refresh" on:click={refreshFunc}>
    <span use:exioIcon>refresh</span>
  </button>
</div>
<YtcFilterArchiveList bind:refreshFunc {isArchiveLoadSelection} />

<style>
  .refresh {
    height: 32px;
    width: 40px;
    font-size: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
