<script lang="ts">
  import '../../stylesheets/scrollbar.css';
  import { currentFilterPreset, chatFilterPresets, defaultFilterPresetId, confirmDialog, inputDialog, currentEditingPreset, getPresetById } from '../../ts/storage';
  import '../../stylesheets/ui.css';
  import '../../stylesheets/line.css';
  import '../../stylesheets/filters.css';
  import { exioButton, exioCheckbox, exioIcon, exioDropdown, exioTextbox } from 'exio/svelte';
  import { getRandomString } from '../../ts/chat-utils';
  import { onDestroy, tick } from 'svelte';
  import { UNDONE_MSG, UNNAMED_FILTER } from '../../ts/chat-constants';
  import { languagesInfo, languageCodeArray } from '../../ts/tl-tag-detect';

  const getLastFilterItem = (id: string) => {
    return document.querySelector(`.filter-item-${id}`) as HTMLDivElement;
  };

  $currentEditingPreset = $currentFilterPreset;
  const newFilter = async () => {
    const id = getRandomString();
    $currentEditingPreset.filters = [...$currentEditingPreset.filters, {
      nickname: UNNAMED_FILTER + ' ' + (($currentEditingPreset.filters.filter(item => {
        return item.nickname?.startsWith(UNNAMED_FILTER);
      }).map(item => parseInt((item?.nickname ?? '').replace(/\D/g, '')))
        .filter(item => !isNaN(item)).sort().pop() ?? 0) + 1),
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
    unsavedFilters = $currentEditingPreset.filters;
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
    $currentEditingPreset.filters = $currentEditingPreset.filters.filter(x => x.id !== item.id);
    unsavedFilters = $currentEditingPreset.filters;
    $chatFilterPresets = $chatFilterPresets.map(x => x.id === $currentEditingPreset.id ? $currentEditingPreset : x);
  };

  let unsavedFilters: YtcF.ChatFilter[] = [];

  defaultFilterPresetId.ready().then(async () => {
    await tick();
    $currentEditingPreset = $currentFilterPreset;
    unsavedFilters = $currentEditingPreset.filters;
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
            delete (condition as any).value;
          } else if (
            (condition.type as string === 'boolean') ||
            (condition.type === 'tltag' && condition.property !== 'message')
          ) {
            condition.type = 'includes';
          }
          if (condition.needsClear && !isBooleanFilter(condition) && condition.type !== 'tltag') {
            condition.value = '';
            condition.needsClear = false;
          }
          if (condition.type === 'tltag') {
            condition.needsClear = true;
            if (!languageCodeArray.includes(condition.value)) {
              condition.value = 'en';
            }
          }
        }
      }
      unsavedFilters = [...unsavedFilters];
      $currentEditingPreset.filters = unsavedFilters;
      $chatFilterPresets = $chatFilterPresets.map(x => x.id === $currentEditingPreset.id ? $currentEditingPreset : x);
    }, 50);
  };

  onDestroy(() => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
  });

  const isTextFilter = (filter: YtcF.FilterCondition): filter is YtcF.StringCondition =>
    ['message', 'authorName', 'authorChannelId'].includes(filter.property);
  const isBooleanFilter = (filter: YtcF.FilterCondition): filter is YtcF.BooleanCondition =>
    [
      'moderator',
      'member',
      'owner',
      'verified',
      'superchat'
    ].includes(filter.property);

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
      (Array.from(item?.querySelectorAll('.filter-content-item')).pop() as any)?.select();
      item?.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
    }, 100);
  };
  const commitNewPreset = async (name: string[]) => {
    const id = getRandomString();
    $chatFilterPresets = [...$chatFilterPresets, {
      id,
      nickname: name[0] || 'Unnamed Preset',
      filters: [],
      triggers: [],
      activation: 'manual'
    }];
    $currentEditingPreset = await getPresetById(id) as YtcF.FilterPreset;
    unsavedFilters = $currentEditingPreset.filters;
  };
  const newPreset = () => {
    $inputDialog = {
      title: 'Create New Preset',
      message: 'Enter a name for the new preset.',
      action: {
        text: 'Create',
        callback: commitNewPreset
      },
      prompts: [{
        originalValue: 'Preset ' + ((($chatFilterPresets.filter(item => {
          return item.nickname?.startsWith('Preset ');
        }).map(item => parseInt((item?.nickname ?? '').replace(/\D/g, '')))
          .filter(item => !isNaN(item)).sort().pop() ?? 0) + 1)),
        label: 'Preset Name'
      }]
    };
  };
  const changeEditingPreset = (async (e: InputEvent) => {
    await tick();
    $currentEditingPreset = await getPresetById((e.target as HTMLSelectElement).value) ?? $currentEditingPreset;
    unsavedFilters = $currentEditingPreset.filters;
  }) as any;
  const deletePreset = () => {
    if ($chatFilterPresets.length === 1) {
      $chatFilterPresets = [{
        id: $currentEditingPreset.id,
        nickname: 'Preset 1',
        filters: [],
        triggers: [],
        activation: 'manual'
      }];
      $currentEditingPreset = $chatFilterPresets[0];
      unsavedFilters = $currentEditingPreset.filters;
      $defaultFilterPresetId = $currentEditingPreset.id;
    } else {
      $chatFilterPresets = $chatFilterPresets.filter(x => x.id !== $currentEditingPreset.id);
      $currentEditingPreset = $chatFilterPresets[0] ?? $currentEditingPreset;
      if ($defaultFilterPresetId === $currentEditingPreset.id) {
        $defaultFilterPresetId = $currentEditingPreset.id;
      }
      unsavedFilters = $currentEditingPreset.filters;
    }
  };
  const renameItemCallback = (item: YtcF.FilterPreset) => {
    const renameItem = (name: string[]) => {
      item.nickname = name[0] || 'Unnamed Preset';
      $chatFilterPresets = $chatFilterPresets.map(x => x.id === item.id ? item : x);
    };
    return renameItem;
  };
  const onInputRender = (func: any) => {
    return func;
  };
