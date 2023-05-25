import { stringifyRuns } from '../ts/ytcf-utils';
import { fixLeaks } from '../ts/ytc-fix-memleaks';
import { parseMessageRuns } from '../ts/chat-parser';

for (const eventName of ['visibilitychange', 'webkitvisibilitychange', 'blur']) {
  window.addEventListener(eventName, event => {
    event.stopImmediatePropagation();
  }, true);
}
const fetchFallback = window.fetch;
(window as any).fetchFallback = fetchFallback;
window.fetch = async (...args) => {
  const request = args[0] as Request;
  const url = request.url;
  const result = await fetchFallback(...args);

  const currentDomain = (location.protocol + '//' + location.host);
  const ytApi = (end: string): string => `${currentDomain}/youtubei/v1/live_chat${end}`;
  const isReceiving = url.startsWith(ytApi('/get_live_chat'));
  const isSending = url.startsWith(ytApi('/send_message'));
  const action = isReceiving ? 'messageReceive' : 'messageSent';
  if (isReceiving || isSending) {
    const response = JSON.stringify(await (result.clone()).json());
    window.dispatchEvent(new CustomEvent(action, { detail: response }));
  }
  return result;
};
// window.dispatchEvent(new CustomEvent('chatLoaded', {
//   detail: JSON.stringify(window.ytcfg)
// }));
// eslint-disable-next-line @typescript-eslint/no-misused-promises
window.addEventListener('proxyFetchRequest', async (event) => {
  const args = JSON.parse((event as any).detail as string) as [string, any];
  const request = await fetchFallback(...args);
  const response = await request.json();
  window.dispatchEvent(new CustomEvent('proxyFetchResponse', {
    detail: JSON.stringify(response)
  }));
});

try {
  const video = (window as any)
    .parent.yt.config_.SBOX_SETTINGS.SEARCHBOX_COMPONENT.__dataHost.parentComponent
    .__data.data.response.contents.twoColumnWatchNextResults.results.results.contents[0]
    .videoPrimaryInfoRenderer;
  const channel = (window as any).parent.yt.config_.SBOX_SETTINGS.SEARCHBOX_COMPONENT.__dataHost
    .parentComponent.__data.data.response.contents.twoColumnWatchNextResults.results.results
    .contents[1].videoSecondaryInfoRenderer.owner.videoOwnerRenderer;
  window.dispatchEvent(new CustomEvent('videoInfo', {
    detail: JSON.stringify({
      video: {
        title: stringifyRuns(parseMessageRuns(video.title.runs)),
        videoId: video.updatedMetadataEndpoint.updatedMetadataEndpoint.videoId
      },
      channel: {
        channelId: channel.navigationEndpoint.browseEndpoint.browseId,
        handle: channel.navigationEndpoint.browseEndpoint.canonicalBaseUrl,
        name: stringifyRuns(parseMessageRuns(channel.title.runs))
      }
    })
  }));
} catch (e) {
  const videoId = new URLSearchParams(window.location.search).get('v');
  window.dispatchEvent(new CustomEvent('videoInfo', {
    detail: JSON.stringify(
      videoId !== null
        ? {
            video: {
              videoId
            }
          }
        : null)
  }));
}

fixLeaks();
