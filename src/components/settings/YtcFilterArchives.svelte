<script lang="ts">
  import '../../stylesheets/ui.css';
  import YtcFilterArchiveList from './YtcFilterArchiveList.svelte';
  import { exioButton, exioIcon, exioTextbox } from 'exio/svelte';
  let refreshFunc: any;
  export let isArchiveLoadSelection = false;
  let searchQuery = '';
  let loadArchiveEntry: any;
  const closeFunc = () => {
    loadArchiveEntry({ key: '' })();
  };
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
    <button use:exioButton class="btn" on:click={refreshFunc}>
      <span use:exioIcon>refresh</span>
    </button>
    <button use:exioButton class="btn red-bg" on:click={closeFunc} style="margin-left: 5px;">
      <span use:exioIcon>close</span>
    </button>
  </span>
</div>
<YtcFilterArchiveList bind:refreshFunc bind:loadArchiveEntry {isArchiveLoadSelection} {searchQuery} />

<style>
  .btn {
    height: 32px;
    width: 40px;
    font-size: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