</script>

<div class="settings-title big-text filters-title">
  <div class="preset-selector">
    <span>Filters</span>
  </div>
</div>
<div class="settings-content" style="padding-top: 0px;">
  <div style="display: flex; justify-content: center; margin-top: 10px;">
    <div class="buttons">
      <select use:exioDropdown on:change={changeEditingPreset} class="preset-dropdown">
        {#each $chatFilterPresets as preset}
          <option value={preset.id} selected={preset.id === $currentEditingPreset.id}>
            {preset.nickname}
          </option>
        {/each}
      </select>
      <button on:click={async () => {
        const { default: component } = await import('./YtcFilterTriggers.svelte');
        const beforeEdit = JSON.parse(JSON.stringify($currentEditingPreset));
        $inputDialog = {
          title: `Edit Preset "${$currentEditingPreset.nickname}"`,
          action: {
            callback: renameItemCallback($currentEditingPreset),
            cancelled: () => {
              setTimeout(() => {
                $currentEditingPreset = beforeEdit;
              }, 100);
            },
            text: 'Save'
          },
          prompts: [{
            originalValue: $currentEditingPreset.nickname,
            label: 'Preset Name'
          }],
          component
        };
      }} use:exioButton>
        <span use:exioIcon style="vertical-align: -1px;">edit_square</span>
      </button>
      <button on:click={() => {
        $confirmDialog = {
          title: `Delete Preset "${$currentEditingPreset.nickname}"?`,
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
      <div class="condition-no-break" style="margin-top: 10px; height: 0.8rem;">
        <span class="line" />
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
                {#if condition.property === 'message'}
                  <option value="tltag">Has TL Tag</option>
                {/if}
                <option value="startsWith">Starts With</option>
                <option value="endsWith">Ends With</option>
                <option value="equals">Equals</option>
                <option value="regex">Regex</option>
              </select>
              {#if condition.type === 'tltag'}
                <select
                  bind:value={condition.value}
                  use:exioDropdown
                  on:change={saveFilters}
                >
                  {#each languagesInfo as lang}
                    <option value={lang.code}>{lang.selectionName}</option>
                  {/each}
                </select>
              {:else}
                <input
                  class="filter-content filter-content-item"
                  bind:value={condition.value}
                  use:exioTextbox
                  on:input={saveFilters}
                  placeholder="Filter Content"
                />
              {/if}
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
              {#if isTextFilter(condition) && condition.type !== 'regex' && condition.type !== 'tltag'}
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
