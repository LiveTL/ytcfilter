<script lang="ts">
  import '../../stylesheets/scrollbar.css';
  import { currentFilterPreset, chatFilterPresets, defaultFilterPresetId, confirmDialog, inputDialog, currentEditingPreset, getPresetById } from '../../ts/storage';
  import '../../stylesheets/ui.css';
  import '../../stylesheets/line.css';
  import '../../stylesheets/filters.css';
  import { exioButton, exioIcon, exioDropdown } from 'exio/svelte';
  import { getRandomString } from '../../ts/chat-utils';
  import { onDestroy, tick } from 'svelte';
  import { UNDONE_MSG } from '../../ts/chat-constants';
  import { languageCodeArray } from '../../ts/tl-tag-detect';
  import YtcFilterFilter from './YtcFilterFilter.svelte';

  const getLastFilterItem = (id: string) => {
    return document.querySelector(`.filter-item-${id}`) as HTMLDivElement;
  };

  $currentEditingPreset = $currentFilterPreset;
  const newFilter = async () => {
    const id = getRandomString();
    const newItem: YtcF.ChatFilter = {
      // nickname: UNNAMED_FILTER + ' ' + (($currentEditingPreset.filters.filter(item => {
      //   return item.nickname?.startsWith(UNNAMED_FILTER);
      // }).map(item => parseInt((item?.nickname ?? '').replace(/\D/g, '')))
      //   .filter(item => !isNaN(item)).sort().pop() ?? 0) + 1),
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
    };
    $currentEditingPreset.filters = [...JSON.parse(JSON.stringify($currentEditingPreset.filters)), JSON.parse(JSON.stringify(newItem))];
    unsavedFilters = [...unsavedFilters, newItem];
    $chatFilterPresets = $chatFilterPresets.map(x => x.id === $currentEditingPreset.id ? JSON.parse(JSON.stringify($currentEditingPreset)) : x);
    await tick();
    const lastFilterItem = getLastFilterItem(id);
    if (lastFilterItem) {
      (lastFilterItem.querySelector('.filter-edit-button') as HTMLButtonElement).click();
      await tick();
      lastFilterItem.querySelectorAll('input')[2]?.select();
      lastFilterItem.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
    }
  };

  const deleteFilter = (item: YtcF.ChatFilter) => {
    $currentEditingPreset.filters = $currentEditingPreset.filters.filter(x => x.id !== item.id);
    unsavedFilters = unsavedFilters.filter(x => x.id !== item.id);
    $chatFilterPresets = $chatFilterPresets.map(x => x.id === $currentEditingPreset.id ? $currentEditingPreset : x);
  };

  let unsavedFilters: YtcF.ChatFilter[] = [];

  defaultFilterPresetId.ready().then(async () => {
    await tick();
    $currentEditingPreset = $currentFilterPreset;
    unsavedFilters = JSON.parse(JSON.stringify($currentEditingPreset.filters));
  });

  let saveTimeout: any = null;

  const saveFilters = async (filter?: YtcF.ChatFilter) => {
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
            delete condition.needsClear;
          }
          if (condition.type === 'tltag') {
            condition.needsClear = true;
            if (!languageCodeArray.includes(condition.value)) {
              condition.value = 'en';
            }
          }
        }
      }
      $currentEditingPreset.filters = $currentEditingPreset.filters.map(x => x.id === filter?.id ? filter : x);
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
    refreshFilters();
  };
  const addCondition = async (filter: YtcF.ChatFilter) => {
    filter.conditions = [...filter.conditions, {
      type: 'includes',
      property: 'message',
      value: '',
      invert: false,
      caseSensitive: false
    }];
    refreshFilters();
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
    unsavedFilters = JSON.parse(JSON.stringify($currentEditingPreset.filters));
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
    unsavedFilters = JSON.parse(JSON.stringify($currentEditingPreset.filters));
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
      unsavedFilters = JSON.parse(JSON.stringify($currentEditingPreset.filters));
      $defaultFilterPresetId = $currentEditingPreset.id;
    } else {
      $chatFilterPresets = $chatFilterPresets.filter(x => x.id !== $currentEditingPreset.id);
      $currentEditingPreset = $chatFilterPresets[0] ?? $currentEditingPreset;
      if ($defaultFilterPresetId === $currentEditingPreset.id) {
        $defaultFilterPresetId = $currentEditingPreset.id;
      }
      unsavedFilters = JSON.parse(JSON.stringify($currentEditingPreset.filters));
    }
  };
  const renameItemCallback = (item: YtcF.FilterPreset) => {
    const renameItem = (name: string[]) => {
      item.nickname = name[0] || 'Unnamed Preset';
      $chatFilterPresets = $chatFilterPresets.map(x => x.id === item.id ? item : x);
    };
    return renameItem;
  };
  const discardUnsavedChanges = (filter?: YtcF.ChatFilter) => {
    if (filter) {
      unsavedFilters = unsavedFilters.map(x => {
        if (x.id === filter?.id) {
          return $currentEditingPreset.filters.find(y => y.id === filter?.id);
        }
        return x;
      }).filter(x => x) as YtcF.ChatFilter[];
    } else {
      unsavedFilters = JSON.parse(JSON.stringify($currentEditingPreset.filters));
    }
  };
  const refreshFilters = () => {
    unsavedFilters = [...unsavedFilters];
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
    <YtcFilterFilter {filter} {saveFilters} {deleteFilter} {isTextFilter} {deleteCondition} {addCondition} {discardUnsavedChanges} />
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
