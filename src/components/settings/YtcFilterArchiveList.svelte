<script lang="ts">
  import { deleteSavedMessageActions, downloadAsJson, getAllMessageDumps, saveMessageDumpInfo } from '../../ts/ytcf-logic';
  import { exioButton, exioIcon } from 'exio/svelte';
  import { inputDialog, confirmDialog } from '../../ts/storage';
  import { UNNAMED_ARCHIVE, UNDONE_MSG } from '../../ts/chat-constants';
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
            await saveMessageDumpInfo(
              item.key,
              {
                nickname: data[0] || UNNAMED_ARCHIVE,
                continuation: item.continuation,
                info: {
                  video: {
                    title: data[1],
                    videoId: data[2]
                  },
                  channel: {
                    name: data[3],
                    handle: data[4],
                    channelId: data[5]
                  }
                },
                key: item.key,
                lastEdited: new Date().getTime(),
                presetId: item.presetId
              }
            );
            updateData();
          },
          cancelled: () => {
            $inputDialog = null;
          }
        },
        prompts: [{
          originalValue: item.nickname || UNNAMED_ARCHIVE,
          label: 'Archive Name'
        }, {
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
  const downloadArchiveEntry = (item: YtcF.MessageDumpInfoItem) => {
    return () => {
      $inputDialog = {
        action: {
          callback: async (data: string[]) => {
            downloadAsJson(item);
          },
          text: 'Export',
          cancelled: () => {
            $inputDialog = null;
          }
        },
        title: `Export Archive "${item.nickname || UNNAMED_ARCHIVE}"`,
        message: 'Please select a file format to download.',
        component: null,
        prompts: []
      };
    };
  };
  const deleteArchiveEntry = (item: YtcF.MessageDumpInfoItem) => {
    return () => {
      $confirmDialog = {
        title: `Delete Archive "${item.nickname || UNNAMED_ARCHIVE}"?`,
        message: UNDONE_MSG,
        action: {
          callback: async () => {
            await deleteSavedMessageActions(item.key);
            updateData();
          },
          text: 'Delete'
        }
      };
    };
  };
</script>

<div style="padding-bottom: 1px; padding: 2px 10px 10px 10px;">
  {#if !data.length}
    <div style="text-align: center; margin: 10px 0px 5px 0px;">No Archives Found</div>
  {/if}
  {#each data as item, i}
    <div class="item settings-card">
      <div>
        <div style="font-weight: bold;">
          {item.nickname || 'Unnamed Archive'}
        </div>
        <div>{item.info?.video.title || 'Unknown Title'}</div>
        <div>{item.info?.channel.name || 'Unknown Channel'}</div>
        <div style="font-style: italic;">Stored Messages: {item.size ?? 0}</div>
        <div style="font-style: italic;">Last Updated: {new Date(item.lastEdited).toLocaleString()}</div>
      </div>
      <div class="item triple-buttons" style="padding: 0px;">
        <button use:exioButton on:click={editArchiveEntry(item)}>
          <span use:exioIcon style="vertical-align: -1px;">edit</span>
        </button>
        <button use:exioButton class="blue-bg" on:click={downloadArchiveEntry(item)}>
          <span use:exioIcon style="vertical-align: -2px;">download</span>
        </button>
        <button use:exioButton class="red-bg" on:click={deleteArchiveEntry(item)}>
          <span use:exioIcon style="vertical-align: -1px;">delete_forever</span>
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
