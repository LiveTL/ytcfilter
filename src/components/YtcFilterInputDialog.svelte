<script lang="ts">
  import { dataTheme, inputDialog, isDark } from '../ts/storage';
  import { exioDialog, exioButton, exioTextbox } from 'exio/svelte';
  let title = '';
  $: title = $inputDialog?.title ?? title;
  let action = {
    text: '',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    callback: (s: string) => {}
  };
  $: action = $inputDialog?.action ?? action;
  let value = '';
  const setValue = (v?: string) => {
    if (v) value = v;
  };
  $: setValue($inputDialog?.originalValue);
  let message = '';
  $: message = $inputDialog?.message ?? message;
</script>

<dialog
  data-theme={$dataTheme}
  use:exioDialog={{
    backgroundColor: $isDark ? 'black' : 'white'
  }}
  open={Boolean($inputDialog)}
  style="font-size: 1rem;"
>
  <div class="big-text select-none">{title}</div>
  <p>
    <span class="select-none">{message}</span>
    <br />
    <input
      type="text"
      bind:value={value}
      use:exioTextbox
      style="width: 100%; margin-top: 10px;"
      on:keydown={e => {
        if (e.key === 'Enter') {
          action.callback(value);
          $inputDialog = null;
        } else if (e.key === 'Escape') {
          $inputDialog = null;
        }
      }}
    />
  </p>
  <div style="display: flex; justify-content: flex-end; gap: 10px;">
    <button on:click={() => ($inputDialog = null)} use:exioButton>Cancel</button>
    <button
      on:click={() => {
        action.callback(value);
        $inputDialog = null;
      }}
      use:exioButton
      class="blue-bg"
    >{action.text}</button>
  </div>
</dialog>

<style>
  [data-theme='light'] input {
    background-color: rgb(230, 230, 230);
  }
  .select-none {
    user-select: none;
  }
</style>
