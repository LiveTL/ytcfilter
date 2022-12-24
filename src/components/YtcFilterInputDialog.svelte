<script lang="ts">
  import { dataTheme, inputDialog, isDark } from '../ts/storage';
  import { exioDialog, exioButton, exioTextbox } from 'exio/svelte';
  import '../stylesheets/ui.css';
  let title = '';
  $: title = $inputDialog?.title ?? title;
  let action = {
    text: '',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    callback: (s: string) => {},
    cancelled: () => {}
  };
  $: action = {
    ...($inputDialog?.action ?? action),
    cancelled: $inputDialog?.action.cancelled ?? (() => {})
  };
  let value = '';
  const setValue = (v?: string) => {
    if (v) value = v;
  };
  $: setValue($inputDialog?.originalValue);
  let message = '';
  $: message = $inputDialog?.component ? '' : ($inputDialog?.message ?? message);
  let component: any = null;
  $: component = $inputDialog?.message ? null : ($inputDialog?.component ?? component);
  let open = false;
  $: {
    const toOpen = Boolean($inputDialog);
    open = false;
    setTimeout(() => {
      open = toOpen;
    }, 0);
  }
</script>

<dialog
  data-theme={$dataTheme}
  use:exioDialog={{
    backgroundColor: $isDark ? 'black' : 'white'
  }}
  {open}
  style="font-size: 1rem;"
  class:reactive-width={Boolean(component)}
>
  <div class="big-text select-none">{title}</div>
  <p class="select-none">
    {#if message}
      <span class="select-none">{message}</span>
      <br />
    {/if}
    <input
      type="text"
      bind:value={value}
      use:exioTextbox
      style="width: 100%; {message ? 'margin-top: 10px;' : ''}"
      on:keydown={e => {
        if (e.key === 'Enter') {
          action.callback(value);
          $inputDialog = null;
        } else if (e.key === 'Escape') {
          action.cancelled();
          $inputDialog = null;
        }
      }}
    />
    {#if component}
      <br />
      <svelte:component this={component} />
    {/if}
  </p>
  <div style="display: flex; justify-content: flex-end; gap: 10px;">
    <button on:click={() => {
      $inputDialog = null;
      action.cancelled();
    }} use:exioButton>Cancel</button>
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
  .reactive-width {
    width: min(450px, calc(100% - 60px));
  }
</style>
