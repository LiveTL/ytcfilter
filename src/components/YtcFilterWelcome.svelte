<script lang="ts">
  import {
    chatFilterPresets,
    defaultFilterPresetId,
    videoInfo
  } from '../ts/storage';
  const classes = 'p-2 rounded inline-flex flex-col overflow-hidden bg-secondary-50 dark:bg-secondary-600 pointer-events-none touch-none select-none';
</script>

<div class={classes}>
  <!-- <span style="margin-bottom: 0.5rem;">Filtered messages will appear here.</span> -->
  <p style="text-align: center;">
    <span style="margin-bottom: 0.5rem;">Filtered messages will appear here.</span>
    <br />
    <strong>Preset:</strong>
    <span class="trimmed">
      {$chatFilterPresets.find(p => p.id === $defaultFilterPresetId)?.nickname}
    </span>
    <span>
      ({$chatFilterPresets.find(p => p.id === $defaultFilterPresetId)?.filters.filter(f => f.enabled).length} filters)
    </span>
    <br />
    <strong>Video:</strong>
    {#if $videoInfo}
      <span class="trimmed">{$videoInfo?.video?.title ?? 'Unknown'}</span>
      (<span class="trimmed">{$videoInfo?.channel?.name ?? 'Unknown'}</span>)
    {:else}
      <span>Unknown</span>
    {/if}
  </p>
</div>

<style>
  .trimmed {white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 75px;
    display: inline-block;
    vertical-align: bottom;
  }
</style>
