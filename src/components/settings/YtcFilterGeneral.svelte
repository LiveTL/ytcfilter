<script lang="ts">
  import { Theme } from '../../ts/chat-constants';
  import { theme, showProfileIcons, showUsernames, showTimestamps, showUserBadges, stores, errorDialog, confirmDialog } from '../../ts/storage';
  import { exioButton, exioCheckbox, exioDropdown, exioIcon } from 'exio/svelte';
  import { forceReloadAll } from '../../ts/ytcf-logic';
  import '../../stylesheets/ui.css';
  import { download } from '../../ts/ytcf-utils';
  import { readFromJson } from '../../ts/ytcf-logic';
  import YtcFilterErrorDialog from '../YtcFilterErrorDialog.svelte';
  import YtcFilterConfirmation from '../YtcFilterConfirmation.svelte';
  const importData = async () => {
    const data = await readFromJson();
    try {
      if (!('ytcf.currentStorageVersion' in data)) throw new Error('Invalid storage JSON dump.');
      await stores.importJson(JSON.stringify(data));
    } catch (e) {
      $errorDialog = {
        action: {
          text: 'Close',
          callback: () => {
            $errorDialog = null;
          }
        },
        title: 'Data Import Error',
        message: (e as any).message
      };
    }
  };
  const resetData = () => {
    $confirmDialog = {
      title: 'Reset Data',
      message: 'Are you sure you want to reset all your data? This cannot be undone.',
      action: {
        text: 'Reset',
        callback: async () => {
          await stores._clear();
          $confirmDialog = null;
          forceReloadAll();
        }
      }
    };
  };
</script>

<YtcFilterErrorDialog />
<YtcFilterConfirmation />

<div class="settings-title big-text">Appearance</div>
<div class="settings-content">
  <div class="setting-item" style="margin: 5px;">
    <span>Theme: </span>
    <select use:exioDropdown bind:value={$theme}>
      <option value={Theme.YOUTUBE}>Auto</option>
      <option value={Theme.LIGHT}>Light</option>
      <option value={Theme.DARK}>Dark</option>
    </select>
  </div>
  <div class="setting-item">
    <input class="check" type="checkbox" use:exioCheckbox bind:checked={$showProfileIcons} id="show-profile-icons" />
    <label for="show-profile-icons">Show Profile Icons</label>
  </div>
  <div class="setting-item">
    <input class="check" type="checkbox" use:exioCheckbox bind:checked={$showTimestamps} id="show-timestamps" />
    <label for="show-timestamps">Show Timestamps</label>
  </div>
  <div class="setting-item">
    <input class="check" type="checkbox" use:exioCheckbox bind:checked={$showUsernames} id="show-usernames" />
    <label for="show-usernames">Show Usernames</label>
  </div>
  <div class="setting-item" style="margin-bottom: 5px;">
    <input class="check" type="checkbox" use:exioCheckbox bind:checked={$showUserBadges} id="show-user-badges" />
    <label for="show-user-badges">Show User Badges</label>
  </div>
</div>
<div class="settings-title big-text">Advanced</div>
<div class="settings-content">
  <span>Storage Data: </span>
  <button use:exioButton on:click={async () => {
    download(JSON.stringify(JSON.parse(await stores.exportJson()), null, 2), 'ytcf-data.json');
  }}>
    Export
    <span use:exioIcon style="vertical-align: -2px;">download</span>
  </button>
  <button use:exioButton on:click={importData}>
    Import
    <span use:exioIcon style="vertical-align: -2px;">upload</span>
  </button>
  <button use:exioButton class="red-bg" on:click={resetData}>
    Reset
    <span use:exioIcon style="vertical-align: -2px;">restart_alt</span>
  </button>
</div>

<style>
  .setting-item {
    display: block;
    margin-top: 10px;
  }
  .check {
    display: inline-block;
    vertical-align: bottom;
    margin: 0px 10px;
  }
</style>
