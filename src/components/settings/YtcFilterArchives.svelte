<script lang="ts">
  import '../../stylesheets/ui.css';
  import YtcFilterArchiveList from './YtcFilterArchiveList.svelte';
  import { exioButton, exioIcon, exioTextbox } from 'exio/svelte';
  let refreshFunc: any;
  export let isArchiveLoadSelection = false;
  let searchQuery = '';
</script>

<div
  class="settings-title big-text"
  style="display: flex; justify-content: space-between; padding-right: 5px;"
>
  <span>Archives</span>
  <span style="margin-left: 5px; display: inline-flex;">
    <input
      type="text"
      placeholder="Search"
      style="width: 200px; height: 32px; margin-right: 5px; font-size: 1rem;"
      use:exioTextbox
      bind:value={searchQuery}
    />
    <button use:exioButton class="refresh" on:click={refreshFunc}>
      <span use:exioIcon>refresh</span>
    </button>
  </span>
</div>
<YtcFilterArchiveList bind:refreshFunc {isArchiveLoadSelection} {searchQuery} />

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
