import Hyperchat from './components/Hyperchat.svelte';
import 'smelte/src/tailwind.css';

(window as any).useYtTheme = true;

const hyperchat = new Hyperchat({
  target: document.body
});

export default hyperchat;
