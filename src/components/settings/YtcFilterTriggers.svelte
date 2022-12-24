<script lang="ts">
  import { exioButton, exioIcon, exioDropdown, exioTextbox, exioCheckbox, exioRadio } from 'exio/svelte';
  import { currentEditingPreset } from '../../ts/storage';

  const addTrigger = async () => {
    $currentEditingPreset.triggers = [...$currentEditingPreset.triggers, {
      caseSensitive: false,
      property: 'channelName',
      type: 'includes',
      value: ''
    }];
    // setTimeout(() => {
    //   const item = getLastFilterItem(filter.id);
    //   console.log(item?.querySelector('input'));
    //   (Array.from(item?.querySelectorAll('.filter-content-item')).pop() as any)?.select();
    //   item?.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
    // }, 100);
  };
</script>

<div style="margin-top: 16px;" class="narrow-screen">
  <div class="aligned-radios">
    <input
      type="radio"
      id="trigger-manually"
      name="filter-tab"
      class="trigger-radio"
      value="manual"
      use:exioRadio
      bind:group={$currentEditingPreset.activation} 
    />
    <label for="trigger-manually" class="filter-tab">Activate manually</label>
  </div>
  <div class="aligned-radios">
    <input
      type="radio"
      id="trigger-automatically"
      name="filter-tab"
      class="trigger-radio"
      value="auto"
      use:exioRadio
      bind:group={$currentEditingPreset.activation} 
    />
    <label for="trigger-automatically" class="filter-tab">Activate automatically if:</label>
  </div>
  <div
    style="
      margin-left: 2rem;
      margin-top: 5px;
      padding: 5px;
      background-color: rgba(128, 128, 128, 0.3);
    "
    class:disabled-item={$currentEditingPreset.activation === 'manual'}
  >
    {#each $currentEditingPreset.triggers as trigger, i}
      <div class="filter-items-wrapper" style={i === 0 ? 'margin-top: 0px;' : ''}>
        <div class="items">
          <select
            bind:value={trigger.property}
            use:exioDropdown
          >
            <option value="channelName">Channel Name</option>
            <option value="channelHandle">Channel Handle</option>
            <option value="channelId">Channel ID</option>
            <option value="videoTitle">Video Title</option>
            <option value="videoId">Video ID</option>
          </select>
          <select
            bind:value={trigger.type}
            use:exioDropdown
          >
            <option value="includes">Contains</option>
            <option value="startsWith">Starts With</option>
            <option value="endsWith">Ends With</option>
            <option value="equals">Equals</option>
            <option value="regex">Regex</option>
          </select>
          <input
            class="filter-content filter-content-item"
            bind:value={trigger.value}
            use:exioTextbox
            placeholder="Filter Content"
          />
        </div>
        <div class="condition-options">
          <div class="condition-checkboxes">
            {#if trigger.type !== 'regex'}
              <div class="condition-no-break">
                <input
                  id="case-{i}"
                  type="checkbox"
                  class="condition-checkbox"
                  use:exioCheckbox
                  bind:checked={trigger.caseSensitive}
                />
                <label for="case-{i}">Case Sensitive</label>
              </div>
            {/if}
          </div>
          <div>
            <button
              use:exioButton
              class="red-bg delete"
            >
              <span use:exioIcon class="offset-1px">close</span>
            </button>
          </div>
        </div>
      </div>
      {#if i !== $currentEditingPreset.triggers.length - 1}
        <div class="condition-separator">
          <span class="line" />
          <span class="blue-text">OR</span>
          <span class="line" />
        </div>
      {/if}
    {/each}
    {#if $currentEditingPreset.triggers.length > 0}
      <div class="condition-no-break" style="margin-top: 10px; height: 0.8rem;">
        <span class="line" />
      </div>
    {/if}
    <button class="add-condition-button lighter-gray" use:exioButton on:click={addTrigger}>
      <div class="add-condition-inner blue-text">
        <span>
          <span use:exioIcon class="offset-1px add-icon" style="color: inherit;">add</span>
          Add a Trigger
        </span>
      </div>
    </button>
  </div>
</div>

<style>
  .aligned-radios {
    display: flex;
    align-items: center;
  }
  .trigger-radio {
    margin-right: 0.5rem;
  }
  .disabled-item {
    filter: grayscale(100%) opacity(0.5);
    touch-action: none;
    pointer-events: none;
    user-select: none;
  }
</style>
