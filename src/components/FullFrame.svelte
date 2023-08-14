<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { dataTheme } from '../ts/storage';
  export let src: string;
  export let closeFunc: any = null;
  onMount(() => {
    if (closeFunc) window.addEventListener('closeArchiveViewRequest', closeFunc);
  });
  onDestroy(() => {
    if (closeFunc) window.removeEventListener('closeArchiveViewRequest', closeFunc);
  });
</script>

<!-- svelte-ignore a11y-missing-attribute -->
{#if src}
  <iframe
    {src}
    style="background-color: {$dataTheme === 'dark' ? 'black' : 'white'};"
    class="archive-frame"
  />
{/if}

<style>
  .archive-frame {
    border: 0px;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    z-index: 10000;
  }
</style>
