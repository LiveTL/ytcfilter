<script lang="ts">
  import { dataTheme } from '../ts/storage';
  export let src: string;
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
