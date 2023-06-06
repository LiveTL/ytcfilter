<script lang="ts">
  import { confirmDialog, isDark } from '../ts/storage';
  import { exioDialog, exioButton } from 'exio/svelte';
  import '../stylesheets/ui.css';
  import { onDestroy } from 'svelte';
  let title = '';
  $: title = $confirmDialog?.title ?? title;
  let message = '';
  $: message = $confirmDialog?.message ?? message;
  let action = {
    text: '',
    callback: () => {}
  };
  $: action = $confirmDialog?.action ?? action;
  let open = false;
  $: {
    const toOpen = Boolean($confirmDialog);
    open = false;
    setTimeout(() => {
      open = toOpen;
    }, 0);
  }
  onDestroy(() => {
    $confirmDialog = null;
  });
</script>

<dialog
  use:exioDialog={{
    backgroundColor: $isDark ? 'black' : 'white'
  }}
  {open}
  style="font-size: 1rem;"
>
  <div class="big-text select-none">{title}</div>
  <p class="select-none">{message}</p>
  <div style="display: flex; justify-content: flex-end; gap: 10px;">
    <button on:click={() => ($confirmDialog = null)} use:exioButton>Cancel</button>
    <button on:click={() => {
      action.callback();
      $confirmDialog = null;
    }} use:exioButton class="red-bg">{action.text}</button>
  </div>
</dialog>
