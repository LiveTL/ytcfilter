<script lang="ts">
  import '../stylesheets/scrollbar.css';
  import { dataTheme, chatFilters, theme } from '../ts/storage';
  import '../stylesheets/ui.css';
  import { exioButton, exioCheckbox, exioDropdown, exioTextbox } from 'exio/svelte';
  import { getRandomString } from '../ts/chat-utils';
  import { tick } from 'svelte';
  import { Theme } from '../ts/chat-constants';
  $: document.documentElement.setAttribute('data-theme', $dataTheme);

  let lastItem: HTMLDivElement | null = null;
  const newFilter = async () => {
    $chatFilters = [...$chatFilters, {
      nickname: 'New Filter',
      type: 'basic',
      id: getRandomString(),
      condition: {
        type: 'includes',
        property: 'message',
        value: '',
        invert: false,
        caseSensitive: false
      },
      enabled: true
    }];
    await tick();
    if (lastItem) {
      lastItem.querySelector('input')?.select();
    }
  };
  const deleteFilter = (item: YtcF.ChatFilter) => {
    $chatFilters = $chatFilters.filter(x => x.id !== item.id);
  };

  type CachedFilter = { unsaved: YtcF.ChatFilter, saved: YtcF.ChatFilter };

  const saveFilter = (item: CachedFilter) => {
    return async () => {
      // Object.apply(item.saved, item.unsaved as any);
      // $chatFilters = [...$chatFilters];
    };
  };
  $: console.log('YtcFilterSettings.svelte ', $chatFilters);
  $: console.log('YtcFilterSettings.svelte ', $theme);

  const filterIter = (arr: YtcF.ChatFilter[]): CachedFilter[] => {
    return arr.map(item => ({
      saved: item,
      unsaved: { ...item }
    }));
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
    <div class="title">Interface</div>
    <div class="content">
      <span>Theme: </span>
      <select use:exioDropdown bind:value={$theme}>
        <option value={Theme.YOUTUBE}>Auto</option>
        <option value={Theme.LIGHT}>Light</option>
        <option value={Theme.DARK}>Dark</option>
      </select>
    </div>
  </div>
  <div class="card">
    <div class="title">Filters</div>  
    <div class="content">
      <button use:exioButton on:click={newFilter}>
        Create New Filter
      </button>
      {#each filterIter($chatFilters) as filter (filter.unsaved.id)}
        <div class="filter" bind:this={lastItem}>
          <span>Name: </span>
          <input
            class="filter-name"
            bind:value={filter.unsaved.nickname}
            use:exioTextbox
            on:input={saveFilter(filter)}
          />
          <!-- <select bind:value={filter.unsaved.type} use:exioDropdown>
            <option value="basic">Basic</option>
          </select> -->
          <button
            use:exioButton
            class="red-bg delete"
            on:click={() => deleteFilter(filter.saved)}
          >Delete</button>
          <div class="items">
            <select
              bind:value={filter.unsaved.condition.property}
              use:exioDropdown
              on:change={saveFilter(filter)}
            >
              <option value="message">Message Text</option>
              <option value="authorName">Author Name</option>
            </select>
            <select
              bind:value={filter.unsaved.condition.type}
              use:exioDropdown
              on:change={saveFilter(filter)}
            >
              <option value="includes">Contains</option>
              <option value="startsWith">Starts With</option>
              <option value="endsWith">Ends With</option>
              <option value="equals">Equals</option>
              <option value="regex">Regex</option>
            </select>
            <input
              class="filter-content"
              bind:value={filter.unsaved.condition.value}
              use:exioTextbox
              on:input={saveFilter(filter)}
            />
          </div>
          {#if 'invert' in filter.unsaved.condition}
            <div class="items">
              <input
                id="enable-{filter.unsaved.id}"
                type="checkbox"
                use:exioCheckbox
                bind:checked={filter.unsaved.enabled}
                on:change={saveFilter(filter)}
                />
              <label for="enable-{filter.unsaved.id}">Enable Filter</label>
              <input
                id="invert-{filter.unsaved.id}"
                type="checkbox"
                use:exioCheckbox
                bind:checked={filter.unsaved.condition.invert}
                on:change={saveFilter(filter)}
              />
              <label for="invert-{filter.unsaved.id}">Invert Filter</label>
              <input
                id="case-{filter.unsaved.id}"
                type="checkbox"
                use:exioCheckbox
                bind:checked={filter.unsaved.condition.caseSensitive}
                on:change={saveFilter(filter)}
              />
              <label for="case-{filter.unsaved.id}">Case Sensitive</label>
            </div>
          {/if}
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
    padding-top: 10px;
  }
  .filter {
    margin-top: 10px;
    padding: 10px;
    background-color: rgb(128 128 128 / 15%);
  }
  [data-theme='dark'] .filter {
    background-color: rgb(128 128 128 / 25%);
  }
  .filter > .items {
    display: flex;
    gap: 10px;
    margin-top: 10px;
    align-items: center;
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

