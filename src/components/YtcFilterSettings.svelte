<script lang="ts">
  import '../stylesheets/scrollbar.css';
  import { dataTheme, chatFilters, theme } from '../ts/storage';
  import '../stylesheets/ui.css';
  import { exioButton, exioCheckbox, exioIcon, exioDropdown, exioTextbox } from 'exio/svelte';
  import { getRandomString } from '../ts/chat-utils';
  import { onDestroy, tick } from 'svelte';
  import { Theme } from '../ts/chat-constants';
  $: document.documentElement.setAttribute('data-theme', $dataTheme);

  let lastItem: HTMLDivElement | null = null;
  const newFilter = async () => {
    $chatFilters = [...$chatFilters, {
      nickname: 'New Filter',
      type: 'basic',
      id: getRandomString(),
      conditions: [{
        type: 'includes',
        property: 'message',
        value: '',
        invert: false,
        caseSensitive: false
      }],
      enabled: true
    }];
    unsavedFilters = $chatFilters;
    await tick();
    if (lastItem) {
      lastItem.querySelector('input')?.select();
      lastItem.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const deleteFilter = (item: YtcF.ChatFilter) => {
    $chatFilters = $chatFilters.filter(x => x.id !== item.id);
    unsavedFilters = $chatFilters;
  };

  let unsavedFilters: YtcF.ChatFilter[] = [];

  chatFilters.ready().then(() => {
    unsavedFilters = $chatFilters;
  });

  let saveTimeout: any = null;

  const saveFilters = async () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(async () => {
      unsavedFilters = [...unsavedFilters];
      $chatFilters = unsavedFilters;
    }, 50);
  };

  onDestroy(() => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
  });

  const isTextFilter = (filter: YtcF.FilterCondition): filter is YtcF.StringCondition =>
    ['message', 'authorName'].includes(filter.property);

  const deleteCondition = (filter: YtcF.ChatFilter, index: number) => {
    filter.conditions.splice(index, 1);
    saveFilters();
  };
</script>

<svelte:head>
  <title>YtcFilter Settings</title>
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
      {#each unsavedFilters as filter (filter.id)}
        <div class="filter" bind:this={lastItem}>
          <input
            class="filter-name"
            bind:value={filter.nickname}
            use:exioTextbox
            on:input={saveFilters}
          />
          <!-- <select bind:value={filter.type} use:exioDropdown>
            <option value="basic">Basic</option>
          </select> -->
          <button
            use:exioButton
            class="red-bg delete"
            on:click={() => deleteFilter(filter)}
          >
            <span use:exioIcon class="offset-1px">delete_forever</span>
          </button>
          {#each filter.conditions as condition, i}
            <div class="filter-items-wrapper">
              <div class="items">
                {#if isTextFilter(condition)}
                  <select
                    bind:value={condition.property}
                    use:exioDropdown
                    on:change={saveFilters}
                  >
                    <option value="message">Message Text</option>
                    <option value="authorName">Author Name</option>
                  </select>
                  <select
                    bind:value={condition.type}
                    use:exioDropdown
                    on:change={saveFilters}
                  >
                    <option value="includes">Contains</option>
                    <option value="startsWith">Starts With</option>
                    <option value="endsWith">Ends With</option>
                    <option value="equals">Equals</option>
                    <option value="regex">Regex</option>
                  </select>
                  <input
                    class="filter-content"
                    bind:value={condition.value}
                    use:exioTextbox
                    on:input={saveFilters}
                  />
                {/if}
              </div>
              <button
                use:exioButton
                class="red-bg delete"
                on:click={() => deleteCondition(filter, i)}
              >
                <span use:exioIcon class="offset-1px">close</span>
              </button>
            </div>
          {/each}
          <!-- {#if isTextFilter(filter)}
            <div class="items">
              <input
                id="enable-{filter.id}"
                type="checkbox"
                use:exioCheckbox
                bind:checked={filter.enabled}
                on:change={saveFilters}
                />
              <label for="enable-{filter.id}">Enable Filter</label>
              <input
                id="invert-{filter.id}"
                type="checkbox"
                use:exioCheckbox
                bind:checked={filter.condition.invert}
                on:change={saveFilters}
              />
              <label for="invert-{filter.id}">Invert Filter</label>
              <input
                id="case-{filter.id}"
                type="checkbox"
                use:exioCheckbox
                bind:checked={filter.condition.caseSensitive}
                on:change={saveFilters}
              />
              <label for="case-{filter.id}">Case Sensitive</label>
            </div>
          {/if} -->
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
  .filter-content {
    width: 100%;
  }
  .card > .title {
    font-size: 18px;
    font-weight: bold;
  }
  .card > .content {
    padding-top: 10px;
  }
  .filter {
    padding: 10px;
    background-color: rgb(128 128 128 / 15%);
    margin: 10px 0px;
  }
  [data-theme='dark'] .filter {
    background-color: rgb(128 128 128 / 25%);
  }
  .filter-items-wrapper {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 10px;
  }
  .filter-items-wrapper > .items {
    display: grid;
    gap: 10px;
    align-items: center;
    grid-template-columns: repeat(2, fit-content(50%)) 1fr;
    width: 100%;
  }
  @media (max-width: 600px) {
    .filter-items-wrapper > .items {
      display: flex;
      flex-direction: column;
    }
    .filter-items-wrapper > .items select {
      width: 100%;
    }
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

