interface CustomEvent extends Event {
  detail?: any;
}

interface SimpleUserInfo {
  name: string;
  channelId: string;
}

interface SimpleVideoInfo {
  title: string;
  videoId: string;
}

interface SimpleInfo {
  channel: SimpleUserInfo;
  video: SimpleVideoInfo;
}
