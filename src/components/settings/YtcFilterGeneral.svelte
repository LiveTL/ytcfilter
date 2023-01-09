<script lang="ts">
  import { Theme } from '../../ts/chat-constants';
  import { theme } from '../../ts/storage';
  import { exioDropdown } from 'exio/svelte';
  import '../../stylesheets/ui.css';
</script> 

<div class="settings-title big-text">Appearance</div>
<div class="settings-content">
  <span>Theme: </span>
  <select use:exioDropdown bind:value={$theme}>
    <option value={Theme.YOUTUBE}>Auto</option>
    <option value={Theme.LIGHT}>Light</option>
    <option value={Theme.DARK}>Dark</option>
  </select>
</div>
