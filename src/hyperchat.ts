import { detectForceReload } from './ts/ytcf-logic';
import Hyperchat from './components/Hyperchat.svelte';
import 'smelte/src/tailwind.css';

(window as any).useYtTheme = true;

const hyperchat = new Hyperchat({
  target: document.body
});

detectForceReload();

export default hyperchat;
