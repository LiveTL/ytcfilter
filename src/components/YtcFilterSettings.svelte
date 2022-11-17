<script lang="ts">
  import '../stylesheets/scrollbar.css';
  import { dataTheme, chatFilters, theme, isDark } from '../ts/storage';
  import '../stylesheets/ui.css';
  import '../stylesheets/line.css';
  import { exioButton, exioCheckbox, exioIcon, exioDropdown, exioTextbox, exioDialog } from 'exio/svelte';
  import { getRandomString } from '../ts/chat-utils';
  import { onDestroy, tick } from 'svelte';
  import { Theme, isLiveTL } from '../ts/chat-constants';
  $: document.documentElement.setAttribute('data-theme', $dataTheme);

  let lastItem: HTMLDivElement | null = null;
  const newFilter = async () => {
    $chatFilters = [...$chatFilters, {
      nickname: 'Unnamed Filter',
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
  let deleteDialog: YtcF.ChatFilter | null = null;
  let lastDialogName = '';
  $: lastDialogName = deleteDialog?.nickname ?? lastDialogName;
  const deleteFilter = () => {
    const item = deleteDialog as YtcF.ChatFilter;
    $chatFilters = $chatFilters.filter(x => x.id !== item.id);
    unsavedFilters = $chatFilters;
    deleteDialog = null;
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
      for (const filter of unsavedFilters) {
        for (const condition of filter.conditions) {
          if (!isTextFilter(condition)) {
            condition.type = 'boolean';
          } else if (condition.type as string === 'boolean') {
            condition.type = 'includes';
          }
        }
      }
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
    ['message', 'authorName', 'authorChannelId'].includes(filter.property);

  const deleteCondition = (filter: YtcF.ChatFilter, index: number) => {
    filter.conditions.splice(index, 1);
    saveFilters();
  };
  const addCondition = (filter: YtcF.ChatFilter) => {
    filter.conditions.push({
      type: 'includes',
      property: 'message',
      value: '',
      invert: false,
      caseSensitive: false
    });
    saveFilters();
  };
</script>

<svelte:head>
  <title>YtcFilter Settings</title>
</svelte:head>

<dialog
  use:exioDialog={{
    backgroundColor: $isDark ? 'black' : 'white'
  }}
  open={Boolean(deleteDialog)}
  style="font-size: 1rem;"
>
  <div class="title">Delete "{lastDialogName}"?</div>
  <p>This action cannot be undone.</p>
  <div style="display: flex; justify-content: flex-end; gap: 10px;">
    <button on:click={() => (deleteDialog = null)} use:exioButton>Cancel</button>
    <button on:click={() => deleteFilter()} use:exioButton class="red-bg">Delete</button>
  </div>
</dialog>

<div
  class="wrapper"
  style="scrollbar-width: thin; scrollbar-color: #888 transparent;"
  data-theme={$dataTheme}
>
  {#if !isLiveTL}
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
  {/if}
  <div class="card" style="padding: 10px 10px 5px 10px;">
    <div class="title">Filters</div>  
    <div class="content" style="padding-top: 0px;">
      {#each unsavedFilters as filter (filter.id)}
        <div class="filter" bind:this={lastItem}>
          <!-- <select bind:value={filter.type} use:exioDropdown>
            <option value="basic">Basic</option>
          </select> -->
          <div class="filter-header">
            <div class="item">
              <input
                class="filter-name"
                bind:value={filter.nickname}
                use:exioTextbox
                on:input={saveFilters}
              />
              <div class="condition-no-break">
                <input
                  id="enable-{filter.id}"
                  type="checkbox"
                  use:exioCheckbox
                  bind:checked={filter.enabled}
                  on:change={saveFilters}
                  />
                <label for="enable-{filter.id}">Enabled</label>
              </div>
              <button
                use:exioButton
                class="red-bg delete"
                on:click={() => (deleteDialog = filter)}
              >
                <span use:exioIcon class="offset-1px">delete_forever</span>
              </button>
            </div>
          </div>
          {#each filter.conditions as condition, i}
            <div class="filter-items-wrapper">
              <div class="items">
                <select
                  bind:value={condition.property}
                  use:exioDropdown
                  on:change={saveFilters}
                >
                  <option value="message">Message Text</option>
                  <option value="authorName">Author Name</option>
                  <option value="authorChannelId">Author Channel ID</option>
                  <option value="moderator">Author is Moderator</option>
                  <option value="member">Author is Member</option>
                  <option value="owner">Author is Owner</option>
                  <option value="verified">Author is Verified</option>
                  <option value="superchat">Message is Superchat</option>
                  <!-- <option value="videoId">Video ID</option>
                  <option value="videoChannelId">Video Channel ID</option> -->
                </select>
                {#if isTextFilter(condition)}
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
              <div class="condition-options">
                <div class="condition-checkboxes">
                  <div class="condition-no-break">
                    <input
                      id="invert-{filter.id}-{i}"
                      type="checkbox"
                      class="condition-checkbox"
                      use:exioCheckbox
                      bind:checked={condition.invert}
                      on:change={saveFilters}
                    />
                    <label for="invert-{filter.id}-{i}">Invert Condition</label>
                  </div>
                  {#if isTextFilter(condition)}
                    <div class="condition-no-break">
                      <input
                        id="case-{filter.id}-{i}"
                        type="checkbox"
                        class="condition-checkbox"
                        use:exioCheckbox
                        bind:checked={condition.caseSensitive}
                        on:change={saveFilters}
                      />
                      <label for="case-{filter.id}-{i}">Case Sensitive</label>
                    </div>
                  {/if}
                </div>
                <div>
                  <button
                    use:exioButton
                    class="red-bg delete"
                    on:click={() => deleteCondition(filter, i)}
                  >
                    <span use:exioIcon class="offset-1px">close</span>
                  </button>
                </div>
              </div>
            </div>
            {#if i !== filter.conditions.length - 1}
              <div class="condition-separator">
                <span class="line" />
              </div>
            {/if}
          {/each}
          <button class="add-condition-button" use:exioButton on:click={() => addCondition(filter)}>
            <div class="add-condition-inner">
              <span class="line" />
              <span>
                <span use:exioIcon class="offset-1px">add</span>
                Add a Filter Condition
              </span>
              <span class="line" />
            </div>
          </button>
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
      <button class="add-filter-button" use:exioButton on:click={newFilter}>
        <div class="add-condition-inner">
          <span class="line" />
          <span>
            <span use:exioIcon class="offset-1px">add</span>
            Create New Filter
          </span>
          <span class="line" />
        </div>
      </button>
    </div>
  </div>
</div>

<style>
  .card {
    background-color: rgba(128, 128, 128, 0.1);
    padding: 10px;
    margin-top: 10px;
  }
  [data-theme='dark'] .card {
    background-color: rgba(128, 128, 128, 0.15);
  }
  .filter-content {
    width: 100%;
  }
  .title {
    font-size: 18px;
    font-weight: bold;
  }
  .content {
    padding-top: 5px;
  }
  .filter {
    padding: 10px 10px 5px 10px;
    background-color: rgb(128 128 128 / 20%);
    margin: 10px 0px 0px 0px;
  }
  [data-theme='dark'] .filter {
    background-color: rgb(128 128 128 / 25%);
  }
  .filter-items-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }
  .filter-header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }
  .filter-header > .item {
    display: grid;
    grid-template-columns: 1fr auto auto;
    justify-content: space-between;
    width: 100%;
    gap: 10px;
  }
  .filter-items-wrapper > .items {
    display: grid;
    gap: 10px;
    align-items: center;
    grid-template-columns: repeat(2, fit-content(50%)) 1fr;
    width: 100%;
  }
  .condition-checkbox {
    display: inline-block;
  }
  .condition-checkboxes {
    display: flex;
    flex-direction: column;
  }
  @media (max-width: 750px) {
    .filter-items-wrapper > .items {
      display: flex;
      flex-direction: column;
    }
    .filter-items-wrapper > .items select {
      width: 100%;
    }
    .filter-items-wrapper {
      flex-direction: column;
    }
    .condition-options {
      width: 100%;
      flex-direction: row;
      justify-content: space-between;
    }
  }
  .condition-options {
    display: flex;
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
  .add-condition-inner {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 10px;
  }
  .add-condition-button {
    background-color: transparent;
    padding: 0px;
    font-size: 0.85rem;
    width: 100%;
  }
  .add-filter-button {
    background-color: transparent;
    padding: 0px;
    width: 100%;
  }
  .condition-separator {
    width: 100%;
    margin-top: 10px;
  }
  .condition-no-break {
    white-space: nowrap;
    display: flex;
    gap: 10px;
    align-items: center;
  }
  :global(html) {
    background-color: white;
  }
  :global(html[data-theme='dark']) {
    background-color: black;
  }
</style>
