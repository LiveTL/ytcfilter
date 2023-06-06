<script lang="ts">
  import { deleteSavedMessageActions, downloadAsJson, downloadAsTxt, getAllMessageDumpInfoItems, saveMessageDumpInfo } from '../../ts/ytcf-logic';
  import { exioButton, exioIcon } from 'exio/svelte';
  import { inputDialog, confirmDialog, exportMode, port, videoInfo } from '../../ts/storage';
  import { UNNAMED_ARCHIVE, UNDONE_MSG, getBrowser, Browser } from '../../ts/chat-constants';
  import '../../stylesheets/line.css';
  import ExportSelector from './YtcFilterDownloadSelect.svelte';
  // import { exioIcon } from 'exio/svelte';
  export let isArchiveLoadSelection = false;
  let data: YtcF.MessageDumpInfoItem[] = [];
  let loading = false;
  const updateData = async () => {
    loading = true;
    data = await getAllMessageDumpInfoItems();
    loading = false;
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
                nickname: data[0] || '',
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
          originalValue: item.nickname || '',
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
          callback: async () => {
            if ($exportMode === 'json') {
              downloadAsJson(item);
            } else if ($exportMode === 'txt') {
              downloadAsTxt(item);
            }
          },
          text: 'Export',
          cancelled: () => {
            $inputDialog = null;
          }
        },
        title: `Export Archive "${item.nickname || UNNAMED_ARCHIVE}"`,
        component: ExportSelector,
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
  const loadArchiveEntry = (entry: YtcF.MessageDumpInfoItem) => async () => {
    const params = new URLSearchParams(window.location.search);
    const paramsTabId = params.get('tabid');
    const paramsFrameId = params.get('frameid');
    if (paramsTabId != null && paramsFrameId != null && paramsTabId.length >= 1 && paramsFrameId.length >= 1) {
      if (getBrowser() === Browser.FIREFOX) {
        const frameInfo = {
          tabId: parseInt(paramsTabId),
          frameId: parseInt(paramsFrameId)
        };

        $port = chrome.runtime.connect({ name: JSON.stringify(frameInfo) });
      } else {
        $port = chrome.tabs.connect(parseInt(paramsTabId), { frameId: parseInt(paramsFrameId) });
      }
      $port?.postMessage({
        type: 'loadArchiveRequest',
        key: entry.key
      });
      window.close();
    }
  };
</script>

<div style="padding-bottom: 1px; padding: 2px 10px 10px 10px;">
  {#if loading}
    <div style="text-align: center; margin: 10px 0px 5px 0px;">Loading...</div>
  {:else if data.length === 0}
    <div style="text-align: center; margin: 10px 0px 5px 0px;">No Archives Found</div>
  {/if}
  {#if !loading && data.length > 0}
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th>Video ID</th>
          <th>Name/Title</th>
          <th>Size</th>
          <th>Last Edited</th>
          <th></th>
        </tr>
      </thead>
      <tr>
        <td colspan="5" style="padding: 0px !important;">
          <div class="line" />
        </td>
      </tr>
      {#each data as item, i (item.key)}
        <tr class="hover-highlight" style="padding: 0x 5px;">
          <td>{item.info?.video.videoId}</td>
          <td style="max-width: 50vw;">
            {item.nickname || (
              item.info?.video.title ? `${item.info?.video.title}${item.info?.channel.name ? ` (${item.info?.channel.name})` : ''}` : ''
            ) || UNNAMED_ARCHIVE}
          </td>
          <td style="font-style: italic;">{item.size ?? 0}</td>
          <td style="font-style: italic;">{new Date(item.lastEdited).toLocaleString()}</td>
          <td style="font-style: italic; text-align: center;">
            <span style="white-space: nowrap;">
              <span class="material-icons link-button" on:click={editArchiveEntry(item)}>edit</span>
              <span class="material-icons link-button">visibility</span>
            </span>
            <span style="white-space: nowrap;">
              <span class="material-icons link-button" on:click={downloadArchiveEntry(item)}>download</span>
              <span class="material-icons link-button red" on:click={deleteArchiveEntry(item)}>delete</span>
            </span>
          </td>
        </tr>
        {#if i !== data.length - 1}
          <tr>
            <td colspan="5" style="padding: 0px !important;">
              <div class="line" />
            </td>
          </tr>
        {/if}
      {/each}
      <!-- <div class="item triple-buttons" style="padding: 0px;">
        {#if isArchiveLoadSelection}
        <button use:exioButton on:click={loadArchiveEntry(item)} style="white-space: nowrap;">
          Load
          <span use:exioIcon style="vertical-align: -1px;">open_in_browser</span>
        </button>
        {:else}
        <button use:exioButton on:click={editArchiveEntry(item)}>
          <span use:exioIcon style="vertical-align: -1px;">edit</span>
        </button>
        <button use:exioButton class="blue-bg" on:click={downloadArchiveEntry(item)}>
          <span use:exioIcon style="vertical-align: -2px;">download</span>
        </button>
        <button use:exioButton class="red-bg" on:click={deleteArchiveEntry(item)}>
          <span use:exioIcon style="vertical-align: -1px;">delete_forever</span>
        </button>
        {/if}
    </div>
      </div> -->
    </table>
  {/if}
</div>

<style>
  .link-button {
    cursor: default;
    visibility: hidden;
  }
  .hover-highlight:hover .link-button {
    visibility: visible;
  }
  .link-button:hover {
    color: #0064d1 !important;
  }
  :global([data-theme=dark]) .link-button:hover {
    color: #3ba7ff !important;
  }
  .link-button.red:hover {
    color: #ff5656 !important;
  }
  :global([data-theme=dark]) .link-button.red:hover {
    color: #c80000 !important;
  }
  .hover-highlight:hover {
    background-color: #80808040;
  }
  td, th {
    padding: 5px 5px;
  }
  td {
    user-select: text !important;
  }
  th {
    text-align: left;
  }
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
  @media (max-width: 850px) {
    .triple-buttons {
      flex-direction: column;
    }
  }
</style>
