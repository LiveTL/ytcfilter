<script lang="ts">
  import '../../stylesheets/scrollbar.css';
  import { currentFilterPreset, chatFilterPresets, defaultFilterPresetId, confirmDialog, inputDialog } from '../../ts/storage';
  import '../../stylesheets/ui.css';
  import '../../stylesheets/line.css';
  import '../../stylesheets/filters.css';
  import { exioButton, exioCheckbox, exioIcon, exioDropdown, exioTextbox } from 'exio/svelte';
  import { getRandomString } from '../../ts/chat-utils';
  import { onDestroy, tick } from 'svelte';
  import { UNDONE_MSG } from '../../ts/chat-constants';

  const getLastFilterItem = (id: string) => {
    return document.querySelector(`.filter-item-${id}`) as HTMLDivElement;
  };

  let currentPreset = $currentFilterPreset;
  const newFilter = async () => {
    const id = getRandomString();
    currentPreset.filters = [...currentPreset.filters, {
      nickname: 'Unnamed Filter ' + (currentPreset.filters.length + 1),
      type: 'basic',
      id,
      conditions: [{
        type: 'includes',
        property: 'message',
        value: '',
        invert: false,
        caseSensitive: false
      }],
      enabled: true
    }];
    unsavedFilters = currentPreset.filters;
    $chatFilterPresets = [...$chatFilterPresets];
    await tick();
    const lastFilterItem = getLastFilterItem(id);
    if (lastFilterItem) {
      lastFilterItem.querySelector('input')?.select();
      lastFilterItem.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
    }
    saveFilters();
  };

  const deleteFilter = (item: YtcF.ChatFilter) => {
    currentPreset.filters = currentPreset.filters.filter(x => x.id !== item.id);
    unsavedFilters = currentPreset.filters;
    $chatFilterPresets = $chatFilterPresets.map(x => x.id === currentPreset.id ? currentPreset : x);
  };

  let unsavedFilters: YtcF.ChatFilter[] = [];

  defaultFilterPresetId.ready().then(async () => {
    await tick();
    currentPreset = $currentFilterPreset;
    unsavedFilters = currentPreset.filters;
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
      currentPreset.filters = unsavedFilters;
      $chatFilterPresets = $chatFilterPresets.map(x => x.id === currentPreset.id ? currentPreset : x);
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
  const addCondition = async (filter: YtcF.ChatFilter) => {
    filter.conditions = [...filter.conditions, {
      type: 'includes',
      property: 'message',
      value: '',
      invert: false,
      caseSensitive: false
    }];
    saveFilters();
    setTimeout(() => {
      const item = getLastFilterItem(filter.id);
      console.log(item?.querySelector('input'));
      (Array.from(item?.querySelectorAll('.filter-content-item')).pop() as any)?.select();
      item?.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
    }, 100);
  };
  const commitNewPreset = (name: string) => {
    const id = getRandomString();
    $chatFilterPresets = [...$chatFilterPresets, {
      id,
      nickname: name,
      filters: [],
      triggers: []
    }];
    currentPreset = $chatFilterPresets.find(x => x.id === id) as YtcF.FilterPreset;
    unsavedFilters = currentPreset.filters;
    presetDropdownValue = id;
  };
  const newPreset = () => {
    $inputDialog = {
      title: 'Create New Preset',
      message: 'Enter a name for the new preset.',
      action: {
        text: 'Create',
        callback: commitNewPreset
      },
      originalValue: 'Preset ' + ($chatFilterPresets.length + 1)
    };
  };
  let presetDropdownValue = '';
  defaultFilterPresetId.ready().then(() => {
    presetDropdownValue = $defaultFilterPresetId;
  });
  const changeEditingPreset = async () => {
    await tick();
    currentPreset = $chatFilterPresets.find(x => x.id === presetDropdownValue) ?? currentPreset;
    unsavedFilters = currentPreset.filters;
  };
  const deletePreset = () => {
    if ($chatFilterPresets.length === 1) {
      $chatFilterPresets = [{
        id: currentPreset.id,
        nickname: 'Preset 1',
        filters: [],
        triggers: []
      }];
      currentPreset = $chatFilterPresets[0];
      unsavedFilters = currentPreset.filters;
      $defaultFilterPresetId = currentPreset.id;
      return;
    }
    $chatFilterPresets = $chatFilterPresets.filter(x => x.id !== presetDropdownValue);
    currentPreset = $chatFilterPresets[$chatFilterPresets.length - 1] ?? currentPreset;
    if ($defaultFilterPresetId === presetDropdownValue) {
      $defaultFilterPresetId = currentPreset.id;
    }
    unsavedFilters = currentPreset.filters;
    presetDropdownValue = currentPreset.id;
  };
  const renameItemCallback = (item: YtcF.FilterPreset) => {
    const renameItem = (name: string) => {
      item.nickname = name;
      $chatFilterPresets = $chatFilterPresets.map(x => x.id === item.id ? item : x);
    };
    return renameItem;
  };
</script>

<div class="settings-title big-text filters-title">
  <div class="preset-selector">
    <span>Filters</span>
    <div class="buttons">
      <select use:exioDropdown on:change={changeEditingPreset} bind:value={presetDropdownValue} class="preset-dropdown">
        {#each $chatFilterPresets as preset}
          <option value={preset.id} selected={preset.id === currentPreset.id}>
            {preset.nickname}
          </option>
        {/each}
      </select>
      <button on:click={() => {
        $inputDialog = {
          title: `Rename Preset "${currentPreset.nickname}"`,
          message: 'Enter a new name for the preset.',
          originalValue: currentPreset.nickname,
          action: {
            callback: renameItemCallback(currentPreset),
            text: 'Rename'
          }
        };
      }} use:exioButton>
        <span use:exioIcon style="vertical-align: super;">edit_square</span>
      </button>
      <button on:click={() => {
        $confirmDialog = {
          title: `Delete Preset "${currentPreset.nickname}"?`,
          message: UNDONE_MSG,
          action: {
            callback: deletePreset,
            text: 'Delete'
          }
        };
      }} use:exioButton class="red-bg">
        <span use:exioIcon class="offset-1px">disabled_by_default</span>
      </button>
      <button on:click={newPreset} use:exioButton class="blue-bg">
        <span use:exioIcon class="offset-1px">add_box</span>
      </button>
    </div>
  </div>
</div>
<div class="settings-content" style="padding-top: 0px;">
  {#each unsavedFilters as filter (filter.id)}
    <div class="filter filter-item-{filter.id}">
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
            placeholder="Filter Name"
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
            on:click={() => {
              $confirmDialog = {
                action: {
                  text: 'Delete',
                  callback: () => {
                    deleteFilter(filter);
                  }
                },
                title: `Delete Filter "${filter.nickname}"?`,
                message: UNDONE_MSG
              };
            }}
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
              <option value="superchat">Item is Superchat</option>
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
                class="filter-content filter-content-item"
                bind:value={condition.value}
                use:exioTextbox
                on:input={saveFilters}
                placeholder="Filter Content"
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
              {#if isTextFilter(condition) && condition.type !== 'regex'}
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
            <span class="blue-text">AND</span>
            <span class="line" />
          </div>
        {/if}
      {/each}
      <div class="condition-no-break" style="margin-top: 10px; height: 0.8rem;">
        <span class="line" />
      </div>
      <button class="add-condition-button lighter-gray" use:exioButton on:click={() => addCondition(filter)}>
        <div class="add-condition-inner blue-text">
          <!-- <span class="line" /> -->
          <span>
            <span use:exioIcon class="offset-1px add-icon" style="color: inherit;">add</span>
            Add a Filter Condition
          </span>
          <!-- <span class="line" /> -->
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
  <button class="add-filter-button lighter-gray" use:exioButton on:click={newFilter}>
    <div class="add-condition-inner blue-text">
      <!-- <span class="line" /> -->
      <span>
        <span use:exioIcon class="offset-1px add-icon" style="color: inherit;">add</span>
        Create New Filter
      </span>
      <!-- <span class="line" /> -->
    </div>
  </button>
  <!-- {#if unsavedFilters.length === 0}
    <div style="display: flex; justify-content: center; align-items: center; font-size: 0.9rem; margin-top: 5px; flex-direction: column;">
      <span use:exioIcon style="font-size: 2em; position: absolute; pointer-events: none; touch-action: none;" class="floating-animation">expand_less</span>
      <div class="blue-bg" style="padding: 0px 10px; border-radius: 1000px; line-height: 2rem;">
        <span>
          Tip: Create your first filter!
        </span>
      </div>
    </div>
  {/if} -->
</div>

<style>
  .add-icon {
    vertical-align: -2px;
  }
</style>