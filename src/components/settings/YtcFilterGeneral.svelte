<script lang="ts">
  import { Theme } from '../../ts/chat-constants';
  import { theme, showProfileIcons, showUsernames, showTimestamps, showUserBadges } from '../../ts/storage';
  import { exioCheckbox, exioDropdown } from 'exio/svelte';
  import '../../stylesheets/ui.css';
</script> 

<div class="settings-title big-text">Appearance</div>
<div class="settings-content">
  <div class="setting-item" style="margin-top: 0px;">
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
  <div class="setting-item">
    <input class="check" type="checkbox" use:exioCheckbox bind:checked={$showUserBadges} id="show-user-badges" />
    <label for="show-user-badges">Show User Badges</label>
  </div>
</div>

<style>
  .setting-item {
    display: block;
    margin-top: 10px;
  }
  .check {
    display: inline-block;
    vertical-align: bottom;
    margin: 0px 5px;
  }
</style>
