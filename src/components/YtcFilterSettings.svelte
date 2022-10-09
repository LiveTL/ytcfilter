<script lang="ts">
  import '../stylesheets/scrollbar.css';
  import { dataTheme, chatFilters } from '../ts/storage';
  import '../stylesheets/ui.css';
  import { exioButton, exioTextbox } from 'exio/svelte';
  $: document.documentElement.setAttribute('data-theme', $dataTheme);

  const newFilter = () => {
    $chatFilters = [...$chatFilters, {
      nickname: 'New Filter',
      condition: {
        invert: false,
        type: 'contains',
        value: ''
      }
    }];
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
      {#each $chatFilters as filter}
        <div class="filter">
          <input class="filter-name" bind:value={filter.nickname} use:exioTextbox />
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
  .wrapper {
    color: black;
    font-size: 1rem;
    height: 100%;
  }
  .wrapper[data-theme='dark'] {
    color: white;
  }
  :global(html) {
    background-color: white;
  }
  :global(html[data-theme='dark']) {
    background-color: black;
  }
</style>

