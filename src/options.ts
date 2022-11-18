import Settings from './components/YtcFilterSettings.svelte';
import './ts/resize-tracker';

const options = new Settings({
  target: document.body
});

export default options;
