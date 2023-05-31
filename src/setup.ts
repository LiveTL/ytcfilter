import YtcFilterSetup from './components/YtcFilterSetup.svelte';
import './ts/resize-tracker';

const options = new YtcFilterSetup({
  target: document.body
});

export default options;
