<script lang="ts">
  import { getAllMessageDumps } from '../../ts/ytcf-logic';
  import { exioButton, exioIcon } from 'exio/svelte';
  import { inputDialog } from '../../ts/storage';
  // import { exioIcon } from 'exio/svelte';
  let data: YtcF.MessageDumpInfoItem[] = [];
  const updateData = async () => {
    data = await getAllMessageDumps();
  };
  updateData();
  export const refreshFunc = updateData;

  const editArchiveEntry = (item: YtcF.MessageDumpInfoItem) => {
    return () => {
      $inputDialog = {
        title: 'Edit Archive Entry',
        action: {
          text: 'Save',
          callback: async (data: string[]) => {
            console.log(data);
          },
          cancelled: () => {
            $inputDialog = null;
          }
        },
        prompts: [{
          originalValue: item.info?.video.title || '',
          label: 'Video Title'
        }, {
          originalValue: item.info?.video.videoId || '',
          label: 'Video ID'
        }, {
          originalValue: item.info?.channel.name || '',
          label: 'Channel Name'
        }, {
          originalValue: item.info?.channel.handle || '',
          label: 'Channel Handle'
        }, {
          originalValue: item.info?.channel.channelId || '',
          label: 'Channel ID'
        }]
      };
    };
  };
</script>

<div style="padding-bottom: 1px; padding: 2px 10px 10px 10px;">
  {#each data as item, i}
    <div class="item settings-card">
      <div>
        <div style="font-weight: bold;">
          {item.info?.video.title || 'Unknown Title'}
          <!-- {#if item.info?.video.videoId}
            <a
              href="https://youtube.com/watch?v={item.info?.video.videoId}"
              target="_blank"
              class="blue-text"
              style="text-decoration: none;"
              use:exioIcon
            >open_in_new</a>
          {/if} -->
        </div>
        <div>{item.info?.channel.name || 'Unknown Channel'}</div>
        <div style="font-style: italic;">Last Updated: {new Date(item.lastEdited).toLocaleString()}</div>
      </div>
      <div class="item triple-buttons" style="padding: 0px;">
        <button use:exioButton on:click={editArchiveEntry(item)}>
          <span use:exioIcon>edit</span>
        </button>
        <button use:exioButton class="blue-bg">
          <span use:exioIcon>download</span>
        </button>
        <button use:exioButton class="red-bg">
          <span use:exioIcon>delete_forever</span>
        </button>
      </div>
    </div>
  {/each}
</div>

<style>
  button {
    font-size: 1rem;
  }
  .item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    gap: 10px;
  }
  @media (max-width: 750px) {
    .triple-buttons {
      flex-direction: column;
    }
  }
</style>
