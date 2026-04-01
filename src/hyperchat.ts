import { detectForceReload } from './ts/ytcf-logic';
import Hyperchat from './components/Hyperchat.svelte';
import 'smelte/src/tailwind.css';
import { stripYoutubePlayerStyles } from './ts/chat-utils';

stripYoutubePlayerStyles();

(window as any).useYtTheme = true;

const hyperchat = new Hyperchat({
  target: document.body
});

detectForceReload();

export default hyperchat;
