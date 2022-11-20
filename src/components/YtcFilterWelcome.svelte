<script lang="ts">
  import {
    chatFilterPresets,
    currentFilterPresetId
  } from '../ts/storage';
  const classes = 'p-2 rounded inline-flex flex-col overflow-hidden bg-secondary-50 dark:bg-secondary-600 pointer-events-none touch-none select-none';
</script>

<div class={classes}>
  <span style="margin-bottom: 0.5rem;">Filtered messages will appear here.</span>
  <p style="text-align: center;">
    <strong>Current Preset:</strong>
    <span>{$chatFilterPresets.find(p => p.id === $currentFilterPresetId)?.nickname}</span>
    <br />
    <strong>Active Filters:</strong>
    <span>{$chatFilterPresets.find(p => p.id === $currentFilterPresetId)?.filters.filter(f => f.enabled).length}</span>
  </p>
</div>
