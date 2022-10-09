<script lang="ts">
  import '../stylesheets/scrollbar.css';
  import { dataTheme, chatFilters } from '../ts/storage';
  import '../stylesheets/ui.css';
  import { exioAccordion, exioButton, exioTextbox } from 'exio/svelte';
  import { getRandomString } from '../ts/chat-utils';
  import { tick } from 'svelte';
  $: document.documentElement.setAttribute('data-theme', $dataTheme);

  let lastItem: HTMLDetailsElement | null = null;
  const newFilter = async () => {
    $chatFilters = [...$chatFilters, {
      nickname: 'Filter #' + ($chatFilters.length + 1),
      id: getRandomString(),
      condition: {
        type: 'contains',
        property: 'message',
        value: '',
        invert: false
      }
    }];
    await tick();
    if (lastItem) {
      lastItem.open = true;
      lastItem.querySelector('input')?.select();
    }
  };
  const deleteFilter = (item: YtcF.ChatFilter) => {
    $chatFilters = $chatFilters.filter(x => x !== item);
  };
</script>

<svelte:head>
  <title>HyperChat Settings</title>
</svelte:head>

<div
  class="wrapper"
  style="scrollbar-width: thin; scrollbar-color: #888 transparent;"
  data-theme={$dataTheme}
>
  <div class="card">
    <div class="title">Filters</div>
    <div class="content">
      <button use:exioButton on:click={newFilter}>
        Create New Filter
      </button>
      {#each $chatFilters as filter (filter.id)}
        <div class="filter">
          <details use:exioAccordion bind:this={lastItem}>
            <summary>{filter.nickname}</summary>
            <div style="padding: 1rem;">
              <input
                class="filter-name"
                bind:value={filter.nickname}
                use:exioTextbox
                on:input={() => ($chatFilters = [...$chatFilters])}
              />
              <button
                use:exioButton
                class="red-bg delete"
                on:click={() => deleteFilter(filter)}
              >Delete</button>
            </div>
          </details>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .card {
    background-color: rgba(128, 128, 128, 0.2);
    padding: 10px;
  }
  .card > .title {
    font-size: 18px;
    font-weight: bold;
  }
  .card > .content {
    padding: 10px;
  }
  .filter {
    margin-top: 10px;
  }
  .filter > details[open] {
    background-color: rgb(128 128 128 / 25%);
  }
  .wrapper {
    color: black;
    font-size: 1rem;
    height: 100%;
  }
  .wrapper[data-theme='dark'] {
    color: white;
  }
  .delete {
    vertical-align: bottom;
    display: inline-block;
  }
  :global(html) {
    background-color: white;
  }
  :global(html[data-theme='dark']) {
    background-color: black;
  }
</style>

